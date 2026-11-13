import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signUp, logIn } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(username, pin);
      } else {
        await logIn(username, pin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <h1>📹 KidCam</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="e.g. superkid"
            required
          />
        </label>
        <label>
          PIN (4-6 digits)
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            placeholder="1234"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      <button
        className="link-btn"
        onClick={() => {
          setMode(mode === "signup" ? "login" : "signup");
          setError(null);
        }}
      >
        {mode === "signup"
          ? "Already have an account? Log in"
          : "New here? Create an account"}
      </button>
    </div>
  );
}
