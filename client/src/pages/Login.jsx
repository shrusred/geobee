// client/src/pages/Login.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, setAuthToken } from "../api";
import { jwtDecode } from "jwt-decode";
import logo from "../assets/mylogogeobee.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email, password });

      // 1) Save token globally for axios
      setAuthToken(data.token);

      // 2) Store decoded email for header
      const decoded = jwtDecode(data.token);
      localStorage.setItem("email", decoded.email);

      // 3) Redirect
      window.location.href = "/home";
      alert("Login successful!");
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            justifyContent: "center",
            marginBottom: "0.5rem",
          }}
        >
          <img
            src={logo}
            alt="GeoBee logo"
            style={{ width: "44px", height: "44px", objectFit: "contain" }}
          />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1 }}>
              GeoBee
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "#555",
                lineHeight: 1.2,
                marginTop: "0.15rem",
              }}
            >
              helping you learn world geography
            </div>
          </div>
        </div>

        <h1>Sign In</h1>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary">
            Login
          </button>
        </form>

        <div className="auth-links">
          <p>
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
