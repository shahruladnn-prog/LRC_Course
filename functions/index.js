const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const BIZAPP_API_KEY = "83ndoryq-aaaw-v5lj-3tiy-2t4cuygj9rvn";
const BIZAPP_CATEGORY = "w4zw0teb"; 
const LOYVERSE_TOKEN = "d9d14fd02ac34292ab50e221da50ddb3";
const LOYVERSE_STORE_ID = "7611fff5-5af4-43e4-8758-3f06a1090eed";
const LOYVERSE_PAYMENT_ID = "df4f339c-c806-4cf0-83c9-43ef624a78ac";

const loyverseApi = axios.create({
  baseURL: "https://api.loyverse.com/v1.0",
  headers: { "Authorization": `Bearer ${LOYVERSE_TOKEN}` },
});

// SHARED AGGRESSIVE SEARCH & UPDATE
async function processSuccessfulPayment(billId, amount, email) {
  if (!billId) return "No ID provided";
  const cleanId = String(billId).trim();
  console.log(`--- FAIL-PROOF SEARCH: ${cleanId} ---`);

  const snapshot = await db.collection("bookings").get();
  
  // 1. Match by Doc ID OR the internal billcode field
  let match = snapshot.docs.find(d => 
    d.id.toLowerCase() === cleanId.toLowerCase() || 
    (d.data().billcode && String(d.data().billcode).toLowerCase() === cleanId.toLowerCase())
  );

  // 2. Backup: Match by Email + Amount (Zero-Failure fallback)
  if (!match && email && amount) {
    match = snapshot.docs.find(d => {
      const data = d.data();
      return data.customerEmail === email && 
             Math.abs(data.totalAmount - parseFloat(amount)) < 0.05 &&
             data.paymentStatus === 'pending';
    });
  }

  if (!match) return `Error: No booking found for ${cleanId}`;

  const bookingRef = match.ref;
  const bookingData = match.data();
  if (bookingData.paymentStatus === 'paid') return "Already paid";

  // UPDATE FIRESTORE AND SLOTS
  const sessionSnapshots = [];
  for (const item of bookingData.items) {
    const sDoc = await db.collection("sessions").doc(item.sessionId).get();
    if (sDoc.exists) sessionSnapshots.push({ id: item.sessionId, current: sDoc.data().remainingSlots || 0, qty: item.quantity });
  }

  await db.runTransaction(async (t) => {
    t.update(bookingRef, { paymentStatus: 'paid', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    for (const s of sessionSnapshots) {
      t.update(db.collection("sessions").doc(s.id), { remainingSlots: Math.max(0, s.current - s.qty) });
    }
  });

  // LOYVERSE SYNC (Isolated)
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
  } catch (err) { console.error("Loyverse failed but DB is updated:", err.message); }

  return "Success";
}

// 1. BILL CREATION (Updated to save BillCode)
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
    // LINK BILLCODE TO DOCUMENT
    await db.collection("bookings").doc(bookingId).update({ billcode: bCode });
  }

  return { url: response.data?.url || response.data?.data?.url };
});

// 2. WEBHOOK (Universal Multipart Parser)
exports.bizappayWebhook = onRequest(async (req, res) => {
  let data = { ...req.query, ...req.body };
  
  // RAW PARSING: Fixes the Cloud Functions Multipart Bug
  if (req.rawBody) {
    const raw = req.rawBody.toString();
    const matches = { 
        bc: raw.match(/name="billcode"\r\n\r\n(.*?)\r\n/),
        st: raw.match(/name="billstatus"\r\n\r\n(.*?)\r\n/),
        am: raw.match(/name="billamount"\r\n\r\n(.*?)\r\n/)
    };
    if (matches.bc) data.billcode = matches.bc[1].trim();
    if (matches.st) data.billstatus = matches.st[1].trim();
    if (matches.am) data.billamount = matches.am[1].trim();
  }

  if (String(data.billstatus) === '1' || String(data.billstatus).toLowerCase() === 'paid') {
    await processSuccessfulPayment(data.billcode, data.billamount);
  }
  res.status(200).send("OK");
});

// 3. MANUAL SYNC
exports.manualAdminUpdate = onRequest({ cors: true }, async (req, res) => {
  const { bookingId } = req.query;
  const result = await processSuccessfulPayment(bookingId);
  res.status(200).send(result);
});