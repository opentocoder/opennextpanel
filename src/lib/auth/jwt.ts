import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not set. Using random secret (sessions will not persist across restarts).");
}

const SECRET = JWT_SECRET || require("crypto").randomBytes(32).toString("hex");
const JWT_EXPIRES = "24h";

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
