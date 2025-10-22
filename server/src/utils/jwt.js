import jwt from "jsonwebtoken";
import "dotenv/config";

const { JWT_SECRET, JWT_EXPIRES_IN = "1h" } = process.env;
console.log("JWT_SECRET value:", JWT_SECRET);

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
