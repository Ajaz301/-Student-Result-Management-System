# 🔥 Connecting Student Result Management System to Google Cloud Firebase

This project is configured with a **Node.js Express + Firebase Admin SDK** architecture connecting to **Google Cloud Firestore Database**.

Follow the simple step-by-step instructions below to connect your Firebase project.

---

## 📋 Step 1: Create a Project in Firebase Console

1. Open the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g. `srms-portal` or `student-result-system`).
4. (Optional) Disable or Enable Google Analytics according to your preference, then click **Create Project**.

---

## 🗄️ Step 2: Create a Cloud Firestore Database

1. In your Firebase project sidebar, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose a database location close to you (e.g., `asia-south1 (Mumbai)` or `us-central`).
4. Under **Security Rules**, select **Start in test mode** (or production mode) and click **Create** / **Enable**.

---

## 🔑 Step 3: Generate Service Account Key (`serviceAccountKey.json`)

To allow the Node.js server to securely communicate with Cloud Firestore:

1. Click the **Settings Gear Icon ⚙️** at the top left of the Firebase Console -> select **Project settings**.
2. Go to the **Service accounts** tab.
3. Select **Node.js** under Admin SDK configuration snippet.
4. Click the button **Generate new private key** -> Click **Generate key** in the confirmation popup.
5. A `.json` file will download to your computer.
6. **Rename this downloaded file to `serviceAccountKey.json`** and move it into your project folder:
   ```
   Student Result Management System/
   ├── serviceAccountKey.json   <--- Place the downloaded file here
   ├── server.js
   ├── firebaseAdmin.js
   ├── firebaseService.js
   ├── seed-firebase.js
   └── package.json
   ```

---

## 🌱 Step 4: Install Dependencies & Seed Initial Data

Open your terminal in the project directory:

```bash
# 1. Install dependencies (including firebase-admin)
npm install

# 2. Seed the Firestore database with initial classes, subjects, students & results
npm run seed:firebase
```

You will see output confirming:
- ✔ Administrator account created (`admin` / `admin123`)
- ✔ 4 Classes created
- ✔ 8 Subjects registered
- ✔ Subject combinations linked
- ✔ 6 Sample student profiles enrolled
- ✔ Examination results & marksheets declared
- ✔ Notice board announcements posted

---

## 🚀 Step 5: Start the Firebase-Connected Application

Start your application server:

```bash
npm start
```

Your server will output:
```
===================================================
 AcademiaSync API Server is running locally!
 URL: http://localhost:3000
 Mode: Google Cloud Firebase Firestore
===================================================
```

---

## 🌐 Testing the Integration

1. Open your browser at: `http://localhost:3000`
2. **Student Portal**: Check results for Roll ID `1001` (Class 10 - Section A) or `1101` (Class 11 - Science-A).
3. **Admin Portal**:
   - Username: `admin`
   - Password: `admin123`
4. Add new classes, subjects, student records, or publish marksheets directly — all data will sync in real-time to your **Firebase Cloud Firestore** database!

---

## 💡 Architecture & Security Highlights

- **Firebase Admin SDK**: Operates securely in the backend without exposing raw Firestore API keys or security rules to the browser.
- **Dual-Engine Auto-Fallback**: If `serviceAccountKey.json` is not present, the app runs gracefully in local SQLite mode.
- **API Status Endpoint**: You can check the live database engine anytime at `http://localhost:3000/api/status`.
