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

// SHARED RECOVERY LOGIC
async function processSuccessfulPayment(billcode, amount) {
  console.log(`--- PROCESSING ATTEMPT: ID=${billcode}, AMT=${amount} ---`);
  
  // 1. Get ALL pending bookings
  const snapshot = await db.collection("bookings")
    .where("paymentStatus", "==", "pending")
    .get();
  
  // 2. SEARCH 1: Match by saved Billcode field
  let match = snapshot.docs.find(d => 
    (d.data().billcode && String(d.data().billcode).toLowerCase() === String(billcode).toLowerCase()) ||
    d.id.toLowerCase() === String(billcode).toLowerCase()
  );

  // 3. SEARCH 2 (The Nuke): If ID fails, match by the exact money amount
  if (!match && amount) {
    console.log(`ID Match failed. Searching by Amount backup: ${amount}`);
    match = snapshot.docs.find(d => Math.abs(parseFloat(d.data().totalAmount) - parseFloat(amount)) < 0.01);
  }

  if (!match) {
    console.error("FATAL: No pending booking found for this signal.");
    return "Not Found";
  }

  const bookingRef = match.ref;
  const bookingData = match.data();

  // 4. Update Firestore and Slots immediately
  const sessionSnapshots = [];
  for (const item of bookingData.items) {
    const sDoc = await db.collection("sessions").doc(item.sessionId).get();
    if (sDoc.exists) sessionSnapshots.push({ id: item.sessionId, current: sDoc.data().remainingSlots || 0, qty: item.quantity });
  }

  await db.runTransaction(async (t) => {
    t.update(bookingRef, { paymentStatus: 'paid', billcode: billcode }); 
    for (const s of sessionSnapshots) {
      t.update(db.collection("sessions").doc(s.id), { remainingSlots: Math.max(0, s.current - s.qty) });
    }
  });
  console.log("SUCCESS: Database updated.");

  // 5. Loyverse (Isolated)
  try {
    const lineItems = [];
    for (const item of bookingData.items) {
      const courseDoc = await db.collection("courses").doc(item.courseId).get();
      const sku = courseDoc.data()?.sku;
      if (sku) {
        const vRes = await loyverseApi.get(`/variants?sku=${sku}`);
        if (vRes.data.variants?.length > 0) {
          lineItems.push({ variant_id: vRes.data.variants[0].id, quantity: item.quantity, price: item.price });
        }
      }
    }
    if (lineItems.length > 0) {
      await loyverseApi.post("/receipts", {
        store_id: LOYVERSE_STORE_ID,
        line_items: lineItems,
        payments: [{ payment_type_id: LOYVERSE_PAYMENT_ID, amount: bookingData.totalAmount }]
      });
    }
  } catch (err) { console.error("Loyverse Fail (Ignored):", err.message); }

  return "Success";
}

// 1. BILL CREATION (Saves Billcode to document)
exports.createBizappayBill = onCall({ cors: true }, async (request) => {
  const { bookingId, amount, customerName, customerEmail, customerPhone } = request.data;
  
  // Get Auth Token
  const loginData = new URLSearchParams();
  loginData.append('apiKey', BIZAPP_API_KEY);
  const tokenRes = await axios.post('https://bizappay.my/api/v3/token', loginData);
  const authToken = tokenRes.data?.token || tokenRes.data?.data?.token;

  // Build Bizappay Form
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
  
  // CRITICAL FIX: Automatically save the field to the document
  if (bCode) {
    await db.collection("bookings").doc(bookingId).update({ billcode: bCode });
  }

  return { url: response.data?.url || response.data?.data?.url };
});

// 2. WEBHOOK (With Multipart Raw Parsing)
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

// 3. MANUAL SYNC
exports.manualAdminUpdate = onRequest({ cors: true }, async (req, res) => {
  const { bookingId, amount } = req.query;
  const result = await processSuccessfulPayment(bookingId, amount);
  res.status(200).send(result);
});