const axios = require("axios");

// --- CREDENTIALS (COPIED FROM INDEX.JS) ---
const LOYVERSE_TOKEN = "d9d14fd02ac34292ab50e221da50ddb3";
const LOYVERSE_STORE_ID = "7611fff5-5af4-43e4-8758-3f06a1090eed";
const LOYVERSE_PAYMENT_ID = "df4f339c-c806-4cf0-83c9-43ef624a78ac";

// CHANGE THIS TO ONE OF YOUR REAL SKUS FOR TESTING
const TEST_SKU = "10275";

const loyverseApi = axios.create({
    baseURL: "https://api.loyverse.com/v1.0",
    headers: { "Authorization": `Bearer ${LOYVERSE_TOKEN}` },
});

async function runDiagnosis() {
    console.log("--- STARTING LOYVERSE DIAGNOSIS ---");

    // 1. CHECK STORES
    try {
        console.log("\n1. Fetching STORES...");
        const sRes = await loyverseApi.get("/stores");
        const stores = sRes.data.stores;
        console.log(`Found ${stores.length} stores.`);

        const myStore = stores.find(s => s.id === LOYVERSE_STORE_ID);
        if (myStore) {
            console.log(`✅ MATCH! configured Store ID finds: "${myStore.name}"`);
        } else {
            console.log(`❌ MISMATCH! Configured ID ${LOYVERSE_STORE_ID} NOT found in list.`);
            console.log("Available Stores:", JSON.stringify(stores.map(s => ({ id: s.id, name: s.name })), null, 2));
        }
    } catch (e) {
        console.error("❌ FAILED TO FETCH STORES:", e.message);
    }

    // 2. CHECK PAYMENT TYPES
    try {
        console.log("\n2. Fetching PAYMENT TYPES...");
        const pRes = await loyverseApi.get("/payment_types");
        const types = pRes.data.payment_types;
        console.log(`Found ${types.length} payment types.`);

        const myPay = types.find(p => p.id === LOYVERSE_PAYMENT_ID);
        if (myPay) {
            console.log(`✅ MATCH! Configured Payment ID finds: "${myPay.name}"`);
        } else {
            console.log(`❌ MISMATCH! Configured ID ${LOYVERSE_PAYMENT_ID} NOT found in list.`);
            console.log("Available Payment Types:", JSON.stringify(types.map(p => ({ id: p.id, name: p.name })), null, 2));
        }
    } catch (e) {
        console.error("❌ FAILED TO FETCH PAYMENTS:", e.message);
    }

    // 3. CHECK TEST SKU
    try {
        console.log(`\n3. Searching for SKU: "${TEST_SKU}" ...`);
        // Note: The main code fails here if valid items are empty.
        const vRes = await loyverseApi.get(`/variants?sku=${TEST_SKU}`);
        const variants = vRes.data.variants;

        if (variants && variants.length > 0) {
            console.log(`✅ SUCCESS! Found Variant Object.`);
            console.log("FULL VARIANT DATA:", JSON.stringify(variants[0], null, 2));
            console.log(`- id property: ${variants[0].id}`);
            console.log(`- variant_id property: ${variants[0].variant_id}`);
        } else {
            console.log(`❌ FAILED! SKU "${TEST_SKU}" returns ZERO variants.`);
            console.log("   POSSIBLE CAUSES:");
            console.log("   - Typos in SKU (Check spaces!)");
            console.log("   - Item is deleted in Loyverse");
            console.log("   - API Token does not have access to Items");
        }
    } catch (e) {
        console.error("❌ SKU LOOKUP ERROR:", e.message);
    }

    console.log("\n--- DIAGNOSIS COMPLETE ---");
}

runDiagnosis();
