import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Friend, FriendRequest, UserProfile } from "./types";

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function chatIdFor(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("_");
}

export async function sendFriendRequest(
  me: UserProfile,
  rawUsername: string,
) {
  const targetUsername = normalizeUsername(rawUsername);
  if (targetUsername === me.username) {
    throw new Error("You can't add yourself.");
  }

  const usernameSnap = await getDoc(doc(db, "usernames", targetUsername));
  if (!usernameSnap.exists()) {
    throw new Error("No one has that username.");
  }
  const toUid = usernameSnap.data().uid as string;

  const requestId = [me.uid, toUid].sort().join("_");
  await setDoc(doc(db, "friendRequests", requestId), {
    fromUid: me.uid,
    fromUsername: me.username,
    toUid,
    toUsername: targetUsername,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function watchIncomingRequests(
  uid: string,
  cb: (requests: FriendRequest[]) => void,
) {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
  );
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() ?? 0,
      })) as FriendRequest[],
    );
  });
}

export async function respondToRequest(
  request: FriendRequest,
  accept: boolean,
) {
  await runTransaction(db, async (tx) => {
    const reqRef = doc(db, "friendRequests", request.id);
    tx.update(reqRef, { status: accept ? "accepted" : "declined" });

    if (accept) {
      tx.set(doc(db, "friends", request.fromUid, "list", request.toUid), {
        uid: request.toUid,
        username: request.toUsername,
      });
      tx.set(doc(db, "friends", request.toUid, "list", request.fromUid), {
        uid: request.fromUid,
        username: request.fromUsername,
      });
    }
  });
}

export function watchFriends(uid: string, cb: (friends: Friend[]) => void) {
  const q = query(collection(db, "friends", uid, "list"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Friend));
  });
}

export function watchSentRequests(
  uid: string,
  cb: (requests: FriendRequest[]) => void,
) {
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() ?? 0,
      })) as FriendRequest[],
    );
  });
}
