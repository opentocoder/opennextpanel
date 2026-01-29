import jwt from "jsonwebtoken";

// 使用固定的默认密钥，确保重启后 session 不会失效
const SECRET = process.env.JWT_SECRET || "openpanel-default-jwt-secret-key-2024";
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
