/**
 * 统一请求封装
 * 基于 uni.request，自动处理 token、错误、未登录跳转
 */
import { API_BASE, NOT_LOGIN_CODE } from './config';

/** 请求参数 */
export interface RequestOptions {
  /** 请求路径，如 /api/auth/user/login */
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 请求体 */
  data?: any;
  /** query 参数 */
  query?: Record<string, any>;
  /** path 参数，如 { id: 1 } 替换 url 中的 {id} */
  path?: Record<string, string | number>;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 是否跳过登录检查，默认 false */
  skipAuth?: boolean;
}

/** 后端统一响应结构 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * 构建完整 URL：替换 path 参数 + 拼接 query 参数
 */
function buildUrl(
  base: string,
  url: string,
  pathParams?: Record<string, string | number>,
  queryParams?: Record<string, any>
): string {
  let fullUrl = base + url;

  // 替换路径参数 {key}
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      fullUrl = fullUrl.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
  }

  // 拼接 query 参数
  if (queryParams) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(queryParams)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    if (parts.length) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + parts.join('&');
    }
  }

  return fullUrl;
}

/** 正在跳转登录页的标记，防止多次跳转 */
let isRedirectingToLogin = false;

/**
 * 跳转登录页
 */
function redirectToLogin() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  uni.removeStorageSync('token');
  uni.reLaunch({
    url: '/pages/auth/login',
    complete: () => {
      setTimeout(() => {
        isRedirectingToLogin = false;
      }, 1000);
    },
  });
}

/**
 * 统一请求方法
 */
export function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = uni.getStorageSync('token') || '';
  const url = buildUrl(API_BASE, options.url, options.path, options.query);

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        Authorization: token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>;
        if (!body || typeof body.code === 'undefined') {
          reject(new Error('响应格式异常'));
          return;
        }
        // 未登录
        if (body.code === NOT_LOGIN_CODE && !options.skipAuth) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          redirectToLogin();
          reject(body);
          return;
        }
        // 业务错误
        if (body.code !== 0) {
          reject(body);
          return;
        }
        resolve(body);
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

/** GET 快捷方法 */
export function get<T = any>(url: string, query?: Record<string, any>, options?: Partial<RequestOptions>) {
  return request<T>({ url, method: 'GET', query, ...options });
}

/** POST 快捷方法 */
export function post<T = any>(url: string, data?: any, options?: Partial<RequestOptions>) {
  return request<T>({ url, method: 'POST', data, ...options });
}
