// One-time script to set admin custom claim for Firebase Auth users.
// Usage: node setAdmin.js
//
// Prerequisites:
// 1. Download service account key from Firebase Console →
//    Project Settings → Service Accounts → Generate New Private Key
// 2. Save it as "service-account-key.json" in this folder
// 3. Add service-account-key.json to .gitignore
// 4. After running, admins must sign out and sign back in

const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const adminEmails = [
  "gctputrajaya@gmail.com",
  "asd@asd.com",
];

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log("✅ Admin claim set for", email);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error("❌ User not found:", email);
    } else {
      console.error("❌ Failed for", email, ":", e.message);
    }
  }
}

async function setupAdmin() {
  for (const email of adminEmails) {
    await setAdminClaim(email);
  }
  console.log("⚠️  All admins must sign out and back in for the claim to take effect.");
  process.exit(0);
}

setupAdmin();
