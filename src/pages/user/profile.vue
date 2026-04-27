<template>
  <view class="profile-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="avatar-area" @click="changeAvatar">
        <image
          class="avatar"
          :src="loginUser.userAvatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <text class="avatar-tip">点击更换</text>
      </view>
      <view class="user-info">
        <text class="nick-name">{{ loginUser.nickName || loginUser.userName || '未登录' }}</text>
        <text class="user-name">@{{ loginUser.userName || '-' }}</text>
      </view>
    </view>

    <!-- 个人资料区 -->
    <view class="section">
      <view class="section-title">个人资料</view>

      <view class="info-item" @click="editNickName">
        <text class="info-label">昵称</text>
        <view class="info-right">
          <text class="info-value">{{ loginUser.nickName || '未设置' }}</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="info-item" @click="editProfile">
        <text class="info-label">简介</text>
        <view class="info-right">
          <text class="info-value text-ellipsis">{{ loginUser.userProfile || '未设置' }}</text>
          <text class="arrow">></text>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="section">
      <view class="section-title">学习</view>

      <view class="menu-item" @click="goTo('/pages/recommend/index')">
        <text class="menu-text">个性化推荐</text>
        <text class="arrow">></text>
      </view>

      <view class="menu-item" @click="goTo('/pages/ai/chat')">
        <text class="menu-text">AI 助手</text>
        <text class="arrow">></text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-area">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>

    <!-- 编辑昵称弹窗 -->
    <view class="mask" v-if="showNickNameDialog" @click="showNickNameDialog = false">
      <view class="dialog" @click.stop>
        <text class="dialog-title">修改昵称</text>
        <input
          class="dialog-input"
          v-model="editForm.nickName"
          placeholder="请输入新昵称"
          maxlength="20"
          :focus="showNickNameDialog"
        />
        <view class="dialog-btns">
          <button class="dialog-btn cancel" @click="showNickNameDialog = false">取消</button>
          <button class="dialog-btn confirm" @click="saveNickName">确定</button>
        </view>
      </view>
    </view>

    <!-- 编辑简介弹窗 -->
    <view class="mask" v-if="showProfileDialog" @click="showProfileDialog = false">
      <view class="dialog" @click.stop>
        <text class="dialog-title">修改简介</text>
        <textarea
          class="dialog-textarea"
          v-model="editForm.userProfile"
          placeholder="请输入个人简介"
          maxlength="200"
          :focus="showProfileDialog"
        />
        <view class="dialog-btns">
          <button class="dialog-btn cancel" @click="showProfileDialog = false">取消</button>
          <button class="dialog-btn confirm" @click="saveProfile">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getLoginUser, setLoginUser, logout, isLoggedIn } from "../../store/user";
import { get, post } from "../../utils/request";
import { chooseAndUpload } from "../../utils/upload";
import type { LoginUser } from "../../store/user";

const showNickNameDialog = ref(false);
const showProfileDialog = ref(false);

const editForm = reactive({
  nickName: "",
  userProfile: "",
});

const loginUser = computed(() => getLoginUser());

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: "/pages/auth/login" });
    return;
  }
  refreshUser();
});

async function refreshUser() {
  try {
    const res = await get<LoginUser>("/api/auth/user/get/login");
    setLoginUser(res.data);
  } catch {
    // 忽略
  }
}

/** 更换头像 */
async function changeAvatar() {
  try {
    const results = await chooseAndUpload("avatar", 1);
    if (results.length > 0) {
      await post("/api/auth/user/update/my", {
        userAvatar: results[0].url,
      });
      await refreshUser();
      uni.showToast({ title: "头像更新成功", icon: "success" });
    }
  } catch {
    // 用户取消或上传失败
  }
}

/** 编辑昵称 */
function editNickName() {
  editForm.nickName = loginUser.value.nickName || "";
  showNickNameDialog.value = true;
}

async function saveNickName() {
  if (!editForm.nickName.trim()) {
    uni.showToast({ title: "昵称不能为空", icon: "none" });
    return;
  }
  try {
    await post("/api/auth/user/update/my", {
      nickName: editForm.nickName.trim(),
    });
    await refreshUser();
    showNickNameDialog.value = false;
    uni.showToast({ title: "修改成功", icon: "success" });
  } catch (err: any) {
    uni.showToast({ title: err?.message || "修改失败", icon: "none" });
  }
}

/** 编辑简介 */
function editProfile() {
  editForm.userProfile = loginUser.value.userProfile || "";
  showProfileDialog.value = true;
}

async function saveProfile() {
  try {
    await post("/api/auth/user/update/my", {
      userProfile: editForm.userProfile.trim(),
    });
    await refreshUser();
    showProfileDialog.value = false;
    uni.showToast({ title: "修改成功", icon: "success" });
  } catch (err: any) {
    uni.showToast({ title: err?.message || "修改失败", icon: "none" });
  }
}

/** 退出登录 */
function handleLogout() {
  uni.showModal({
    title: "提示",
    content: "确定退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        logout();
      }
    },
  });
}

/** 页面跳转 */
function goTo(url: string) {
  uni.navigateTo({ url });
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.user-card {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  padding: 60rpx 40rpx 40rpx;
  display: flex;
  align-items: center;
}

.avatar-area {
  position: relative;
  margin-right: 30rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  background: #e8e8e8;
}

.avatar-tip {
  display: block;
  text-align: center;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}

.user-info {
  flex: 1;
}

.nick-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.user-name {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}

.section {
  margin: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.section-title {
  padding: 24rpx 30rpx 12rpx;
  font-size: 26rpx;
  color: #999;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.info-right {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
}

.info-value {
  font-size: 28rpx;
  color: #999;
  max-width: 400rpx;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
  margin-left: 12rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  font-size: 28rpx;
  color: #333;
}

.menu-tag {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.logout-area {
  margin: 40rpx 24rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background: #fff;
  color: #ff4d4f;
  font-size: 30rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

/* 弹窗遮罩 */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog {
  width: 580rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}

.dialog-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.dialog-input {
  width: 100%;
  height: 80rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.dialog-textarea {
  width: 100%;
  height: 200rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.dialog-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.dialog-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.dialog-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.dialog-btn.confirm {
  background: #1890ff;
  color: #fff;
}
</style>
