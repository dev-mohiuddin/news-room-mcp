import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for storing sensitive data at rest
 * (CMS credentials, OAuth tokens, third-party API keys).
 *
 * ENV: ENCRYPTION_KEY = 32-byte hex string
 *   generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Output format: iv:authTag:ciphertext (all hex)
 */

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended
const KEY_LENGTH = 32;

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production");
    }
    // Dev fallback — DO NOT use in production
    return crypto.createHash("sha256").update("newsroom-mcp-dev-only").digest();
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes hex (64 chars)");
  }
  return buf;
};

export const encrypt = (plaintext) => {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (payload) => {
  if (payload == null) return null;
  const [ivHex, tagHex, dataHex] = String(payload).split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

export const maskSecret = (secret, visibleStart = 6, visibleEnd = 4) => {
  if (!secret) return "";
  const s = String(secret);
  if (s.length <= visibleStart + visibleEnd) return "•".repeat(s.length);
  return `${s.slice(0, visibleStart)}…${s.slice(-visibleEnd)}`;
};
