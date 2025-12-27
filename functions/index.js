const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// --- CREDENTIALS (Preserved from your Repomix) ---
const BIZAPP_API_KEY = "83ndoryq-aaaw-v5lj-3tiy-2t4cuygj9rvn";
const BIZAPP_CATEGORY = "w4zw0teb"; 
const LOYVERSE_TOKEN = "d9d14fd02ac34292ab50e221da50ddb3";
const LOYVERSE_STORE_ID = "7611fff5-5af4-43e4-8758-3f06a1090eed";
const LOYVERSE_PAYMENT_ID = "df4f339c-c806-4cf0-83c9-43ef624a78ac";

const loyverseApi = axios.create({
  baseURL: "https://api.loyverse.com/v1.0",
  headers: { "Authorization": `Bearer ${LOYVERSE_TOKEN}` },
});

// SHARED LOGIC: Deducts slots and syncs to Loyverse
async function processSuccessfulPayment(bookingId) {
  console.log(`--- Starting Process for ID: ${bookingId} ---`);
  
  // 1. Find the booking (Now with Case-Insensitive Fallback)
  let bookingRef = db.collection("bookings").doc(bookingId);
  let bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) {
    console.log("Direct ID match failed. Searching all bookings for case-insensitive match...");
    const allBookings = await db.collection("bookings").get();
    const match = allBookings.docs.find(d => d.id.toLowerCase() === bookingId.toLowerCase());
    
    if (match) {
      bookingDoc = match;
      bookingRef = match.ref;
      console.log(`Match found! Real ID is: ${match.id}`);
    } else {
      console.error(`CRITICAL: Booking ${bookingId} not found in database.`);
      return `Error: ID ${bookingId} not found.`;
    }
  }

  const bookingData = bookingDoc.data();
  if (bookingData.paymentStatus === 'paid') {
    console.log("Booking is already marked as paid. Skipping.");
    return `ID ${bookingId} is already paid.`;
  }

  // 2. Database Update Phase (Inventory & Status)
  const sessionSnapshots = [];
  for (const item of bookingData.items) {
    const sDoc = await db.collection("sessions").doc(item.sessionId).get();
    if (sDoc.exists) {
      sessionSnapshots.push({ 
        id: item.sessionId, 
        currentSlots: sDoc.data().remainingSlots || 0, 
        qty: item.quantity 
      });
    }
  }

  try {
    await db.runTransaction(async (t) => {
      t.update(bookingRef, { paymentStatus: 'paid' });
      for (const s of sessionSnapshots) {
        t.update(db.collection("sessions").doc(s.id), { 
          remainingSlots: Math.max(0, s.currentSlots - s.qty) 
        });
      }
    });
    console.log("Firestore updated successfully: Status set to paid and slots deducted.");
  } catch (dbError) {
    console.error("Database Transaction Failed:", dbError.message);
    throw new Error("Database update failed.");
  }

  // 3. Loyverse Phase (Wrapped in Try-Catch so it doesn't break the whole app)
  try {
    console.log("Attempting Loyverse Sync...");
    const lineItems = [];
    for (const item of bookingData.items) {
      const courseDoc = await db.collection("courses").doc(item.courseId).get();
      const sku = courseDoc.data()?.sku;
      if (sku) {
        const vRes = await loyverseApi.get(`/variants?sku=${sku}`);
        if (vRes.data.variants?.length > 0) {
          lineItems.push({ 
            variant_id: vRes.data.variants[0].id, 
            quantity: item.quantity, 
            price: item.price 
          });
        } else {
          console.warn(`SKU ${sku} not found in Loyverse variants.`);
        }
      }
    }

    if (lineItems.length > 0) {
      await loyverseApi.post("/receipts", {
        store_id: LOYVERSE_STORE_ID,
        line_items: lineItems,
        payments: [{ payment_type_id: LOYVERSE_PAYMENT_ID, amount: bookingData.totalAmount }]
      });
      console.log("Loyverse receipt created successfully.");
    } else {
      console.log("No valid SKUs found to sync with Loyverse.");
    }
  } catch (loyverseError) {
    // We log the error but don't 'throw' it, so the function returns "Success" to the user
    console.error("Loyverse Sync Failed (But Firestore is updated):", loyverseError.response?.data || loyverseError.message);
  }

  return `Successfully updated Booking ${bookingId}`;
}

// 1. Create Bizappay Bill (Preserved)
exports.createBizappayBill = onCall({ cors: true }, async (request) => {
  const { bookingId, amount, customerName, customerEmail, customerPhone } = request.data;
  try {
    const loginData = new URLSearchParams();
    loginData.append('apiKey', BIZAPP_API_KEY);
    const tokenRes = await axios.post('https://bizappay.my/api/v3/token', loginData);
    const authToken = tokenRes.data?.token || tokenRes.data?.data?.token;

    const formData = new URLSearchParams();
    formData.append('apiKey', BIZAPP_API_KEY);
    formData.append('category', BIZAPP_CATEGORY);
    formData.append('name', 'LRC Course Booking');
    formData.append('amount', parseFloat(amount).toFixed(2));
    formData.append('payer_name', customerName);
    formData.append('payer_email', customerEmail);
    formData.append('payer_phone', customerPhone);
    formData.append('webreturn_url', `https://lrc-course.vercel.app/#/confirmation?bookingId=${bookingId}`);
    formData.append('callback_url', `https://bizappaywebhook-2n7sc53hoa-uc.a.run.app`);
    formData.append('ext_reference', bookingId);
    formData.append('billcode', bookingId); 

    const response = await axios.post('https://bizappay.my/api/v3/bill/create', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authentication': authToken }
    });
    return { url: response.data?.url || response.data?.data?.url };
  } catch (err) {
    throw new Error("Bill creation failed: " + err.message);
  }
});

// 2. Automatic Webhook (Improved Parsing)
exports.bizappayWebhook = onRequest(async (req, res) => {
  let data = { ...req.query, ...req.body };
  
  if (Buffer.isBuffer(req.body)) {
    const rawText = req.body.toString('utf-8');
    const matches = rawText.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]+?)\r\n/g);
    for (const match of matches) { data[match[1]] = match[2].trim(); }
  }

  const bookingId = (data.billcode || data.ext_reference || "").trim().replace(/[.]/g, '');
  const status = String(data.billstatus || data.status || "").replace(/[^0-9a-zA-Z]/g, '');

  console.log(`WEBHOOK RECEIVED: ID=${bookingId}, Status=${status}`);

  if (status === '1' || status.toLowerCase() === 'paid') {
    await processSuccessfulPayment(bookingId);
  }
  res.status(200).send("OK");
});

// 3. Manual Sync (CORS enabled for Frontend Button)
exports.manualAdminUpdate = onRequest({ cors: true }, async (req, res) => {
  const { bookingId } = req.query;
  if (!bookingId) return res.status(400).send("Missing bookingId");

  try {
    const result = await processSuccessfulPayment(bookingId);
    res.status(200).send(result);
  } catch (err) { 
    console.error("Manual Sync Error:", err.message);
    res.status(500).send("Sync Error: " + err.message); 
  }
});