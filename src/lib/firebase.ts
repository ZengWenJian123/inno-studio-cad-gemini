import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  browserLocalPersistence, 
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Initialize Firestore with ignoreUndefinedProperties set to true
// This prevents "Function setDoc() called with invalid data. Unsupported field value: undefined" errors
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

// Helper to normalize username to email for internal testing
const normalizeUsername = (username: string) => {
  if (username.includes('@')) return username;
  return `${username}@internal.studio`;
};

export const registerWithUsername = async (username: string, password: string) => {
  const email = normalizeUsername(username);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: username });
  return result.user;
};

export const loginWithUsername = async (username: string, password: string) => {
  const email = normalizeUsername(username);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

let isSigningIn = false;

export const signInWithGoogle = async () => {
  if (isSigningIn) return;
  isSigningIn = true;
  
  try {
    const googleProvider = new GoogleAuthProvider();
    // Add custom parameters to help with iframe/popup issues
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      alert('Popup was blocked by your browser. Please allow popups for this site or open the app in a new tab.');
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.log('Popup request was cancelled.');
    } else {
      console.error('Error signing in with Google', error);
      throw error;
    }
  } finally {
    isSigningIn = false;
  }
};

export const logout = () => signOut(auth);
