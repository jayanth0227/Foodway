import { initializeApp, cert, getApps } from "firebase-admin/app";
import serviceAccount from "../../serviceAccountKey.json";

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });

  console.log("🔥 Firebase Admin Initialized Successfully");
}