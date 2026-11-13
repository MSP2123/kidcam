import { api } from "./api";
import type { Friend, FriendRequest } from "./types";

function mapRequest(r: {
  id: string;
  from_uid: string;
  from_username: string;
  to_uid: string;
  to_username: string;
  status: string;
  created_at: number;
}): FriendRequest {
  return {
    id: r.id,
    fromUid: r.from_uid,
    fromUsername: r.from_username,
    toUid: r.to_uid,
    toUsername: r.to_username,
    status: r.status as FriendRequest["status"],
    createdAt: r.created_at,
  };
}

export function chatIdFor(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("_");
}

export async function sendFriendRequest(username: string) {
  await api.sendFriendRequest(username);
}

export async function fetchIncomingRequests(): Promise<FriendRequest[]> {
  const { requests } = await api.incomingRequests();
  return requests.map(mapRequest);
}

export async function fetchSentRequests(): Promise<FriendRequest[]> {
  const { requests } = await api.sentRequests();
  return requests.map(mapRequest);
}

export async function respondToRequest(requestId: string, accept: boolean) {
  await api.respondToRequest(requestId, accept);
}

export async function fetchFriends(): Promise<Friend[]> {
  const { friends } = await api.friends();
  return friends;
}
