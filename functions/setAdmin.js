// One-time script to set admin custom claim for a Firebase Auth user.
// Usage: node setAdmin.js
//
// Prerequisites:
// 1. Download service account key from Firebase Console →
//    Project Settings → Service Accounts → Generate New Private Key
// 2. Save it as "service-account-key.json" in this folder
// 3. Add service-account-key.json to .gitignore
// 4. Change the email below to your admin's email
// 5. After running, admin must sign out and sign back in

const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const email = "hello@wetlandputrajaya.com"; // ← CHANGE THIS
const password = "Admin123!";                // ← SET A STRONG PASSWORD (min 6 chars)

async function setupAdmin() {
  try {
    // Try to find existing user
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log("Found existing user:", user.uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // Create the user if they don't exist
        user = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true,
        });
        console.log("Created new user:", user.uid);
        console.log("Password set to:", password);
      } else {
        throw e;
      }
    }

    // Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log("✅ Admin claim set for", email);
    console.log("⚠️  Admin must sign out and back in for the claim to take effect.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
}

setupAdmin();
