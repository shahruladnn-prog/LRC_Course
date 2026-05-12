const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
// Force Deploy Timestamp: 2025-12-29
const { HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();
const db = admin.firestore();

// --- CREDENTIALS (from Firebase Secrets) ---
const { defineSecret } = require("firebase-functions/params");
const BIZAPP_API_KEY = defineSecret("BIZAPP_API_KEY");
const BIZAPP_CATEGORY = defineSecret("BIZAPP_CATEGORY");
const LOYVERSE_TOKEN = defineSecret("LOYVERSE_TOKEN");
const LOYVERSE_STORE_ID = defineSecret("LOYVERSE_STORE_ID");
const LOYVERSE_PAYMENT_ID = defineSecret("LOYVERSE_PAYMENT_ID");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const { Resend } = require("resend");

// --- CUSTOMERS ---
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

// HELPER: Send confirmation email via Resend
async function sendConfirmationEmail(bookingData, bookingRef) {
  try {
    const resend = new Resend(RESEND_API_KEY.value());
    const items = bookingData.items || [];
    const bookingId = bookingRef.id;

    // Build redemption codes list for the email
    let codesHtml = '';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      codesHtml += `<p style="margin:8px 0"><strong>${item.productName}</strong> (x${item.quantity})`;
      if (item.sessionDate) codesHtml += ` — ${item.sessionDate}`;
      codesHtml += `</p>`;
      codesHtml += `<p style="margin:2px 0 2px 20px;font-family:monospace;font-size:14px">Code: ${bookingId}-${i}</p>`;

      if (item.addOns) {
        for (let j = 0; j < item.addOns.length; j++) {
          const addon = item.addOns[j];
          const addonQty = addon.quantity || 1;
          for (let k = 0; k < addonQty; k++) {
            const code = addonQty > 1
              ? `${bookingId}-${i}-addon-${j}-${k}`
              : `${bookingId}-${i}-addon-${j}`;
            codesHtml += `<p style="margin:2px 0 2px 40px;font-size:13px">🎁 ${addon.name}${addon.variant ? ` (${addon.variant})` : ''}</p>`;
            codesHtml += `<p style="margin:2px 0 2px 40px;font-family:monospace;font-size:14px">Code: ${code}</p>`;
          }
        }
      }
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#4f46e5">Booking Confirmed!</h1>
        <p>Hi ${bookingData.customerFullName},</p>
        <p>Your payment has been received. Here are your booking details:</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Total:</strong> RM ${(bookingData.totalAmount || 0).toFixed(2)}</p>
        </div>
        <h3>Your Redemption Codes</h3>
        ${codesHtml}
        <p style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px">
          <strong>Important:</strong> Show these codes (or the QR codes from your booking page)
          at the event check-in counter. Each code can only be used once.
        </p>
        <p style="margin-top:24px;color:#64748b;font-size:12px">
          LRC Putrajaya · Lake Recreation Center
        </p>
      </div>
    `;

    await resend.emails.send({
      from: 'LRC Putrajaya <noreply@lrc.my>',
      to: bookingData.customerEmail,
      subject: `Booking Confirmed — ${bookingId}`,
      html: html,
    });

    console.log(`Confirmation email sent to ${bookingData.customerEmail} for booking ${bookingId}`);
  } catch (err) {
    console.error("Email sending failed (non-fatal):", err.message);
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

    const loyverseApi = axios.create({
      baseURL: "https://api.loyverse.com/v1.0",
      headers: { "Authorization": `Bearer ${LOYVERSE_TOKEN.value()}` },
    });

    const lineItems = [];
    if (bookingData.items) {
      for (const item of bookingData.items) {
        const productDoc = await db.collection("courses").doc(item.productId).get();
        const sku = productDoc.data()?.sku;
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
          console.warn(`Product ${item.productId} in Firebase has no SKU field.`);
        }
        
        // Add-on line items (using explicit loyverseSku from add-on definition)
        if (item.addOns) {
          for (const addon of item.addOns) {
            // Skip if no loyverseSku configured — admin hasn't mapped this add-on to Loyverse
            if (!addon.loyverseSku) {
              console.warn(`Add-on "${addon.name}" has no loyverseSku — skipping Loyverse sync.`);
              continue;
            }
            // Build full SKU: base SKU + variant (if variant exists)
            const addonSku = addon.variant
              ? `${addon.loyverseSku}-${addon.variant.toUpperCase()}`
              : addon.loyverseSku;
            const addonQty = addon.quantity || 1; // Use independent add-on quantity, fallback to 1
            try {
              const vRes = await loyverseApi.get(`/variants?sku=${addonSku}`);
              const variantId = vRes.data.variants?.[0]?.variant_id;
              if (variantId) {
                lineItems.push({ variant_id: variantId, quantity: addonQty, price: addon.price });
              } else {
                console.warn(`Add-on SKU ${addonSku} found but no variant ID`);
              }
            } catch (skuErr) {
              console.warn(`Failed to fetch variant for add-on SKU ${addonSku}:`, skuErr.message);
            }
          }
        }
      }
    }

    if (lineItems.length > 0) {
      // 2. Create Receipt with Customer and BillCode
      await loyverseApi.post("/receipts", {
        store_id: LOYVERSE_STORE_ID.value(),
        line_items: lineItems,
        payments: [{ payment_type_id: LOYVERSE_PAYMENT_ID.value(), amount: bookingData.totalAmount }],
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

  // 5.5 GENERATE REDEMPTION CODES (Idempotent — check existing first)
  try {
    const existingRedemptions = await db.collection('redemptions')
        .where('bookingId', '==', bookingRef.id).get();
    
    if (existingRedemptions.empty) {
      const redemptionBatch = db.batch();
      const items = bookingData.items || [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Ticket redemption
        const ticketCode = `${bookingRef.id}-${i}`;
        const ticketRef = db.collection('redemptions').doc(ticketCode);
        redemptionBatch.set(ticketRef, {
          bookingId: bookingRef.id,
          itemIndex: i,
          itemType: 'ticket',
          code: ticketCode,
          status: 'pending',
          customerName: bookingData.customerFullName,
          itemName: item.productName || item.courseName || 'Item',
        });
        
        // Add-on (merchandise) redemptions — one per quantity unit
        if (item.addOns) {
          for (let j = 0; j < item.addOns.length; j++) {
            const addon = item.addOns[j];
            const addonQty = addon.quantity || 1;
            for (let k = 0; k < addonQty; k++) {
              const merchCode = addonQty > 1
                ? `${bookingRef.id}-${i}-addon-${j}-${k}`
                : `${bookingRef.id}-${i}-addon-${j}`;
              const merchRef = db.collection('redemptions').doc(merchCode);
              redemptionBatch.set(merchRef, {
                bookingId: bookingRef.id,
                itemIndex: i,
                addOnIndex: j,
                itemType: 'merchandise',
                code: merchCode,
                status: 'pending',
                customerName: bookingData.customerFullName,
                itemName: addon.variant
                  ? `${addon.name} (${addon.variant})`
                  : addon.name,
              });
            }
          }
        }
      }
      await redemptionBatch.commit();
      console.log(`Redemption codes generated for booking ${bookingRef.id}`);
    } else {
      console.log(`Redemptions already exist for booking ${bookingRef.id}. Skipping.`);
    }
  } catch (redemptionErr) {
    console.error("Redemption generation error (non-fatal):", redemptionErr.message);
  }

  // 5.6 SEND CONFIRMATION EMAIL (non-blocking, fire-and-forget)
  sendConfirmationEmail(bookingData, bookingRef).catch(err => {
    console.error("Confirmation email failed (non-blocking):", err.message);
  });

  // 6. LOYVERSE SYNC — runs AFTER the transaction commits so a Loyverse
  //    failure never rolls back a successful payment.
  syncBookingToLoyverse(bookingData, bookingRef).catch(err => {
    console.error("Loyverse Sync failed (non-blocking):", err.message);
  });
}

// 1. BILL CREATION (Fixed: Removed forced billcode to prevent API error)
// 1. BILL CREATION (Fixed: Force save billcode and log full response)
// 1. BILL CREATION (Fixed: Force save billcode and log full response)
exports.createBizappayBill = onCall(
  { cors: true, timeoutSeconds: 300, secrets: [BIZAPP_API_KEY, BIZAPP_CATEGORY] },
  async (request) => {
  console.log("1. Starting Bill Creation for:", request.data.bookingId);

  try {
    const { bookingId, amount, customerName, customerEmail, customerPhone } = request.data;

    // Auth
    const loginData = new URLSearchParams();
    loginData.append('apiKey', BIZAPP_API_KEY.value());
    const tokenRes = await axios.post('https://bizappay.my/api/v3/token', loginData);
    const authToken = tokenRes.data?.token || tokenRes.data?.data?.token;

    // Build Request
    const formData = new URLSearchParams();
    formData.append('apiKey', BIZAPP_API_KEY.value());
    formData.append('category', BIZAPP_CATEGORY.value());
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

// 2. WEBHOOK — with billcode validation (Bizappay doesn't use HMAC)
// Docs: callback_url receives query params: billcode, billamount, billstatus,
//        billinvoice, billtrans
//        billstatus: 1=success, 2=pending, 3=failed, 4=no_action
exports.bizappayWebhook = onRequest({ timeoutSeconds: 300, secrets: [BIZAPP_API_KEY] }, async (req, res) => {
  let bCode = req.query.billcode || req.body.billcode;
  let bStatus = req.query.billstatus || req.body.billstatus;
  let bAmount = req.query.billamount || req.body.billamount;
  let bInvoice = req.query.billinvoice || req.body.billinvoice || '';
  let bTrans = req.query.billtrans || req.body.billtrans || '';
  let bRef = req.query.ref || req.body.ref || req.query.order_id || req.body.order_id;

  // Parse Raw Body for complex cases (multipart/form-data)
  if (req.rawBody) {
    const raw = req.rawBody.toString();
    console.log("Raw Webhook Body:", raw);

    const bc = raw.match(/name="billcode"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const st = raw.match(/name="billstatus"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const am = raw.match(/name="billamount"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const inv = raw.match(/name="billinvoice"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const tr = raw.match(/name="billtrans"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);
    const rf = raw.match(/name="order_id"[\r\n]+(.*?)(?:[\r\n]|$|--)/i) || raw.match(/name="ref"[\r\n]+(.*?)(?:[\r\n]|$|--)/i);

    if (bc) bCode = bc[1].trim();
    if (st) bStatus = st[1].trim();
    if (am) bAmount = am[1].trim();
    if (inv) bInvoice = inv[1].trim();
    if (tr) bTrans = tr[1].trim();
    if (rf) bRef = rf[1].trim();
  }

  // --- BILLCODE VALIDATION (anti-spoofing) ---
  // Bizappay doesn't send HMAC signatures. Security relies on the billcode
  // being an unguessable random string. We validate it matches a real booking.
  if (!bCode) {
    console.error("WEBHOOK REJECTED: No billcode received");
    return res.status(400).send("Missing billcode");
  }

  const cleanCode = String(bCode).trim();
  const snapshot = await db.collection("bookings")
    .where("billcode", "==", cleanCode)
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Also try case-insensitive match (fallback for data inconsistencies)
    const allPending = await db.collection("bookings")
      .where("paymentStatus", "==", "pending")
      .get();
    const match = allPending.docs.find(d => {
      const stored = d.data().billcode;
      return stored && String(stored).trim().toLowerCase() === cleanCode.toLowerCase();
    });
    if (!match) {
      console.error(`WEBHOOK REJECTED: Billcode "${cleanCode}" not found in Firestore`);
      return res.status(404).send("Billcode not recognized");
    }
    console.log(`Webhook billcode matched via case-insensitive fallback: ${cleanCode}`);
  }

  const statusCode = String(bStatus).trim();
  console.log(`Webhook received: billcode=${cleanCode}, status=${statusCode}, amount=${bAmount}, invoice=${bInvoice}`);

  // --- SERVER-TO-SERVER VERIFICATION ---
  // Independently confirm payment status via Bizappay API (not just trusting
  // the webhook params, which could be spoofed).
  let verifiedStatus = statusCode;
  try {
    const verifyLogin = new URLSearchParams();
    verifyLogin.append('apiKey', BIZAPP_API_KEY.value());
    const verifyTokenRes = await axios.post('https://bizappay.my/api/v3/token', verifyLogin);
    const verifyAuthToken = verifyTokenRes.data?.token || verifyTokenRes.data?.data?.token;

    const verifyForm = new URLSearchParams();
    verifyForm.append('apiKey', BIZAPP_API_KEY.value());
    verifyForm.append('search_str', cleanCode);
    verifyForm.append('latest', 'true');

    const verifyRes = await axios.post('https://www.bizappay.my/api/v3/bill/info', verifyForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authentication': verifyAuthToken }
    });

    const bill = verifyRes.data?.bill;
    if (bill) {
      // Bizappay returns payments as array (multipayment) or single object
      const payments = Array.isArray(bill.payments) ? bill.payments : (bill.payments ? [bill.payments] : []);
      const latest = payments[payments.length - 1]; // last payment is most recent
      if (latest && latest.status) {
        verifiedStatus = String(latest.status);
        console.log(`Server-verified status: ${verifiedStatus} (webhook claimed: ${statusCode})`);
        if (verifiedStatus !== statusCode) {
          console.warn(`STATUS MISMATCH: Webhook said ${statusCode}, Bizappay says ${verifiedStatus}. Using verified status.`);
        }
      }
    }
  } catch (verifyErr) {
    // If verification call fails, fall back to webhook status (don't block payment)
    console.error("Server-to-server verification failed — falling back to webhook status:", verifyErr.message);
  }
  // --- END VERIFICATION ---

  // --- HANDLE ALL STATUS CODES ---
  if (verifiedStatus === '1') {
    // SUCCESS — process payment
    await processSuccessfulPayment(cleanCode, bAmount, bRef);
  } else if (verifiedStatus === '3') {
    // FAILED — update booking status
    console.log(`Payment FAILED for billcode ${cleanCode}`);
    try {
      const bookingsSnap = await db.collection("bookings")
        .where("billcode", "==", cleanCode)
        .get();
      if (!bookingsSnap.empty) {
        await bookingsSnap.docs[0].ref.update({
          paymentStatus: 'failed',
          syncStatus: 'failed',
          syncError: `Bizappay payment failed (status: ${verifiedStatus})`
        });
      }
    } catch (err) {
      console.error("Failed to update booking as failed:", err.message);
    }
  } else if (verifiedStatus === '2') {
    console.log(`Payment PENDING for billcode ${cleanCode} — waiting...`);
  } else if (verifiedStatus === '4') {
    console.log(`Payment NO ACTION for billcode ${cleanCode} — customer did not pay.`);
  } else {
    console.log(`Unknown status "${verifiedStatus}" for billcode ${cleanCode} — ignoring.`);
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

// 4. MANUAL LOYVERSE SYNC (Callable — Admin Only)
exports.syncToLoyverse = onCall(
  { cors: true, timeoutSeconds: 300, secrets: [LOYVERSE_TOKEN, LOYVERSE_STORE_ID, LOYVERSE_PAYMENT_ID] },
  async (request) => {
    // --- Admin Auth Check ---
    if (!request.auth || !request.auth.token || request.auth.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Only admins can trigger Loyverse sync.');
    }

    const { bookingId } = request.data;
    if (!bookingId) throw new HttpsError('invalid-argument', 'Booking ID is required.');

    const docRef = db.collection("bookings").doc(bookingId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) throw new HttpsError('not-found', 'Booking not found.');

    const bookingData = docSnap.data();
    if (bookingData.paymentStatus !== 'paid') {
      throw new HttpsError('failed-precondition', 'Booking is not paid yet.');
    }

    return await syncBookingToLoyverse(bookingData, docRef);
  }
);