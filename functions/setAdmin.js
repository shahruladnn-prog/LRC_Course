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

const email = "your-admin@example.com"; // ← CHANGE THIS

admin.auth().getUserByEmail(email)
  .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => {
    console.log("✅ Admin claim set for", email);
    console.log("⚠️  Admin must log out and back in for the claim to take effect.");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  });
