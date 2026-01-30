import jwt from "jsonwebtoken";

// 安全检查：强制要求设置 JWT_SECRET 环境变量
const SECRET = process.env.JWT_SECRET;

// 在实际运行时检查（不在构建阶段检查）
function getEffectiveSecret(): string {
  if (SECRET) return SECRET;

  // 构建阶段使用临时值（不会实际用于签名）
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
    console.error("=".repeat(60));
    console.error("CRITICAL SECURITY ERROR: JWT_SECRET 环境变量未设置！");
    console.error("请在 .env 文件或环境变量中设置 JWT_SECRET");
    console.error("示例: JWT_SECRET=$(openssl rand -base64 32)");
    console.error("=".repeat(60));
    process.exit(1);
  }

  // 开发环境或构建阶段使用临时密钥
  if (!process.env.NEXT_PHASE) {
    console.warn("⚠️  开发环境：使用临时随机密钥（重启后所有 session 失效）");
  }
  return require("crypto").randomBytes(32).toString("base64");
}

const EFFECTIVE_SECRET = getEffectiveSecret();
const JWT_EXPIRES = "24h";

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, EFFECTIVE_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, EFFECTIVE_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
