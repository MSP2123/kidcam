import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, usernameToEmail } from "../firebase";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (username: string, pin: string) => Promise<void>;
  logIn: (username: string, pin: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

// Firebase Auth requires passwords of 6+ characters, but a kid-friendly PIN
// is 4-6 digits. Pad it into a fixed-shape password so short PINs still work;
// this is derived purely from the PIN, so login only needs username + PIN.
function pinToPassword(pin: string) {
  return `kidcam-pin-${pin}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setProfile({ uid: firebaseUser.uid, username: snap.data().username });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function signUp(rawUsername: string, pin: string) {
    const username = normalizeUsername(rawUsername);
    if (username.length < 3) {
      throw new Error("Username needs at least 3 letters or numbers.");
    }
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error("PIN must be 4 to 6 digits.");
    }

    const usernameRef = doc(db, "usernames", username);
    const existing = await getDoc(usernameRef);
    if (existing.exists()) {
      throw new Error("That username is already taken.");
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      usernameToEmail(username),
      pinToPassword(pin),
    );
    const uid = credential.user.uid;

    await runTransaction(db, async (tx) => {
      tx.set(doc(db, "users", uid), {
        username,
        createdAt: serverTimestamp(),
      });
      tx.set(usernameRef, { uid, username });
    });

    setProfile({ uid, username });
  }

  async function logIn(rawUsername: string, pin: string) {
    const username = normalizeUsername(rawUsername);
    await signInWithEmailAndPassword(
      auth,
      usernameToEmail(username),
      pinToPassword(pin),
    );
  }

  async function logOut() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, logIn, logOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
