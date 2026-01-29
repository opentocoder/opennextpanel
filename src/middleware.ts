import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 公开路由（不需要登录）
const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

// 静态资源路径
const staticPaths = ["/_next", "/favicon.ico", "/icons", "/images"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (staticPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 跳过公开路由
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  // 检查 token
  const token = request.cookies.get("token")?.value;

  if (!token) {
    // 如果是 API 请求，返回 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    // 否则重定向到登录页
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
