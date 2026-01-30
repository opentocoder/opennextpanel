"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * 全局认证检查 Hook
 * 定期检查认证状态，过期时自动跳转到登录页
 */
export function useAuthCheck(intervalMs: number = 60000) {
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        router.push("/login");
      }
    } catch {
      // 网络错误忽略
    }
  }, [router]);

  useEffect(() => {
    // 初次检查
    checkAuth();

    // 定期检查
    const interval = setInterval(checkAuth, intervalMs);

    // 监听 focus 事件，用户切换回页面时检查
    const handleFocus = () => checkAuth();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkAuth, intervalMs]);

  return { checkAuth };
}

/**
 * 带认证检查的 fetch wrapper
 * 当 API 返回 401 时自动跳转到登录页
 */
export function createAuthFetch(router: ReturnType<typeof useRouter>) {
  return async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status === 401) {
      router.push("/login");
      throw new Error("认证已过期，请重新登录");
    }

    return response;
  };
}
