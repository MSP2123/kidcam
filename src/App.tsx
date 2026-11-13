import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { apiConfigured } from "./api";
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
          This app isn't connected to its backend yet. Set VITE_API_BASE to
          the deployed Worker's URL (see the README), then rebuild.
        </p>
      </div>
    </div>
  );
}

function Gate() {
  const { profile, loading } = useAuth();

  if (loading) return <div className="screen center">Loading…</div>;

  if (!profile) {
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
  if (!apiConfigured) return <SetupNeeded />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
