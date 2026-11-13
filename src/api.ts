const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

export const apiConfigured = Boolean(API_BASE);

const TOKEN_KEY = "kidcam_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  }
  return data as T;
}

export const api = {
  signup: (username: string, pin: string) =>
    request<{ token: string; user: { id: string; username: string } }>("/api/signup", {
      body: { username, pin },
    }),
  login: (username: string, pin: string) =>
    request<{ token: string; user: { id: string; username: string } }>("/api/login", {
      body: { username, pin },
    }),
  me: () => request<{ user: { id: string; username: string } }>("/api/me"),

  sendFriendRequest: (username: string) =>
    request<{ ok: true }>("/api/friends/request", { body: { username } }),
  incomingRequests: () =>
    request<{ requests: RawFriendRequest[] }>("/api/friends/requests/incoming"),
  sentRequests: () => request<{ requests: RawFriendRequest[] }>("/api/friends/requests/sent"),
  respondToRequest: (id: string, accept: boolean) =>
    request<{ ok: true }>(`/api/friends/requests/${id}/respond`, { body: { accept } }),
  friends: () => request<{ friends: { uid: string; username: string }[] }>("/api/friends"),

  messages: (friendUid: string) =>
    request<{ messages: RawMessage[] }>(`/api/chats/${friendUid}/messages`),
  sendVideo: (friendUid: string, video: Blob, durationSeconds: number) => {
    const formData = new FormData();
    formData.append("video", video, "video.webm");
    formData.append("durationSeconds", String(durationSeconds));
    return request<{ ok: true; id: string }>(`/api/chats/${friendUid}/messages`, { formData });
  },
  // <video src> can't send an Authorization header, so videos are fetched as
  // blobs and played from an object URL instead of a direct src URL.
  fetchVideoObjectUrl: async (messageId: string): Promise<string> => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/videos/${messageId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Couldn't load that video.");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

interface RawFriendRequest {
  id: string;
  from_uid: string;
  from_username: string;
  to_uid: string;
  to_username: string;
  status: string;
  created_at: number;
}

interface RawMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  duration_seconds: number;
  created_at: number;
}

export type { RawFriendRequest, RawMessage };
