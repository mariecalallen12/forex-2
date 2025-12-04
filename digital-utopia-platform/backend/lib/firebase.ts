/**
 * Firebase Admin SDK Configuration
 * 
 * Provides Firebase Admin authentication and Firestore database access
 * for backend services.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin App instance
let adminApp: App;
let firebaseAuth: Auth;
let firestore: Firestore;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // Parse service account from environment variable
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null;

    if (!serviceAccount) {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_KEY not found. Using default credentials.');
      // Initialize with default credentials (works in Firebase environments)
      adminApp = initializeApp();
    } else {
      // Initialize with service account
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('✅ Firebase Admin initialized with service account');
    }

    return adminApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    // Fallback to default initialization
    adminApp = initializeApp();
    return adminApp;
  }
}

// Initialize Firebase Admin
adminApp = initializeFirebaseAdmin();

// Export Auth and Firestore instances
firebaseAuth = getAuth(adminApp);
firestore = getFirestore(adminApp);

// Configure Firestore settings
firestore.settings({
  ignoreUndefinedProperties: true,
});

/**
 * Verify Firebase ID token from client
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user information
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user by UID
 * @param uid - User ID
 */
export async function getUserByUid(uid: string) {
  try {
    const userRecord = await firebaseAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Create custom token for user
 * @param uid - User ID
 * @param claims - Custom claims to add to token
 */
export async function createCustomToken(uid: string, claims?: object) {
  try {
    const customToken = await firebaseAuth.createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
}

/**
 * Set custom user claims (for role-based access)
 * @param uid - User ID
 * @param claims - Custom claims object (e.g., { admin: true, role: 'superadmin' })
 */
export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    await firebaseAuth.setCustomUserClaims(uid, claims);
    console.log(`✅ Custom claims set for user ${uid}`);
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
}

/**
 * Delete user by UID
 * @param uid - User ID
 */
export async function deleteUser(uid: string) {
  try {
    await firebaseAuth.deleteUser(uid);
    console.log(`✅ User ${uid} deleted`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Export instances
export { firebaseAuth, firestore, adminApp };

// Export default firestore for backward compatibility
export default firestore;
