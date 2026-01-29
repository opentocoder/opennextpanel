import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "./jwt";

type RouteHandler = (
  req: NextRequest,
  context?: any,
  user?: JWTPayload
) => Promise<NextResponse> | NextResponse;

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
