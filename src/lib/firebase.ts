/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import defaultConfig from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// Resolve API Key dynamically from environment or local storage
const resolveApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) {
    return import.meta.env.VITE_FIREBASE_API_KEY;
  }
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('yia_firebase_api_key');
    if (savedKey) return savedKey;
  }
  return defaultConfig.apiKey || '';
};

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: resolveApiKey(),
  authDomain: defaultConfig.authDomain || 'yearinvo-ai.firebaseapp.com',
  projectId: defaultConfig.projectId || 'yearinvo-ai',
  storageBucket: defaultConfig.storageBucket || 'yearinvo-ai.firebasestorage.app',
  messagingSenderId: defaultConfig.messagingSenderId || '825554622341',
  appId: defaultConfig.appId || '1:825554622341:web:27fca78159feaec08ed6ec',
  measurementId: defaultConfig.measurementId || 'G-8R0WBR9LZD',
};

// 1. Initialize Firebase exactly once and export the app instance
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Export Authentication instance
export const auth: Auth = getAuth(app);

// Configure local session persistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[Firebase Auth] Persistence initialization warning:', err);
  });
}

// 3. Export Cloud Firestore instance
export const db: Firestore = getFirestore(app);

// 4. Export Firebase Storage instance
export const storage: FirebaseStorage = getStorage(app);

// 5. Initialize Analytics only when supported by the browser environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && firebaseConfig.measurementId && firebaseConfig.apiKey) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn('[Firebase Analytics] Not supported in this environment:', err);
    });
}

// ========================================================
// Error Handling: FirestoreErrorInfo Standard
// ========================================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Permission Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now();
  try {
    if (!firebaseConfig.apiKey) {
      return {
        success: false,
        message: 'Firebase API key is not configured. Please supply a valid apiKey in environment or settings.',
        latencyMs: 0,
      };
    }
    await getDocFromServer(doc(db, 'system_health', 'connection_test'));
    return {
      success: true,
      message: 'Cloud Firestore connection established successfully.',
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    if (error?.message?.includes('the client is offline')) {
      return {
        success: false,
        message: 'Firestore client is offline. Verify network connection and project ID.',
        latencyMs: latency,
      };
    }
    // Permission denied still confirms network connectivity to Firestore
    if (error?.code === 'permission-denied') {
      return {
        success: true,
        message: 'Connected to Firestore endpoint (Permission rules actively enforced).',
        latencyMs: latency,
      };
    }
    return {
      success: false,
      message: error?.message || 'Firestore connection check failed.',
      latencyMs: latency,
    };
  }
}

/**
 * Real Firestore Read/Write and Authentication Diagnostic Test
 * Performs safe write -> server read -> verification -> cleanup on /diagnostics_test
 */
export async function runFirestoreReadWriteDiagnostic(): Promise<{
  status: 'passed' | 'failed' | 'config_required';
  initialized: boolean;
  authStatus: string;
  writeSuccess: boolean;
  readSuccess: boolean;
  cleanupSuccess: boolean;
  latencyMs: number;
  message: string;
  error?: string;
  recordId?: string;
}> {
  const startTime = Date.now();
  const isInitialized = getApps().length > 0;
  const currentUser = auth.currentUser;
  const authStatus = currentUser
    ? `Authenticated (${currentUser.email || currentUser.uid})`
    : 'Unauthenticated / Guest Session';

  if (!firebaseConfig.apiKey) {
    return {
      status: 'config_required',
      initialized: isInitialized,
      authStatus,
      writeSuccess: false,
      readSuccess: false,
      cleanupSuccess: false,
      latencyMs: 0,
      message: 'Firebase apiKey is missing. Configure VITE_FIREBASE_API_KEY in environment or Firebase Settings.',
      error: 'Missing VITE_FIREBASE_API_KEY',
    };
  }

  const testId = `diag_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const testDocRef = doc(db, 'diagnostics_test', testId);

  try {
    // 1. Write dedicated diagnostic test document
    await setDoc(testDocRef, {
      testId,
      timestamp: Date.now(),
      initiatedBy: currentUser?.email || 'owner_admin',
      type: 'diagnostic_read_write_verification',
    });

    // 2. Read back from server to confirm write actually committed
    const readSnap = await getDocFromServer(testDocRef);
    const readData = readSnap.data();
    const readSuccess = readSnap.exists() && readData?.testId === testId;

    if (!readSuccess) {
      // Attempt cleanup even on partial read failure
      await deleteDoc(testDocRef).catch(() => {});
      return {
        status: 'failed',
        initialized: isInitialized,
        authStatus,
        writeSuccess: true,
        readSuccess: false,
        cleanupSuccess: false,
        latencyMs: Date.now() - startTime,
        message: 'Document write completed but server read-back verification failed or returned empty document.',
        recordId: testId,
      };
    }

    // 3. Clean up the diagnostic test document
    await deleteDoc(testDocRef);

    const latencyMs = Date.now() - startTime;
    return {
      status: 'passed',
      initialized: isInitialized,
      authStatus,
      writeSuccess: true,
      readSuccess: true,
      cleanupSuccess: true,
      latencyMs,
      message: `Verified real Firestore round-trip: write, read-back, and clean up completed successfully (${latencyMs}ms).`,
      recordId: testId,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isPermissionError = err?.code === 'permission-denied' || err?.message?.includes('permission-denied');
    const isOffline = err?.message?.includes('client is offline');

    let actionableError = err.message || 'Unknown Firestore error';
    let status: 'failed' | 'config_required' = 'failed';

    if (isPermissionError) {
      status = currentUser ? 'failed' : 'config_required';
      actionableError = currentUser
        ? 'Firestore permission denied for authenticated user. Verify firestore.rules for /diagnostics_test.'
        : 'Firestore read/write denied: Requires authenticated session. Sign in with Firebase Auth to execute live read/write test.';
    } else if (isOffline) {
      actionableError = 'Cloud Firestore client is offline. Verify internet connection and project ID "yearinvo-ai".';
    }

    return {
      status,
      initialized: isInitialized,
      authStatus,
      writeSuccess: false,
      readSuccess: false,
      cleanupSuccess: false,
      latencyMs,
      message: actionableError,
      error: err.code || err.message,
      recordId: testId,
    };
  }
}

// ========================================================
// Authentication Helpers (Real Firebase Auth)
// ========================================================

// Helper to safely write to Firestore with a timeout so missing DB or offline driver never hangs auth
async function safeFirestoreSetDoc(docRef: any, data: any, timeoutMs = 3000): Promise<boolean> {
  try {
    const writePromise = setDoc(docRef, data, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), timeoutMs)
    );
    await Promise.race([writePromise, timeoutPromise]);
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Profile record sync skipped or timed out:', err?.message || err);
    return false;
  }
}

export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'An error occurred during authentication. Please try again.';
  const code = error.code || '';
  const rawMsg = error.message || '';
  const codeSuffix = code ? ` [${code}]` : '';

  switch (code) {
    case 'auth/invalid-email':
      return `The email address is improperly formatted. Please enter a valid email address.${codeSuffix}`;
    case 'auth/user-not-found':
      return `No account was found with this email address.${codeSuffix}`;
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return `Invalid email or password. Please verify your credentials and try again.${codeSuffix}`;
    case 'auth/email-already-in-use':
      return `An account already exists with this email address. Please sign in or use a different email.${codeSuffix}`;
    case 'auth/weak-password':
      return `Password should be at least 6 characters long.${codeSuffix}`;
    case 'auth/popup-blocked':
      return `The sign-in popup was blocked by your browser. Please allow popups for this site and try again.${codeSuffix}`;
    case 'auth/popup-closed-by-user':
      return `Sign-in was cancelled before completion. Please try again.${codeSuffix}`;
    case 'auth/network-request-failed':
      return `Network connection failure. Please check your internet connection.${codeSuffix}`;
    case 'auth/too-many-requests':
      return `Access has been temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.${codeSuffix}`;
    case 'auth/unauthorized-domain':
      return `Domain unauthorized: "year-info-ai.vercel.app" must be added to Firebase Console > Authentication > Settings > Authorized Domains.${codeSuffix}`;
    case 'auth/operation-not-allowed':
      return `This sign-in provider is not enabled in Firebase Authentication Console.${codeSuffix}`;
    case 'auth/account-exists-with-different-credential':
      return `An account already exists with the same email address using a different sign-in method.${codeSuffix}`;
    default: {
      if (rawMsg.includes('App not active') || rawMsg.includes('Facebook App')) {
        return `Facebook App is not in Live Mode. The Meta App ID requires Live status in Meta for Developers dashboard, or your account must be added as a Tester.${codeSuffix}`;
      }
      const msg = rawMsg.replace(/Firebase: /g, '').replace(/Firebase/g, 'YEAR INFO AI Authentication');
      return `${msg}${codeSuffix}`;
    }
  }
}

export async function firebaseSignUp(email: string, password: string, displayName?: string) {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Please configure VITE_FIREBASE_API_KEY.');
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch (e) {
      console.warn('[Firebase Auth] Failed to set display name:', e);
    }
  }

  // Attempt Firestore user profile sync safely in background without blocking registration
  if (userCredential.user) {
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    safeFirestoreSetDoc(userDocRef, {
      id: userCredential.user.uid,
      name: displayName || email.split('@')[0],
      email: userCredential.user.email,
      role: 'owner',
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  // Automatically send email verification
  try {
    await sendEmailVerification(userCredential.user);
  } catch (e) {
    console.warn('[Firebase Auth] Verification email send notice:', e);
  }
  return userCredential.user;
}

export async function firebaseSignIn(email: string, password: string) {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Please configure VITE_FIREBASE_API_KEY.');
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function firebaseSignOut() {
  await signOut(auth);
}

export async function firebaseSendVerificationEmail() {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  await sendEmailVerification(auth.currentUser);
}

export async function firebaseResetPassword(email: string) {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Please configure VITE_FIREBASE_API_KEY.');
  }
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  await sendPasswordResetEmail(auth, trimmed);
}

export async function firebaseSignInWithGoogle() {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Please configure VITE_FIREBASE_API_KEY.');
  }
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);

  // Sync user profile in Firestore safely in background without blocking auth
  if (result.user) {
    const userDocRef = doc(db, 'users', result.user.uid);
    safeFirestoreSetDoc(userDocRef, {
      id: result.user.uid,
      name: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
      email: result.user.email,
      avatarUrl: result.user.photoURL || '',
      role: 'owner',
      isSuperAdmin: false,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return result.user;
}

export async function firebaseSignInWithFacebook() {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey is missing. Please configure VITE_FIREBASE_API_KEY.');
  }
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  provider.addScope('public_profile');
  const result = await signInWithPopup(auth, provider);

  if (result.user) {
    const userDocRef = doc(db, 'users', result.user.uid);
    safeFirestoreSetDoc(userDocRef, {
      id: result.user.uid,
      name: result.user.displayName || result.user.email?.split('@')[0] || 'Facebook User',
      email: result.user.email,
      avatarUrl: result.user.photoURL || '',
      role: 'owner',
      isSuperAdmin: false,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return result.user;
}

// ========================================================
// Firebase Storage Media Helpers
// ========================================================

export async function uploadProductImage(file: File, workspaceId: string, productId: string): Promise<{ url: string; storagePath: string }> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Unsupported image format. Please select a JPEG, PNG, WebP, or GIF image.');
  }
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image size exceeds 10MB. Please choose a smaller image file.');
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `workspaces/${workspaceId}/products/${productId}_${Date.now()}.${fileExt}`;

  try {
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: { workspaceId, productId, uploadedAt: new Date().toISOString() },
    });
    const url = await getDownloadURL(fileRef);
    return { url, storagePath: filePath };
  } catch (storageErr) {
    console.warn('[Firebase Storage] Direct upload notice, utilizing safe encoded data transfer:', storageErr);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, storagePath: `local/${filePath}` });
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }
}

export async function uploadPostMedia(file: File, workspaceId: string, postId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `workspaces/${workspaceId}/posts/${postId}_${Date.now()}.${fileExt}`;
  const fileRef = ref(storage, filePath);
  await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: { workspaceId, postId, uploadedAt: new Date().toISOString() },
  });
  return await getDownloadURL(fileRef);
}

export async function deleteStorageMedia(fileUrlOrPath: string): Promise<void> {
  const fileRef = ref(storage, fileUrlOrPath);
  await deleteObject(fileRef);
}

// Helper to save/update dynamic API key in local storage and runtime
export function updateFirebaseApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('yia_firebase_api_key', key);
    firebaseConfig.apiKey = key;
  }
}
