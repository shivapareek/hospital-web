/* Password hashing (scrypt) and cookie sessions. No external dependencies. */
const crypto = require("crypto");

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored || "").split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}

const SESSION_DAYS = 7;
const COOKIE = "cn_sess";

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(token, secure, maxAgeSec) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

/** Store only a hash of the session token, so a leaked data file cannot be replayed as a login. */
const tokenHash = (t) => crypto.createHash("sha256").update(t).digest("hex");

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions[tokenHash(token)] = { userId, expires: Date.now() + SESSION_DAYS * 864e5 };
  return token;
}

function getSession(db, req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const key = tokenHash(token);
  const s = db.sessions[key];
  if (!s || s.expires < Date.now()) { if (s) delete db.sessions[key]; return null; }
  const user = db.users.find((u) => u.id === s.userId);
  return user ? { key, user } : null;
}

function pruneSessions(db) {
  const now = Date.now();
  for (const [k, s] of Object.entries(db.sessions)) if (s.expires < now) delete db.sessions[k];
}

module.exports = { hashPassword, verifyPassword, createSession, getSession, pruneSessions, sessionCookie, SESSION_DAYS, COOKIE };
