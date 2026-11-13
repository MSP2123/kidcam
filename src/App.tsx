import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { firebaseConfigured } from "./firebase";
import Login from "./pages/Login";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import "./App.css";

function SetupNeeded() {
  return (
    <div className="screen center">
      <div>
        <h1>📹 KidCam</h1>
        <p className="muted">
          This app isn't connected to a Firebase project yet. Follow the
          "One-time Firebase setup" steps in the README, then set the
          VITE_FIREBASE_* secrets for this deployment.
        </p>
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) return <div className="screen center">Loading…</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Friends />} />
      <Route path="/chat/:friendUid/:friendUsername" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!firebaseConfigured) return <SetupNeeded />;

  return (
    <HashRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </HashRouter>
  );
}
