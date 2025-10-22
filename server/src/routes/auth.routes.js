import { Router } from "express";
import bcrypt from "bcrypt";
import { signAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

const router = Router();

/* REGISTER  */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    // check if email exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
    });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email)
      return res.status(409).json({ error: "Email already exists" });
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* LOGIN  */
router.post("/login", async (req, res) => {
  try {
    console.log("[LOGIN] body:", req.body);

    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log("[LOGIN] user found:", !!user);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    console.log("[LOGIN] has passwordHash:", !!user.passwordHash);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAccessToken({
      id: user._id,
      email: user.email,
      role: "user",
    });
    return res.json({ token, token_type: "Bearer" });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
