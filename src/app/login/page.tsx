"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Loader2, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 安全入口状态
  const [checkingEntry, setCheckingEntry] = useState(true);
  const [entryRequired, setEntryRequired] = useState(false);
  const [entryVerified, setEntryVerified] = useState(false);
  const [entryPath, setEntryPath] = useState("");
  const [entryError, setEntryError] = useState("");

  // 检查安全入口
  useEffect(() => {
    const checkSecurityEntry = async () => {
      try {
        const res = await fetch("/api/auth/verify-entry");
        const data = await res.json();

        setEntryRequired(data.required);
        setEntryVerified(data.verified);
      } catch (err) {
        console.error("Failed to check security entry:", err);
        // 出错时允许访问
        setEntryVerified(true);
      } finally {
        setCheckingEntry(false);
      }
    };

    checkSecurityEntry();
  }, []);

  // 验证安全入口
  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryPath }),
      });

      const data = await res.json();

      if (data.success) {
        setEntryVerified(true);
      } else {
        setEntryError(data.message || "安全入口错误");
      }
    } catch (err) {
      setEntryError("验证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 加载中
  if (checkingEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>验证中...</span>
        </div>
      </div>
    );
  }

  // 需要安全入口但未验证
  if (entryRequired && !entryVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">安全入口验证</CardTitle>
            <CardDescription>请输入安全入口路径以继续访问面板</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEntrySubmit} className="space-y-4">
              {entryError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                  {entryError}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="entryPath" className="text-sm font-medium">
                  安全入口
                </label>
                <Input
                  id="entryPath"
                  type="text"
                  placeholder="/open_xxxxx 或 xxxxx"
                  value={entryPath}
                  onChange={(e) => setEntryPath(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  请输入管理员设置的安全入口路径
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "验证"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p>提示：安全入口路径由管理员在面板设置中配置</p>
              <p>直接访问安全入口 URL 也可以自动验证</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 正常登录页面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Server className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">OpenPanel</CardTitle>
          <CardDescription>服务器管理面板</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                用户名
              </label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>默认账号: admin / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
