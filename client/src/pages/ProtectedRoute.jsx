import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  console.log(
    "ProtectedRoute token?",
    !!token,
    "path:",
    window.location.pathname
  );

  if (!token) return <Navigate to="/login" replace />;

  try {
    const { exp } = jwtDecode(token);
    const expired = !exp || Date.now() >= exp * 1000;
    if (expired) {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      return <Navigate to="/login" replace />;
    }
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    return <Navigate to="/login" replace />;
  }

  return children;
}
