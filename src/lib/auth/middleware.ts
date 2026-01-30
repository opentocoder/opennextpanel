import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "./jwt";

type RouteHandler = (
  req: NextRequest,
  context?: any,
  user?: JWTPayload
) => Promise<NextResponse> | NextResponse;

// 角色权限等级
const ROLE_LEVELS: Record<string, number> = {
  "user": 1,
  "operator": 2,
  "admin": 3,
  "superadmin": 4,
};

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    const token = req.cookies.get("token")?.value ||
                  req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token无效或已过期" }, { status: 401 });
    }

    return handler(req, context, payload);
  };
}

/**
 * 带角色检查的认证中间件
 * @param requiredRole 需要的最低角色等级
 */
export function withRole(requiredRole: string): (handler: RouteHandler) => RouteHandler {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, context?: any) => {
      const token = req.cookies.get("token")?.value ||
                    req.headers.get("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({ error: "Token无效或已过期" }, { status: 401 });
      }

      // 检查角色权限
      const userLevel = ROLE_LEVELS[payload.role] || 0;
      const requiredLevel = ROLE_LEVELS[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { error: `权限不足，需要 ${requiredRole} 或更高权限` },
          { status: 403 }
        );
      }

      return handler(req, context, payload);
    };
  };
}

/**
 * 仅限管理员访问
 */
export const withAdmin = withRole("admin");

/**
 * 仅限超级管理员访问
 */
export const withSuperAdmin = withRole("superadmin");
