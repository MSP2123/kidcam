import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  respondToRequest,
  sendFriendRequest,
  watchFriends,
  watchIncomingRequests,
  watchSentRequests,
} from "../friends";
import type { Friend, FriendRequest } from "../types";

export default function Friends() {
  const { profile, logOut } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsubFriends = watchFriends(profile.uid, setFriends);
    const unsubIncoming = watchIncomingRequests(profile.uid, setIncoming);
    const unsubSent = watchSentRequests(profile.uid, setSent);
    return () => {
      unsubFriends();
      unsubIncoming();
      unsubSent();
    };
  }, [profile]);

  if (!profile) return null;

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await sendFriendRequest(profile!, addUsername);
      setStatus(`Friend request sent to ${addUsername}.`);
      setAddUsername("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't send request.");
    }
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
              <button onClick={() => respondToRequest(req, true)}>Accept</button>
              <button onClick={() => respondToRequest(req, false)}>Decline</button>
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
