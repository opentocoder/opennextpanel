import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 带认证检查的 fetch wrapper
 * 当 API 返回 401 时自动跳转到登录页
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    // 认证过期，跳转到登录页
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('认证已过期，请重新登录');
  }

  return response;
}

/**
 * 带认证检查的 JSON fetch
 * 自动处理 401 并解析 JSON
 */
export async function fetchJSON<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await authFetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
