import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

class FirebaseService {
  private static instance: FirebaseService;
  public app: FirebaseApp;
  public auth: Auth;
  public db: Firestore;
  public functions: Functions;

  private constructor() {
    if (getApps().length === 0) {
      this.app = initializeApp(firebaseConfig);
      this.db = initializeFirestore(this.app, {
        experimentalAutoDetectLongPolling: true,
      });
    } else {
      this.app = getApp();
      this.db = getFirestore(this.app);
    }
    this.auth = getAuth(this.app);
    
    // CRITICAL: Point to us-central1 to fix 503 errors
    this.functions = getFunctions(this.app, 'us-central1');
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }
}

const firebaseService = FirebaseService.getInstance();

export const auth = firebaseService.auth;
export const db = firebaseService.db;
export const functions = firebaseService.functions;

export default firebaseService;