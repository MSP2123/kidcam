import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchFriends,
  fetchIncomingRequests,
  fetchSentRequests,
  respondToRequest,
  sendFriendRequest,
} from "../friends";
import type { Friend, FriendRequest } from "../types";

const POLL_MS = 4000;

export default function Friends() {
  const { profile, logOut } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const [f, inc, out] = await Promise.all([
      fetchFriends(),
      fetchIncomingRequests(),
      fetchSentRequests(),
    ]);
    setFriends(f);
    setIncoming(inc);
    setSent(out);
  }

  useEffect(() => {
    if (!profile) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await sendFriendRequest(addUsername);
      setStatus(`Friend request sent to ${addUsername}.`);
      setAddUsername("");
      refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't send request.");
    }
  }

  async function handleRespond(req: FriendRequest, accept: boolean) {
    await respondToRequest(req.id, accept);
    refresh();
  }

  return (
    <div className="screen">
      <header className="top-bar">
        <h1>📹 KidCam</h1>
        <div>
          <span className="me">Hi, {profile.username}</span>
          <button className="link-btn" onClick={logOut}>
            Log out
          </button>
        </div>
      </header>

      <form onSubmit={handleAddFriend} className="add-friend-form">
        <input
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          placeholder="Add a friend by username"
        />
        <button type="submit">Add</button>
      </form>
      {status && <p className="status">{status}</p>}

      {incoming.length > 0 && (
        <section>
          <h2>Friend requests</h2>
          {incoming.map((req) => (
            <div key={req.id} className="request-row">
              <span>{req.fromUsername}</span>
              <button onClick={() => handleRespond(req, true)}>Accept</button>
              <button onClick={() => handleRespond(req, false)}>Decline</button>
            </div>
          ))}
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2>Pending requests you sent</h2>
          {sent.map((req) => (
            <div key={req.id} className="request-row muted">
              <span>{req.toUsername}</span>
              <span>Waiting…</span>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Friends</h2>
        {friends.length === 0 && <p className="muted">No friends yet — add one above!</p>}
        <div className="friend-list">
          {friends.map((friend) => (
            <button
              key={friend.uid}
              className="friend-card"
              onClick={() => navigate(`/chat/${friend.uid}/${friend.username}`)}
            >
              <span className="avatar">{friend.username[0]?.toUpperCase()}</span>
              <span>{friend.username}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
