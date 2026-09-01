import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Inyectamos las variables de entorno blindadas
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Patrón Singleton: Evita que Next.js inicialice Firebase múltiples veces 
// cuando hace Hot Reloading en el entorno de desarrollo.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportamos la instancia de la base de datos
export const db = getFirestore(app);
export const auth = getAuth(app);