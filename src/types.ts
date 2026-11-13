export interface UserProfile {
  uid: string;
  username: string;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}

export interface Friend {
  uid: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  videoUrl: string;
  storagePath: string;
  durationSeconds: number;
  createdAt: number;
}
