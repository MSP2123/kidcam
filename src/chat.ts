import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebase";
import { chatIdFor } from "./friends";
import type { ChatMessage, UserProfile } from "./types";

export function watchMessages(
  myUid: string,
  friendUid: string,
  cb: (messages: ChatMessage[]) => void,
) {
  const chatId = chatIdFor(myUid, friendUid);
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() ?? Date.now(),
      })) as ChatMessage[],
    );
  });
}

export async function sendVideoMessage(
  me: UserProfile,
  friendUid: string,
  friendUsername: string,
  blob: Blob,
  durationSeconds: number,
) {
  const chatId = chatIdFor(me.uid, friendUid);
  const messageId = `${Date.now()}-${me.uid}`;
  const storagePath = `chats/${chatId}/${messageId}.webm`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const videoUrl = await getDownloadURL(storageRef);

  await setDoc(
    doc(db, "chats", chatId),
    {
      members: [me.uid, friendUid].sort(),
      memberUsernames: {
        [me.uid]: me.username,
        [friendUid]: friendUsername,
      },
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: me.uid,
    senderUsername: me.username,
    videoUrl,
    storagePath,
    durationSeconds,
    createdAt: serverTimestamp(),
  });
}
