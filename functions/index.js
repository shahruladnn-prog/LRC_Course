
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// --- Loyverse Credentials ---
const LOYVERSE_TOKEN = "d9d14fd02ac34292ab50e221da50ddb3";
const LOYVERSE_STORE_ID = "7611fff5-5af4-43e4-8758-3f06a1090eed";
const LOYVERSE_PAYMENT_ID = "df4f339c-c806-4cf0-83c9-43ef624a78ac";

const loyverseApi = axios.create({
  baseURL: "https://api.loyverse.com/v1.0",
  headers: {
    "Authorization": `Bearer ${LOYVERSE_TOKEN}`,
  },
});

/**
 * Logs synchronization errors to a dedicated Firestore collection.
 * @param {string} bookingId - The ID of the booking that failed.
 * @param {any} error - The error object or message.
 * @param {string} stage - The stage where the error occurred (e.g., 'getVariant', 'createReceipt').
 */
const logSyncError = async (bookingId, error, stage) => {
  console.error(`Loyverse sync failed for booking ${bookingId} at stage ${stage}:`, error);
  await db.collection("failed_sync").add({
    bookingId,
    stage,
    errorMessage: error.message || "An unknown error occurred.",
    errorDetails: error.response ? error.response.data : error.toString(),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
};

/**
 * A callable function to finalize a booking, decrement slots, and sync with Loyverse.
 */
exports.syncAndFinalizeBooking = functions.https.onCall(async (data, context) => {
  const {bookingId} = data;
  if (!bookingId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'bookingId'.");
  }

  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) {
    throw new functions.https.HttpsError("not-found", `Booking with ID ${bookingId} not found.`);
  }

  const bookingData = bookingDoc.data();

  // --- Step 1: Sync with Loyverse (and collect variant IDs) ---
  const lineItemsForLoyverse = [];
  let syncSuccessful = true;

  for (const item of bookingData.items) {
    try {
      const courseDoc = await db.collection("courses").doc(item.courseId).get();
      if (!courseDoc.exists || !courseDoc.data().sku) {
        throw new Error(`Course ${item.courseId} not found or has no SKU.`);
      }
      const sku = courseDoc.data().sku;

      const variantResponse = await loyverseApi.get(`/variants?sku=${sku}`);
      if (!variantResponse.data.variants || variantResponse.data.variants.length === 0) {
        throw new Error(`No Loyverse variant found for SKU: ${sku}`);
      }
      const variantId = variantResponse.data.variants[0].id;

      lineItemsForLoyverse.push({
        variant_id: variantId,
        quantity: item.quantity,
        price: item.price,
        line_total_gross: item.price * item.quantity,
      });
    } catch (error) {
      await logSyncError(bookingId, error, "getVariant");
      syncSuccessful = false;
      // We continue to process the booking internally even if sync fails
    }
  }

  // If we successfully found all variants, create the receipt
  if (syncSuccessful && lineItemsForLoyverse.length > 0) {
    try {
      const receiptPayload = {
        store_id: LOYVERSE_STORE_ID,
        source: "API",
        line_items: lineItemsForLoyverse,
        payments: [{
          payment_type_id: LOYVERSE_PAYMENT_ID,
          amount: bookingData.totalAmount,
        }],
      };
      await loyverseApi.post("/receipts", receiptPayload);
      functions.logger.info(`Successfully created Loyverse receipt for booking ${bookingId}`);
    } catch (error) {
      await logSyncError(bookingId, error, "createReceipt");
      // The booking will still be marked as 'paid' internally.
    }
  }


  // --- Step 2: Finalize booking in Firestore within a transaction ---
  try {
    await db.runTransaction(async (transaction) => {
      // a. Update the booking status to 'paid'
      transaction.update(bookingRef, {paymentStatus: "paid"});

      // b. Decrement the remaining slots for each session
      for (const item of bookingData.items) {
        const sessionRef = db.collection("sessions").doc(item.sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        if (!sessionDoc.exists()) {
          throw new Error(`Session ${item.sessionId} not found!`);
        }
        const currentSlots = sessionDoc.data().remainingSlots;
        if (currentSlots < item.quantity) {
          throw new functions.https.HttpsError("aborted", `Not enough slots for ${item.courseName}. Requested: ${item.quantity}, Available: ${currentSlots}`);
        }
        transaction.update(sessionRef, {remainingSlots: currentSlots - item.quantity});
      }
    });
    functions.logger.info(`Transaction for booking ${bookingId} committed successfully.`);
    return {status: "success", bookingId};
  } catch (error) {
    functions.logger.error("Firestore transaction failed:", error);
    // If the transaction fails, update the booking status to 'failed'
    await bookingRef.update({paymentStatus: "failed"});
    // Re-throw the specific error from the transaction (e.g., not enough slots)
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    throw new functions.https.HttpsError("aborted", "Booking failed due to an internal error.", error);
  }
});
