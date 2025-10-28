// server.js
// RBAC demo: Admin / Moderator / User with JWT
// Usage:
//  1) npm init -y
//  2) npm install express jsonwebtoken dotenv
//  3) node server.js
//
// For demo: username/passwords are hardcoded (do NOT do this in production)

require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "please_change_this_secret_in_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

/* ---------- Demo users (hardcoded) ----------
   username : password : role
   admin1   : adminpass: admin
   mod1     : modpass  : moderator
   alice    : alicepw  : user
---------------------------------------------- */
const DEMO_USERS = [
  { username: "admin1", password: "adminpass", role: "admin", name: "Admin One" },
  { username: "mod1", password: "modpass", role: "moderator", name: "Moderator One" },
  { username: "alice", password: "alicepw", role: "user", name: "Alice" }
];

/* ---------- Helpers ---------- */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/* ---------- Middleware: verify token ---------- */
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
    // decoded contains our payload (username, role, ...)
    req.user = decoded;
    next();
  });
}

/* ---------- Middleware: authorize by role(s) ---------- */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: "Access denied (no role present)" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied (insufficient role)" });
    }
    next();
  };
}

/* ---------- Routes ---------- */

// Public health
app.get("/", (req, res) => {
  res.json({ ok: true, message: "RBAC demo. POST /login to get a token." });
});

/**
 * POST /login
 * Body: { username, password }
 * Response: { token, expiresIn, user: { username, role, name } }
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required in body" });
  }

  const user = DEMO_USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  // Create minimal token payload
  const payload = { username: user.username, role: user.role, name: user.name };
  const token = signToken(payload);

  res.json({ token, expiresIn: JWT_EXPIRES_IN, user: { username: user.username, role: user.role, name: user.name } });
});

/* Protected: any authenticated user */
app.get("/profile", verifyJwt, (req, res) => {
  // In a real app you'd lookup more info from DB
  res.json({ message: "Profile data", user: req.user });
});

/* Protected: moderator or admin */
app.get("/moderator", verifyJwt, authorizeRoles("moderator", "admin"), (req, res) => {
  res.json({ message: "Moderator dashboard", user: req.user });
});

/* Protected: admin only */
app.get("/admin", verifyJwt, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Admin dashboard", user: req.user });
});

/* Example route to show role check inside handler */
app.post("/moderation/action", verifyJwt, (req, res) => {
  // allow moderators and admins to perform actions; show inline check
  const allowed = ["moderator", "admin"];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: "Not allowed to perform moderation actions" });
  }
  // perform action (demo)
  res.json({ message: `Action performed by ${req.user.username} (${req.user.role})` });
});

/* Fallback */
app.use((req, res) => res.status(404).json({ error: "Not found" }));

/* Start */
app.listen(PORT, () => {
  console.log(`RBAC demo running on http://localhost:${PORT}`);
  console.log("Demo accounts:");
  DEMO_USERS.forEach(u => console.log(`  ${u.username} / ${u.password}  (role: ${u.role})`));
  if (JWT_SECRET === "please_change_this_secret_in_prod") {
    console.log("Warning: using default JWT_SECRET — change for non-demo use.");
  }
});
