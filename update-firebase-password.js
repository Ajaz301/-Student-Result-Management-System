/**
 * AcademiaSync - Update Firebase Admin Password Directly
 * Usage: node update-firebase-password.js [newPassword]
 * Example: node update-firebase-password.js "Admin@Academia2026!"
 */

const { initFirebase, isFirebaseReady, getDb } = require('./firebaseAdmin');

async function updatePassword() {
  const newPassword = process.argv[2] || 'Admin@Academia2026!';
  
  console.log('🔄 Connecting to Firebase Cloud Firestore...');
  const initResult = initFirebase();
  
  if (!initResult.isReady || !isFirebaseReady()) {
    console.error('❌ Could not connect to Firebase. Ensure serviceAccountKey.json exists in root directory.');
    if (initResult.error) console.error('Details:', initResult.error);
    process.exit(1);
  }

  const db = getDb();

  try {
    const adminsRef = db.collection('admins');
    const snapshot = await adminsRef.get();

    if (snapshot.empty) {
      console.log('ℹ️ No admin document found in Firebase. Creating new admin profile...');
      const docRef = await adminsRef.add({
        username: 'admin',
        password: newPassword,
        name: 'School Administrator',
        email: 'admin@srms-edu.org',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log(`✅ Admin document created in Firestore (Doc ID: ${docRef.id})`);
    } else {
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          password: newPassword,
          updated_at: new Date().toISOString()
        });
      });
      await batch.commit();
      console.log(`✅ Successfully updated ${snapshot.size} administrator document(s) in Firebase Firestore.`);
    }

    console.log('\n======================================================');
    console.log('  🎉 Firebase Firestore Password Updated Successfully! ');
    console.log('======================================================');
    console.log('Database Engine: Google Cloud Firebase Firestore');
    console.log('Admin Username:  admin');
    console.log(`Admin Password:  ${newPassword}`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating password in Firebase:', err.message);
    process.exit(1);
  }
}

updatePassword();
