import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkLH1XQU9nlmq2Y8n7QIMACcrZkrAaVS0",
  authDomain: "gym-app-a7da4.firebaseapp.com",
  projectId: "gym-app-a7da4",
  storageBucket: "gym-app-a7da4.firebasestorage.app",
  messagingSenderId: "848177931520",
  appId: "1:848177931520:web:1a84b371c5bfaeed123fe5",
  measurementId: "G-2H0QDEBDG2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const googleProvider = new GoogleAuthProvider();
