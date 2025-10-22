import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./pages/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Favorites from "./pages/Favorites.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Country from "./pages/Country.jsx";
import Compare from "./pages/Compare.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

export default function App() {
  return (
    <main style={{ padding: "1rem" }}>
      <Routes>
        {/* Default route -> login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected pages */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          }
        />

        {/* Public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </main>
  );
}
