import { initializeApp, cert, getApps } from "firebase-admin/app";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import path from "path";
import fs from "fs";

export async function initializeFirebaseAdmin(): Promise<void> {
  if (getApps().length > 0) return;

  // 1. Try local serviceAccountKey.json (Development)
  try {
    const keyPath = path.resolve(__dirname, "../../serviceAccountKey.json");
    if (fs.existsSync(keyPath)) {
      const fileContent = fs.readFileSync(keyPath, "utf8").trim();
      if (fileContent) {
        const serviceAccount = JSON.parse(fileContent);
        initializeApp({ credential: cert(serviceAccount) });
        console.log("🔥 Firebase Admin Initialized from local serviceAccountKey.json");
        return;
      }
    }
  } catch (err: any) {
    console.warn("⚠️ Failed to load local serviceAccountKey.json:", err?.message);
  }

  // 2. Try Environment Variable JSON (e.g., FIREBASE_SERVICE_ACCOUNT)
  try {
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_CREDENTIALS;
    if (envJson) {
      const serviceAccount = JSON.parse(envJson);
      initializeApp({ credential: cert(serviceAccount) });
      console.log("🔥 Firebase Admin Initialized from Environment Variable");
      return;
    }
  } catch (err: any) {
    console.warn("⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err?.message);
  }

  // 3. Try AWS Secrets Manager (Production Lambda)
  try {
    const region = process.env.AWS_DYNAMODB_REGION || process.env.AWS_S3_REGION || "ap-south-2";
    const secretsClient = new SecretsManagerClient({ region });
    const secretName = process.env.FIREBASE_SECRET_NAME || "foodway/production/firebase-service-account";

    console.log(`🔑 Fetching Firebase Service Account Secret from AWS Secrets Manager [${secretName}]...`);
    const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }));
    const secretString = response.SecretString || (response.SecretBinary ? Buffer.from(response.SecretBinary).toString('utf-8') : '');

    if (secretString) {
      const serviceAccount = JSON.parse(secretString);
      initializeApp({ credential: cert(serviceAccount) });
      console.log("🔥 Firebase Admin Initialized successfully from AWS Secrets Manager!");
      return;
    }
  } catch (err: any) {
    console.warn("⚠️ AWS Secrets Manager Firebase secret lookup failed:", err?.message || err);
  }

  console.warn("⚠️ Firebase Admin SDK not initialized: No valid credentials found. Push notifications will be skipped safely.");
}

// Auto-run initialization async (non-blocking)
void initializeFirebaseAdmin();