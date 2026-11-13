import { api } from "./api";
import type { ChatMessage, UserProfile } from "./types";

export async function fetchMessages(friendUid: string): Promise<ChatMessage[]> {
  const { messages } = await api.messages(friendUid);
  return Promise.all(
    messages.map(async (m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderUsername: m.sender_username,
      videoUrl: await api.fetchVideoObjectUrl(m.id),
      storagePath: m.id,
      durationSeconds: m.duration_seconds,
      createdAt: m.created_at,
    })),
  );
}

export async function sendVideoMessage(
  _me: UserProfile,
  friendUid: string,
  _friendUsername: string,
  blob: Blob,
  durationSeconds: number,
) {
  await api.sendVideo(friendUid, blob, durationSeconds);
}
