import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 公开路由（不需要登录）
const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

/**
 * 基本的 JWT 格式验证（Edge Runtime 兼容）
 * 注意：这只验证格式，不验证签名。完整验证由 withAuth 中间件执行
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    // 尝试解码 payload 部分
    const payload = JSON.parse(atob(parts[1]));

    // 检查必要字段
    if (!payload.userId || !payload.username) return false;

    // 检查是否过期
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;

    return true;
  } catch {
    return false;
  }
}

// 静态资源路径
const staticPaths = ["/_next", "/favicon.ico", "/icons", "/images"];

// 从数据库获取安全入口路径（在服务端通过环境变量或文件缓存）
// 由于 middleware 运行在 Edge Runtime，不能直接访问数据库
// 我们使用 cookie 来验证用户是否通过了安全入口
const SECURITY_COOKIE_NAME = "security_entry_verified";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (staticPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 检查是否是安全入口路径（格式: /open_xxxxx）
  const securityEntryMatch = pathname.match(/^\/open_([a-zA-Z0-9]+)$/);
  if (securityEntryMatch) {
    // 用户访问了安全入口，设置验证 cookie 并重定向到登录页
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(SECURITY_COOKIE_NAME, securityEntryMatch[1], {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 小时
    });
    return response;
  }

  // 检查安全入口 API（用于验证入口是否正确）
  if (pathname === "/api/auth/verify-entry") {
    return NextResponse.next();
  }

  // 跳过公开路由
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    // 对于登录页，检查是否已通过安全入口
    if (pathname === "/login" || pathname.startsWith("/login")) {
      const securityCookie = request.cookies.get(SECURITY_COOKIE_NAME)?.value;
      // 如果没有安全入口 cookie，显示安全入口输入页面
      // 但为了简化，我们允许直接访问登录页（安全入口是可选的增强功能）
      // 如果想强制使用安全入口，可以在这里检查并重定向
    }
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

  // 验证 JWT 格式（基本检查，完整签名验证由 withAuth 执行）
  if (!isValidJWTFormat(token)) {
    // 清除无效 token
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Token 无效" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));

    response.cookies.delete("token");
    return response;
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
