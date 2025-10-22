// client/src/pages/Register.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/mylogogeobee.svg";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) return setMessage(data.error || "Registration failed");

      setMessage("Registered successfully. You can now log in.");
    } catch (err) {
      setMessage("Server error. Try again later.");
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

        <h1>Create Account</h1>

        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            placeholder="Set a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary">
            Register
          </button>
        </form>

        {message && (
          <p style={{ marginTop: "1rem", textAlign: "center" }}>{message}</p>
        )}

        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
