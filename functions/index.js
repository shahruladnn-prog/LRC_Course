const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
// Force Deploy Timestamp: 2025-12-29
const { HttpsError } = require("firebase-functions/v2/https");

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

// HELPER: Find or Create Customer in Loyverse
async function findOrCreateLoyverseCustomer(name, email, phone) {
  try {
    // 1. Search by Email first (Most reliable unique identifier)
    if (email) {
      const searchRes = await loyverseApi.get(`/customers?email=${email}`);
      if (searchRes.data.customers && searchRes.data.customers.length > 0) {
        console.log(`Loyverse: Found existing customer by email: ${email}`);
        return searchRes.data.customers[0].id; // Return existing ID
      }
    }

    // 2. If not found, create new customer
    console.log(`Loyverse: Creating new customer: ${name}`);
    const createRes = await loyverseApi.post("/customers", {
      name: name || "Guest Customer",
      email: email || "",
      phone_number: phone || "",
      note: "Created via Online Booking"
    });

    return createRes.data.id;

  } catch (e) {
    console.warn("Loyverse Customer Sync Failed:", e.message);
    return null; // Fail gracefully, receipt will just be unassigned
  }
}

// SEPARATE FUNCTION FOR LOYVERSE SYNC (Reusable)
async function syncBookingToLoyverse(bookingData, bookingRef) {
  try {
    // 0. Idempotency Check (Prevent duplicate receipts)
    if (bookingData.syncStatus === 'synced') {
      console.log(`Booking ${bookingRef.id} already synced. Skipping.`);
      return { success: true, message: "Already synced" };
    }

    // 1. Resolve Customer
    const customerId = await findOrCreateLoyverseCustomer(
      bookingData.customerFullName,
      bookingData.customerEmail,
      bookingData.customerPhone
    );

    const lineItems = [];
    if (bookingData.items) {
      for (const item of bookingData.items) {
        const courseDoc = await db.collection("courses").doc(item.courseId).get();
        const sku = courseDoc.data()?.sku;
        if (sku) {
          try {
            const vRes = await loyverseApi.get(`/variants?sku=${sku}`);
            // ERROR FIX: Strictly check if we have a valid ID (Loyverse uses 'variant_id')
            const variantId = vRes.data.variants?.[0]?.variant_id;

            if (variantId) {
              lineItems.push({ variant_id: variantId, quantity: item.quantity, price: item.price });
            } else {
              console.warn(`Loyverse SKU found but no variant ID: ${sku}`);
            }
          } catch (skuErr) {
            console.warn(`Failed to fetch variant for SKU ${sku}:`, skuErr.message);
          }
        } else {
          console.warn(`Course ${item.courseId} in Firebase has no SKU field.`);
        }
      }
    }

    if (lineItems.length > 0) {
      // 2. Create Receipt with Customer and BillCode
      await loyverseApi.post("/receipts", {
        store_id: LOYVERSE_STORE_ID,
        line_items: lineItems,
        payments: [{ payment_type_id: LOYVERSE_PAYMENT_ID, amount: bookingData.totalAmount }],
        customer_id: customerId, // Link to customer
        receipt_number: bookingData.billcode || bookingRef.id, // Use BillCode as Receipt #
        note: `Online Booking: ${bookingData.billcode}` // Extra visibility
      });
      console.log("Loyverse Receipt Created Successfully.");
      // Explicitly re-reference to ensure we have a valid DocRef
      const finalRef = db.collection('bookings').doc(bookingData.id || bookingRef.id);
      await finalRef.update({ syncStatus: 'synced', syncError: admin.firestore.FieldValue.delete() });
      console.log(`DB UPDATED: Booking ${finalRef.id} syncStatus set to 'synced'`);
      return { success: true };
    } else {
      console.warn("Skipping Loyverse Sync: No valid line items resolved.");
      return { success: false, error: "No valid items" };
    }
  } catch (err) {
    const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error("Loyverse Sync Failed:", errorMsg);
    const failRef = db.collection('bookings').doc(bookingData.id || bookingRef.id);
    await failRef.update({ syncStatus: 'failed', syncError: errorMsg });
    return { success: false, error: errorMsg };
  }
}

// SHARED PROCESSING LOGIC
async function processSuccessfulPayment(billcode, amount, bookingIdFromWebhook) {
  const cleanBillCode = String(billcode).trim();
  console.log(`--- PAYMENT PROCESSING: BillCode=${cleanBillCode}, Amount=${amount}, RefID=${bookingIdFromWebhook} ---`);

  let bookingRef = null;
  let bookingData = null;

  // STRATEGY 1: Direct ID Lookup (If we have the external reference)
  if (bookingIdFromWebhook) {
    const docSnap = await db.collection("bookings").doc(bookingIdFromWebhook).get();
    if (docSnap.exists) {
      console.log(`MATCH: Found booking via Ref ID: ${bookingIdFromWebhook}`);
      bookingRef = docSnap.ref;
      bookingData = docSnap.data();
    } else {
      console.warn(`Ref ID provided (${bookingIdFromWebhook}) but document not found.`);
    }
  }

  // STRATEGY 2: BillCode Search (If ID lookup failed or no ID provided)
  if (!bookingRef) {
    console.log("Searching by BillCode...");
    // Optimization: Only search pending or recently created? 
    // For safety, just search 'pending'.
    const snapshot = await db.collection("bookings").where("paymentStatus", "==", "pending").get();

    const match = snapshot.docs.find(d =>
      (d.data().billcode && String(d.data().billcode).trim().toLowerCase() === cleanBillCode.toLowerCase())
    );

    if (match) {
      console.log(`MATCH: Found booking via BillCode: ${match.id}`);
      bookingRef = match.ref;
      bookingData = match.data();
    }
  }

  // REMOVED: "Match by Amount" fallback. It is too dangerous and causes incorrect cross-bookings.

  if (!bookingRef || !bookingData) {
    console.error(`FATAL: No booking found for Payment ${cleanBillCode}. Manual check required.`);
    return;
  }

  // 5. UPDATE DATABASE & SLOTS (Atomic Transaction)
  try {
    await db.runTransaction(async (t) => {
      // CRITICAL: Re-read the booking INSIDE the transaction to prevent Race Conditions
      const freshwaterBooking = await t.get(bookingRef);
      if (!freshwaterBooking.exists) throw new Error("Booking vanished!");

      const currentData = freshwaterBooking.data();
      if (currentData.paymentStatus === 'paid') {
        // Already paid. Do nothing. Throwing specific error to exit transaction cleanly.
        throw new Error("ALREADY_PAID");
      }

      // Prepare session updates
      const sessionUpdates = [];
      if (currentData.items) {
        for (const item of currentData.items) {
          if (item.sessionId) {
            const sRef = db.collection("sessions").doc(item.sessionId);
            const sDoc = await t.get(sRef);
            if (sDoc.exists) {
              const currentSlots = sDoc.data().remainingSlots || 0;
              const newSlots = Math.max(0, currentSlots - item.quantity);
              sessionUpdates.push({ ref: sRef, newSlots });
            }
          }
        }
      }

      // Commit Updates
      t.update(bookingRef, { paymentStatus: 'paid', billcode: cleanBillCode, syncStatus: 'pending' });
      for (const update of sessionUpdates) {
        t.update(update.ref, { remainingSlots: update.newSlots });
      }
    });
    console.log(`SUCCESS: Booking ${bookingRef.id} marked as PAID.`);
  } catch (e) {
    if (e.message === "ALREADY_PAID") {
      console.log(`Idempotency: Booking ${bookingRef.id} was already paid. Skipping.`);
    } else {
      console.error("Transaction Error:", e);
      throw e; // Rethrow real errors
    }
  }

  // 6. LOYVERSE SYNC REMOVED (Manual only)
  // await syncBookingToLoyverse(bookingData, bookingRef);
  console.log("Loyverse Sync skipped (Manual Mode). SyncStatus is 'pending'.");
}

// 1. BILL CREATION (Fixed: Removed forced billcode to prevent API error)
// 1. BILL CREATION (Fixed: Force save billcode and log full response)
// 1. BILL CREATION (Fixed: Force save billcode and log full response)
exports.createBizappayBill = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  console.log("1. Starting Bill Creation for:", request.data.bookingId);

  try {
    const { bookingId, amount, customerName, customerEmail, customerPhone } = request.data;

    // Auth
    const loginData = new URLSearchParams();
    loginData.append('apiKey', BIZAPP_API_KEY);
    const tokenRes = await axios.post('https://bizappay.my/api/v3/token', loginData);
    const authToken = tokenRes.data?.token || tokenRes.data?.data?.token;

    // Build Request
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
    // NOTE: 'billcode' parameter is intentionally REMOVED here.

    console.log("2. Sending Request to Bizappay...");
    const response = await axios.post('https://bizappay.my/api/v3/bill/create', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authentication': authToken }
    });

    // FULL LOGGING FOR DEBUGGING
    console.log("Bizappay Response:", JSON.stringify(response.data));

    // FIX: ULTIMATE ROBUSTNESS - Search for 'billcode' in ANY casing (billCode, BILLCODE, etc.)
    const findKey = (obj, target) => Object.keys(obj || {}).find(k => k.toLowerCase() === target.toLowerCase());

    let bCode = null;
    // Check top level
    const k1 = findKey(response.data, 'billcode');
    if (k1) bCode = response.data[k1];

    // Check nested .data level (some APIs wrap it)
    if (!bCode && response.data?.data) {
      const k2 = findKey(response.data.data, 'billcode');
      if (k2) bCode = response.data.data[k2];
    }
    const paymentUrl = response.data?.url || response.data?.data?.url;

    if (!paymentUrl) {
      throw new HttpsError('aborted', `Payment Gateway did not return a URL. Response: ${JSON.stringify(response.data)}`);
    }

    // SAVE THE BILLCODE (Critical for verification)
    if (bCode) {
      // Use UPDATE to ensure we don't overwrite other fields, explicitly wait for it.
      await db.collection("bookings").doc(bookingId).update({ billcode: bCode });
      console.log(`3. SAVED Billcode ${bCode} to booking ${bookingId}`);
    } else {
      console.error("WARNING: No BillCode found in Bizappay response!");
    }

    return { url: paymentUrl };

  } catch (error) {
    console.error("BILL CREATION ERROR:", error.response?.data || error.message);
    throw new HttpsError('internal', "Failed to create payment bill.");
  }
});

// 2. WEBHOOK (Improved Parsing)
// 2. WEBHOOK (Improved Parsing)
exports.bizappayWebhook = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
  let bCode = req.query.billcode || req.body.billcode;
  let bStatus = req.query.billstatus || req.body.billstatus;
  let bAmount = req.query.billamount || req.body.billamount;
  let bRef = req.query.ref || req.body.ref || req.query.order_id || req.body.order_id; // Try to get booking ID

  // Parse Raw Body for complex cases (multipart/form-data)
  if (req.rawBody) {
    const raw = req.rawBody.toString();
    console.log("Raw Webhook Body:", raw); // Debugging

    // IMPROVED REGEX: Handles mixed \r\n or \n, captures value, AND IS CASE-INSENSITIVE ('i' flag)
    const bc = raw.match(/name="billcode"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const st = raw.match(/name="billstatus"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const am = raw.match(/name="billamount"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const rf = raw.match(/name="order_id"[\r\n]+(.*?)(?:[\r\n]|$|--)/i) || raw.match(/name="ref"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);

    if (bc) bCode = bc[1].trim();
    if (st) bStatus = st[1].trim();
    if (am) bAmount = am[1].trim();
    if (rf) bRef = rf[1].trim();
  }

  // Accept status '1', 'paid', or '2' (some gateways use 2 for success) - checking docs implies 1 is paid.
  if (String(bStatus) === '1' || String(bStatus).toLowerCase() === 'paid') {
    await processSuccessfulPayment(bCode, bAmount, bRef);
  } else {
    console.log(`Payment Status ${bStatus} - Ignoring.`);
  }
  res.status(200).send("OK");
});

// 3. MANUAL ADMIN SYNC
// 3. MANUAL ADMIN SYNC
exports.manualAdminUpdate = onRequest({ cors: true, timeoutSeconds: 300 }, async (req, res) => {
  const { bookingId, amount } = req.query;
  // Admin update forces ID lookup
  await processSuccessfulPayment(null, amount, bookingId);
  res.status(200).send("Sync Complete");
});

// 4. MANUAL LOYVERSE SYNC (Callable)
// 4. MANUAL LOYVERSE SYNC (Callable)
exports.syncToLoyverse = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  const { bookingId } = request.data;
  if (!bookingId) throw new HttpsError('invalid-argument', 'Booking ID is required.');

  const docRef = db.collection("bookings").doc(bookingId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) throw new HttpsError('not-found', 'Booking not found.');

  const bookingData = docSnap.data();
  if (bookingData.paymentStatus !== 'paid') throw new HttpsError('failed-precondition', 'Booking is not paid yet.');

  return await syncBookingToLoyverse(bookingData, docRef);
});