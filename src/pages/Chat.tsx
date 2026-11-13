import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendVideoMessage, watchMessages } from "../chat";
import type { ChatMessage } from "../types";
import VideoRecorder from "../components/VideoRecorder";

export default function Chat() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { friendUid, friendUsername } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || !friendUid) return;
    return watchMessages(profile.uid, friendUid, setMessages);
  }, [profile, friendUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!profile || !friendUid || !friendUsername) return null;

  async function handleSend(blob: Blob, durationSeconds: number) {
    await sendVideoMessage(profile!, friendUid!, friendUsername!, blob, durationSeconds);
  }

  return (
    <div className="screen chat-screen">
      <header className="top-bar">
        <button className="link-btn" onClick={() => navigate("/")}>
          ← Friends
        </button>
        <h1>{friendUsername}</h1>
      </header>

      <div className="message-list">
        {messages.length === 0 && (
          <p className="muted center">No videos yet. Record one below!</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.senderId === profile.uid ? "bubble mine" : "bubble theirs"
            }
          >
            <video src={msg.videoUrl} controls playsInline className="bubble-video" />
            <span className="bubble-meta">
              {msg.senderUsername} · {msg.durationSeconds}s
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-footer">
        <button className="record-btn big" onClick={() => setRecording(true)}>
          🎥 Record a video
        </button>
      </div>

      {recording && (
        <VideoRecorder onSend={handleSend} onClose={() => setRecording(false)} />
      )}
    </div>
  );
}
