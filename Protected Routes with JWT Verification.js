// server.js
// Single-file Express app with JWT-protected routes
//
// Usage:
// 1) npm init -y
// 2) npm install express jsonwebtoken dotenv
// 3) (optional) create a .env file with JWT_SECRET and PORT
// 4) node server.js
//
// Default demo credentials:
//   username: demo
//   password: secret123

require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "please_change_this_secret_in_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Hardcoded demo user (for exercise only)
const DEMO_USER = {
  username: "demo",
  password: "secret123",
  name: "Demo User",
  email: "demo@example.com"
};

// Helper: sign a token (keep payload minimal)
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware: verify JWT Bearer token
function verifyJwt(req, res, next) {
  const authHeader = req.get("Authorization") || "";
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Malformed Authorization header. Expected 'Bearer <token>'" });
  }

  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token", details: err.message });
    }
    req.user = decoded; // attach decoded payload to request
    next();
  });
}

/* ---------- Routes ---------- */

// Public health route
app.get("/", (req, res) => {
  res.json({ ok: true, message: "JWT protected routes demo. POST /login to get a token." });
});

/**
 * POST /login
 * Body: { username, password }
 * Returns: { token, expiresIn }
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  // Demo credential check (replace with DB in real apps)
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const payload = { username: DEMO_USER.username, name: DEMO_USER.name, email: DEMO_USER.email };
  const token = signToken(payload);

  return res.json({ token, expiresIn: JWT_EXPIRES_IN });
});

/**
 * GET /protected
 * Example protected route
 * Header: Authorization: Bearer <token>
 */
app.get("/protected", verifyJwt, (req, res) => {
  res.json({
    message: "You accessed a protected resource",
    user: req.user
  });
});

/**
 * GET /profile
 * Another protected route returning user profile
 */
app.get("/profile", verifyJwt, (req, res) => {
  // Real app would fetch from DB using req.user.username
  const profile = {
    username: req.user.username,
    name: req.user.name,
    email: req.user.email,
    joined: "2024-01-01"
  };
  res.json({ profile });
});

/* Fallback */
app.use((req, res) => res.status(404).json({ error: "Not found" }));

/* Start server */
app.listen(PORT, () => {
  console.log(`JWT demo server running: http://localhost:${PORT}`);
  console.log(`Demo credentials -> username: ${DEMO_USER.username}, password: ${DEMO_USER.password}`);
  console.log(`JWT secret: ${JWT_SECRET === "please_change_this_secret_in_prod" ? "(default - change it!)" : "(from env)"}`);
});
