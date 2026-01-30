import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

// 获取安全入口设置
function getSecurityPath(): string {
  const db = getDatabase();
  try {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'security_path'");
    const row = stmt.get() as { value: string } | undefined;
    return row?.value || "";
  } finally {
    db.close();
  }
}

export async function GET(request: NextRequest) {
  try {
    const securityPath = getSecurityPath();

    // 如果没有设置安全入口或为空，直接返回验证通过
    if (!securityPath || securityPath.trim() === "") {
      return NextResponse.json({
        required: false,
        verified: true,
        message: "安全入口未启用"
      });
    }

    // 从 cookie 获取安全入口验证值
    const securityCookie = request.cookies.get("security_entry_verified")?.value;

    // 安全路径格式: /open_xxxxx，cookie 值是 xxxxx 部分
    const expectedValue = securityPath.replace(/^\/open_/, "");

    if (securityCookie === expectedValue) {
      return NextResponse.json({
        required: true,
        verified: true,
        message: "安全入口验证通过"
      });
    }

    return NextResponse.json({
      required: true,
      verified: false,
      message: "请通过安全入口访问面板"
    });
  } catch (error) {
    console.error("Failed to verify security entry:", error);
    // 安全修复：出错时返回 verified: false（fail-close 而非 fail-open）
    return NextResponse.json(
      { error: "验证失败", required: true, verified: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { entryPath } = await request.json();
    const securityPath = getSecurityPath();

    // 如果没有设置安全入口，返回成功
    if (!securityPath || securityPath.trim() === "") {
      return NextResponse.json({
        success: true,
        message: "安全入口未启用"
      });
    }

    // 验证输入的安全入口是否正确
    // 用户可能输入 "/open_xxxxx" 或 "open_xxxxx" 或 "xxxxx"
    let normalizedInput = entryPath.trim();
    if (!normalizedInput.startsWith("/")) {
      normalizedInput = "/" + normalizedInput;
    }
    if (!normalizedInput.startsWith("/open_")) {
      normalizedInput = "/open_" + normalizedInput.replace(/^\//, "");
    }

    if (normalizedInput === securityPath) {
      // 验证通过，设置 cookie
      const cookieValue = securityPath.replace(/^\/open_/, "");
      const response = NextResponse.json({
        success: true,
        message: "验证通过"
      });
      response.cookies.set("security_entry_verified", cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 小时
      });
      return response;
    }

    return NextResponse.json({
      success: false,
      message: "安全入口错误"
    }, { status: 400 });
  } catch (error) {
    console.error("Failed to verify security entry:", error);
    return NextResponse.json(
      { error: "验证失败" },
      { status: 500 }
    );
  }
}
