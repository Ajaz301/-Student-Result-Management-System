/**
 * Firebase Admin SDK Initialization Module
 * Student Result Management System (AcademiaSync)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const KEY_FILE_PATH = process.env.FIREBASE_SERVICE_ACCOUNT || path.join(__dirname, 'serviceAccountKey.json');

let firestoreDb = null;
let firebaseAuth = null;
let isInitialized = false;
let initError = null;

function initFirebase() {
  if (isInitialized) {
    return { isReady: true, db: firestoreDb, auth: firebaseAuth };
  }

  try {
    let credential = null;

    if (fs.existsSync(KEY_FILE_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
      credential = admin.credential.cert(serviceAccount);
      console.log(`[Firebase Admin] Found service account key at: ${KEY_FILE_PATH}`);
    } else if (process.env.FIREBASE_CONFIG_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
      credential = admin.credential.cert(serviceAccount);
      console.log(`[Firebase Admin] Using FIREBASE_CONFIG_JSON environment variable.`);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      credential = admin.credential.applicationDefault();
      console.log(`[Firebase Admin] Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }

    if (!credential) {
      initError = `Firebase service account key file not found at: ${KEY_FILE_PATH}.`;
      return { isReady: false, error: initError };
    }

    // Initialize Firebase app if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential
      });
    }

    firestoreDb = admin.firestore();
    firestoreDb.settings({ ignoreUndefinedProperties: true });
    firebaseAuth = admin.auth();
    isInitialized = true;
    initError = null;

    console.log(`[Firebase Admin] Successfully connected to Firebase Cloud Firestore!`);
    return { isReady: true, db: firestoreDb, auth: firebaseAuth };
  } catch (err) {
    initError = err.message;
    console.error(`[Firebase Admin] Initialization failed:`, err.message);
    return { isReady: false, error: err.message };
  }
}

function getFirebaseStatus() {
  return {
    isConfigured: fs.existsSync(KEY_FILE_PATH) || !!process.env.FIREBASE_CONFIG_JSON || !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    isInitialized,
    keyPath: KEY_FILE_PATH,
    error: initError
  };
}

module.exports = {
  admin,
  initFirebase,
  getDb: () => firestoreDb,
  getAuth: () => firebaseAuth,
  getFirebaseStatus,
  isFirebaseReady: () => isInitialized
};
