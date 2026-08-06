import { initializeApp, cert, getApps } from "firebase-admin/app";
import path from "path";
import fs from "fs";

if (!getApps().length) {
  try {
    const keyPath = path.resolve(__dirname, "../../serviceAccountKey.json");
    if (fs.existsSync(keyPath)) {
      const fileContent = fs.readFileSync(keyPath, "utf8").trim();
      if (fileContent) {
        const serviceAccount = JSON.parse(fileContent);
        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log("🔥 Firebase Admin Initialized Successfully");
      } else {
        console.warn("⚠️ serviceAccountKey.json is empty. Firebase Admin skipped.");
      }
    } else {
      console.warn("⚠️ serviceAccountKey.json file not found. Firebase Admin skipped.");
    }
  } catch (error: any) {
    console.error("❌ Firebase Admin Initialization Error:", error.message);
  }
}