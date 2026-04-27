<template>
  <view class="register-page">
    <!-- 顶部区域 -->
    <view class="header">
      <view class="logo-area">
        <text class="logo-text">智学OJ</text>
        <text class="sub-text">创建学生账号</text>
      </view>
    </view>

    <!-- 表单区域 -->
    <view class="form-area">
      <view class="form-title">账号注册</view>

      <view class="input-group">
        <view class="input-item">
          <text class="input-label">用户名</text>
          <input
            class="input-field"
            v-model="formData.userName"
            placeholder="请输入用户名（4-20位）"
            placeholder-class="placeholder"
            maxlength="20"
          />
        </view>

        <view class="input-item">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="formData.userPassword"
            placeholder="请输入密码（8位以上）"
            placeholder-class="placeholder"
            password
            maxlength="20"
          />
        </view>

        <view class="input-item">
          <text class="input-label">确认密码</text>
          <input
            class="input-field"
            v-model="formData.checkPassword"
            placeholder="请再次输入密码"
            placeholder-class="placeholder"
            password
            maxlength="20"
          />
        </view>
      </view>

      <button class="register-btn" :loading="loading" :disabled="loading" @click="handleRegister">
        注 册
      </button>

      <view class="footer-link">
        <text>已有账号？</text>
        <text class="link" @click="goLogin">去登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { post } from "../../utils/request";

const loading = ref(false);

const formData = reactive({
  userName: "",
  userPassword: "",
  checkPassword: "",
});

/** 注册 */
async function handleRegister() {
  if (!formData.userName.trim()) {
    uni.showToast({ title: "请输入用户名", icon: "none" });
    return;
  }
  if (formData.userName.trim().length < 4) {
    uni.showToast({ title: "用户名至少4位", icon: "none" });
    return;
  }
  if (!formData.userPassword || formData.userPassword.length < 8) {
    uni.showToast({ title: "密码至少8位", icon: "none" });
    return;
  }
  if (formData.userPassword !== formData.checkPassword) {
    uni.showToast({ title: "两次密码不一致", icon: "none" });
    return;
  }

  loading.value = true;
  try {
    await post("/api/auth/user/register", {
      userName: formData.userName.trim(),
      userPassword: formData.userPassword,
      checkPassword: formData.checkPassword,
    });

    uni.showToast({ title: "注册成功", icon: "success" });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err: any) {
    const msg = err?.message || "注册失败";
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    loading.value = false;
  }
}

/** 跳转登录页 */
function goLogin() {
  uni.navigateBack();
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1890ff 0%, #e6f0ff 40%, #f5f5f5 100%);
  display: flex;
  flex-direction: column;
}

.header {
  padding-top: 140rpx;
  padding-bottom: 60rpx;
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

.register-btn {
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

.register-btn[disabled] {
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
