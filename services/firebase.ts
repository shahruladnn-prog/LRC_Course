
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDbjl0WS3YC6XVgiROhkEud5sKsqNkXTk8",
  authDomain: "courses-43ee6.firebaseapp.com",
  projectId: "courses-43ee6",
  storageBucket: "courses-43ee6.firebasestorage.app",
  messagingSenderId: "913794600574",
  appId: "1:913794600574:web:a00d6e2c92226a9c3e122f"
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
      // Critical instruction: use initializeFirestore with experimentalAutoDetectLongPolling
      this.db = initializeFirestore(this.app, {
        experimentalAutoDetectLongPolling: true,
      });
    } else {
      this.app = getApp();
      this.db = getFirestore(this.app);
    }
    this.auth = getAuth(this.app);
    this.functions = getFunctions(this.app);
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