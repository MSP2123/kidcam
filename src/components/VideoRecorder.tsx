import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 30;

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

interface Props {
  onSend: (blob: Blob, durationSeconds: number) => Promise<void>;
  onClose: () => void;
}

export default function VideoRecorder({ onSend, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't access the camera and microphone."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "video/webm",
      });
      setPreviewBlob(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_SECONDS) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function retake() {
    setPreviewBlob(null);
    setElapsed(0);
  }

  async function handleSend() {
    if (!previewBlob) return;
    setSending(true);
    try {
      await onSend(previewBlob, elapsed);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that video.");
      setSending(false);
    }
  }

  return (
    <div className="recorder-overlay">
      <div className="recorder-card">
        {error && <p className="error">{error}</p>}

        {!previewBlob && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="recorder-video" />
            <div className="recorder-bar">
              <span className="timer">
                {elapsed}s / {MAX_SECONDS}s
              </span>
              {!isRecording ? (
                <button className="record-btn" onClick={startRecording}>
                  Record
                </button>
              ) : (
                <button className="stop-btn" onClick={stopRecording}>
                  Stop
                </button>
              )}
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {previewBlob && (
          <>
            <video
              src={URL.createObjectURL(previewBlob)}
              controls
              playsInline
              className="recorder-video"
            />
            <div className="recorder-bar">
              <button onClick={retake} disabled={sending}>
                Retake
              </button>
              <button className="record-btn" onClick={handleSend} disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button className="cancel-btn" onClick={onClose} disabled={sending}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
