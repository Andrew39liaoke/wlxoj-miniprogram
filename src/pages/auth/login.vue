<template>
  <view class="login-page">
    <!-- 顶部区域 -->
    <view class="header">
      <view class="logo-area">
        <text class="logo-text">智学OJ</text>
        <text class="sub-text">学生学习平台</text>
      </view>
    </view>

    <!-- 表单区域 -->
    <view class="form-area">
      <view class="form-title">账号登录</view>

      <view class="input-group">
        <view class="input-item">
          <text class="input-label">用户名</text>
          <input
            class="input-field"
            v-model="formData.userName"
            placeholder="请输入用户名"
            placeholder-class="placeholder"
            maxlength="20"
          />
        </view>

        <view class="input-item">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="formData.userPassword"
            placeholder="请输入密码"
            placeholder-class="placeholder"
            password
            maxlength="20"
          />
        </view>
      </view>

      <button class="login-btn" :loading="loading" :disabled="loading" @click="handleLogin">
        登 录
      </button>

      <view class="footer-link">
        <text>没有账号？</text>
        <text class="link" @click="goRegister">去注册</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { post, get } from "../../utils/request";
import { setToken, setLoginUser } from "../../store/user";
import type { LoginUser } from "../../store/user";

const loading = ref(false);

const formData = reactive({
  userName: "",
  userPassword: "",
});

/** 登录 */
async function handleLogin() {
  if (!formData.userName.trim()) {
    uni.showToast({ title: "请输入用户名", icon: "none" });
    return;
  }
  if (!formData.userPassword) {
    uni.showToast({ title: "请输入密码", icon: "none" });
    return;
  }

  loading.value = true;
  try {
    // 1. 调用登录接口
    const loginRes = await post<any>("/api/auth/user/login", {
      userName: formData.userName.trim(),
      userPassword: formData.userPassword,
    });

    const token = loginRes.data?.token;
    if (!token) {
      uni.showToast({ title: "登录异常，未获取到 token", icon: "none" });
      return;
    }

    // 2. 保存 token
    setToken(token);

    // 3. 获取用户信息
    const userRes = await get<LoginUser>("/api/auth/user/get/login");
    const user = userRes.data;

    // 4. 校验角色
    if (user.userRole && user.userRole !== "student") {
      uni.showToast({ title: "当前小程序仅支持学生端", icon: "none", duration: 3000 });
      setToken("");
      return;
    }

    setLoginUser(user);

    // 5. 跳转首页
    uni.switchTab({ url: "/pages/question/list" });
  } catch (err: any) {
    const msg = err?.message || "登录失败，请检查账号密码";
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    loading.value = false;
  }
}

/** 跳转注册页 */
function goRegister() {
  uni.navigateTo({ url: "/pages/auth/register" });
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1890ff 0%, #e6f0ff 40%, #f5f5f5 100%);
  display: flex;
  flex-direction: column;
}

.header {
  padding-top: 180rpx;
  padding-bottom: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-area {
  text-align: center;
}

.logo-text {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #fff;
  letter-spacing: 4rpx;
}

.sub-text {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
}

.form-area {
  margin: 0 40rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 40rpx;
}

.input-group {
  margin-bottom: 40rpx;
}

.input-item {
  margin-bottom: 30rpx;
}

.input-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.input-field {
  width: 100%;
  height: 88rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.placeholder {
  color: #c0c4cc;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  background: #1890ff;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  letter-spacing: 8rpx;
}

.login-btn[disabled] {
  opacity: 0.6;
}

.footer-link {
  text-align: center;
  margin-top: 32rpx;
  font-size: 26rpx;
  color: #999;
}

.link {
  color: #1890ff;
  margin-left: 8rpx;
}
</style>
