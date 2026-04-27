/**
 * 全局用户状态管理
 * 使用 Vue 3 reactive API
 */
import { reactive } from 'vue';
import { get } from '../utils/request';

/** 登录用户信息 */
export interface LoginUser {
  id?: number;
  userName?: string;
  nickName?: string;
  userAvatar?: string;
  userProfile?: string;
  userRole?: 'student' | 'teacher' | 'admin';
}

/** 全局状态 */
const state = reactive({
  token: '' as string,
  loginUser: {} as LoginUser,
  /** 是否已完成初始化检查 */
  initialized: false,
});

/** 获取当前 token */
export function getToken(): string {
  return state.token;
}

/** 获取当前登录用户 */
export function getLoginUser(): LoginUser {
  return state.loginUser;
}

/** 是否已登录 */
export function isLoggedIn(): boolean {
  return !!state.token && !!state.loginUser.id;
}

/** 是否已初始化 */
export function isInitialized(): boolean {
  return state.initialized;
}

/** 保存 token 到缓存和状态 */
export function setToken(token: string) {
  state.token = token;
  uni.setStorageSync('token', token);
}

/** 设置用户信息 */
export function setLoginUser(user: LoginUser) {
  state.loginUser = user;
}

/** 清理登录态 */
export function clearLogin() {
  state.token = '';
  state.loginUser = {};
  uni.removeStorageSync('token');
}

/** 退出登录并跳转登录页 */
export function logout() {
  // 先调后端退出接口（忽略失败）
  get('/api/auth/user/logout').catch(() => {});
  clearLogin();
  uni.reLaunch({ url: '/pages/auth/login' });
}

/**
 * 启动时检查登录状态
 * 从缓存读取 token，调用 /api/auth/user/get/login 验证
 */
export async function checkLogin(): Promise<boolean> {
  const cachedToken = uni.getStorageSync('token') || '';
  if (!cachedToken) {
    state.initialized = true;
    return false;
  }

  state.token = cachedToken;

  try {
    const res = await get<LoginUser>('/api/auth/user/get/login', undefined, { skipAuth: true });
    const user = res.data;

    // 仅允许学生角色
    if (user.userRole && user.userRole !== 'student') {
      uni.showToast({ title: '当前小程序仅支持学生端', icon: 'none', duration: 3000 });
      clearLogin();
      state.initialized = true;
      return false;
    }

    state.loginUser = user;
    state.initialized = true;
    return true;
  } catch {
    clearLogin();
    state.initialized = true;
    return false;
  }
}
