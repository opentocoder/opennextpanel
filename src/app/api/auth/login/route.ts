import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/lib/db";
import { signToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const db = getDatabase();
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    if (user.status !== 1) {
      return NextResponse.json({ error: "账户已被禁用" }, { status: 403 });
    }

    // 更新最后登录信息
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    db.prepare("UPDATE users SET last_login = datetime('now'), login_ip = ? WHERE id = ?")
      .run(ip, user.id);

    // 记录登录日志
    db.prepare("INSERT INTO logs (user_id, action, content, ip) VALUES (?, ?, ?, ?)")
      .run(user.id, "login", "用户登录成功", ip);

    db.close();

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

    // 设置 Cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 // 24小时
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
