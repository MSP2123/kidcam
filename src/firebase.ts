import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey);

// When the real Firebase config hasn't been wired up yet (no env vars set),
// skip initializing the SDK rather than letting it throw at import time and
// blank the whole page — App.tsx shows a setup message instead.
export const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>);
export const db = app ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>);
export const storage = app ? getStorage(app) : (null as unknown as ReturnType<typeof getStorage>);

// Usernames aren't real emails, so we map them to a fake address under a
// fixed fake domain and use Firebase's normal email/password auth under the
// hood. This keeps us on standard Firebase Auth (so Firestore/Storage
// security rules can use request.auth.uid) without needing a server.
export const USERNAME_DOMAIN = "kidcam.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}
