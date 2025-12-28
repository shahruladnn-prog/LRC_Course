const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// --- CREDENTIALS ---
const BIZAPP_API_KEY = "83ndoryq-aaaw-v5lj-3tiy-2t4cuygj9rvn";
const BIZAPP_CATEGORY = "w4zw0teb"; 
const LOYVERSE_TOKEN = "d9d14fd02ac34292ab50e221da50ddb3";
const LOYVERSE_STORE_ID = "7611fff5-5af4-43e4-8758-3f06a1090eed";
const LOYVERSE_PAYMENT_ID = "df4f339c-c806-4cf0-83c9-43ef624a78ac";

const loyverseApi = axios.create({
  baseURL: "https://api.loyverse.com/v1.0",
  headers: { "Authorization": `Bearer ${LOYVERSE_TOKEN}` },
});

// SHARED PROCESSING LOGIC
async function processSuccessfulPayment(billcode, amount) {
  // TRIM FIX: Critical for matching IDs correctly
  const cleanId = String(billcode).trim();
  console.log(`--- WEBHOOK SEARCH: ID=${cleanId}, AMT=${amount} ---`);
  
  // 1. Get all pending bookings
  const snapshot = await db.collection("bookings").where("paymentStatus", "==", "pending").get();
  
  // 2. SEARCH 1: Match by ID or Saved Field
  let match = snapshot.docs.find(d => 
    d.id.toLowerCase() === cleanId.toLowerCase() || 
    (d.data().billcode && String(d.data().billcode).trim().toLowerCase() === cleanId.toLowerCase())
  );

  // 3. SEARCH 2 (The Backup): Match by Amount
  if (!match && amount) {
    console.log(`ID Match failed. Hunting for ANY booking with amount: RM${amount}`);
    match = snapshot.docs.find(d => Math.abs(parseFloat(d.data().totalAmount) - parseFloat(amount)) < 0.01);
  }

  if (!match) {
    console.error("FATAL: No pending booking found matching this payment.");
    return;
  }

  const bookingRef = match.ref;
  const bookingData = match.data();

  // 4. Update Database & Slots
  const sessionSnapshots = [];
  try {
    if (bookingData.items) {
      for (const item of bookingData.items) {
        if (item.sessionId) {
            const sDoc = await db.collection("sessions").doc(item.sessionId).get();
            if (sDoc.exists) sessionSnapshots.push({ id: item.sessionId, current: sDoc.data().remainingSlots || 0, qty: item.quantity });
        }
      }
    }
  } catch (e) { console.error("Error reading sessions:", e); }

  await db.runTransaction(async (t) => {
    t.update(bookingRef, { paymentStatus: 'paid', billcode: cleanId });
    for (const s of sessionSnapshots) {
      t.update(db.collection("sessions").doc(s.id), { remainingSlots: Math.max(0, s.current - s.qty) });
    }
  });
  console.log(`SUCCESS: Booking ${bookingRef.id} marked as PAID.`);

  // 5. Loyverse (Isolated with FULL ERROR LOGGING)
  try {
    const lineItems = [];
    if (bookingData.items) {
      for (const item of bookingData.items) {
        const courseDoc = await db.collection("courses").doc(item.courseId).get();
        const sku = courseDoc.data()?.sku;
        if (sku) {
          const vRes = await loyverseApi.get(`/variants?sku=${sku}`);
          if (vRes.data.variants?.length > 0) {
            lineItems.push({ variant_id: vRes.data.variants[0].id, quantity: item.quantity, price: item.price });
          } else {
             console.warn(`Loyverse SKU not found for: ${sku}`);
          }
        } else {
            console.warn(`Course ${item.courseId} in Firebase has no SKU field.`);
        }
      }
    }
    
    if (lineItems.length > 0) {
      await loyverseApi.post("/receipts", {
        store_id: LOYVERSE_STORE_ID,
        line_items: lineItems,
        payments: [{ payment_type_id: LOYVERSE_PAYMENT_ID, amount: bookingData.totalAmount }]
      });
      console.log("Loyverse Receipt Created.");
    }
  } catch (err) { 
      // ERROR LOGGING FIX
      console.error("Loyverse Error Details:", err.response?.data || err.message); 
  }
}

// 1. BILL CREATION
exports.createBizappayBill = onCall({ cors: true }, async (request) => {
  const { bookingId, amount, customerName, customerEmail, customerPhone } = request.data;
  
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

  const response = await axios.post('https://bizappay.my/api/v3/bill/create', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authentication': authToken }
  });

  const bCode = response.data?.data?.billcode || response.data?.billcode;
  
  if (bCode) {
    const bookingRef = db.collection("bookings").doc(bookingId);
    await bookingRef.set({ billcode: bCode }, { merge: true });
  }

  return { url: response.data?.url || response.data?.data?.url };
});

// 2. WEBHOOK
exports.bizappayWebhook = onRequest(async (req, res) => {
  let bCode = req.query.billcode || req.body.billcode;
  let bStatus = req.query.billstatus || req.body.billstatus;
  let bAmount = req.query.billamount || req.body.billamount;

  if (req.rawBody) {
    const raw = req.rawBody.toString();
    const bc = raw.match(/name="billcode"\r\n\r\n(.*?)\r\n/);
    const st = raw.match(/name="billstatus"\r\n\r\n(.*?)\r\n/);
    const am = raw.match(/name="billamount"\r\n\r\n(.*?)\r\n/);
    if (bc) bCode = bc[1].trim();
    if (st) bStatus = st[1].trim();
    if (am) bAmount = am[1].trim();
  }

  if (String(bStatus) === '1' || String(bStatus).toLowerCase() === 'paid') {
    await processSuccessfulPayment(bCode, bAmount);
  }
  res.status(200).send("OK");
});

// 3. MANUAL ADMIN SYNC
exports.manualAdminUpdate = onRequest({ cors: true }, async (req, res) => {
  const { bookingId, amount } = req.query;
  await processSuccessfulPayment(bookingId, amount);
  res.status(200).send("Sync Complete");
});