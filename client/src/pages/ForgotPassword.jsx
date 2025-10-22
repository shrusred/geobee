import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Password reset link sent to:", email);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p style={{ textAlign: "center", marginBottom: "1rem" }}>
          Enter your email address, and we’ll send you a reset link.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Send Link
          </button>
        </form>
      </div>
    </div>
  );
}
