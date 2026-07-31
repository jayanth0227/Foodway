# Foodway Server App 🍔🚀

This is the secure backend server for **Foodway**, built with Node.js, Express, and TypeScript. It handles AWS integration (S3 and DynamoDB) securely away from the client-side code.

---

## 🛠️ Tech Stack & Dependencies

*   **Express**: Lightweight web framework for API routing.
*   **TypeScript**: Type safety and cleaner OOP architecture.
*   **AWS SDK v3**:
    *   `@aws-sdk/client-s3`: Simple storage service (S3) integration.
    *   `@aws-sdk/client-dynamodb` & `@aws-sdk/lib-dynamodb`: DynamoDB Integration (Document Client).
*   **dotenv**: Environment variable manager.
*   **cors**: Cross-Origin Resource Sharing middleware.
*   **ts-node & nodemon**: Development server runner and automatic hot reloader.

---

## 🚀 Getting Started

### 1. Install Dependencies
Run npm install in the `server` directory:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `server` root directory matching `.env.example`:
```env
PORT=5000
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_DYNAMODB_TABLE_NAME=your-dynamodb-table-name
```

### 3. Start Development Server
Run the dev script:
```bash
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).

---

## 🔌 API Endpoints

### Health Check
*   **URL**: `/api/health`
*   **Method**: `GET`
*   **Description**: Checks if server and AWS clients are successfully configured and running.

### AWS Status Check
*   **URL**: `/api/aws/status`
*   **Method**: `GET`
*   **Description**: Returns setup status of keys, region, bucket, and DynamoDB table.
