<template>
  <view class="page">
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <view class="join-box" @tap="showJoinDialog = true">
        <text class="join-icon">+</text>
        <text class="join-text">加入班级</text>
      </view>
    </view>

    <!-- 班级列表 -->
    <view v-if="classList.length > 0" class="class-list">
      <view
        v-for="item in classList"
        :key="item.id"
        class="class-card"
        @tap="goDetail(item.id)"
      >
        <view class="card-header">
          <text class="class-name">{{ item.name }}</text>
          <text class="member-count">{{ item.joinNumber || 0 }}人</text>
        </view>
        <view class="card-body">
          <text class="teacher-name">教师：{{ item.teacherName || '未知' }}</text>
          <text class="create-time">{{ formatDate(item.createTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty">
      <text class="empty-icon">📚</text>
      <text class="empty-text">暂未加入任何班级</text>
      <text class="empty-hint">请输入邀请码加入班级</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-box">
      <text>加载中...</text>
    </view>

    <!-- 加入班级弹窗 -->
    <view v-if="showJoinDialog" class="mask" @tap="showJoinDialog = false">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">加入班级</text>
        <input
          v-model="invitationCode"
          class="dialog-input"
          placeholder="请输入邀请码"
          maxlength="20"
        />
        <view class="dialog-btns">
          <text class="btn-cancel" @tap="showJoinDialog = false">取消</text>
          <text class="btn-confirm" @tap="joinClass">确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { post } from '../../utils/request';
import { isLoggedIn, getLoginUser } from '../../store/user';

interface ClassVO {
  id: number;
  name: string;
  teacherId?: number;
  teacherName?: string;
  invitationCode?: string;
  joinNumber?: number;
  createTime?: string;
  updateTime?: string;
}

const classList = ref<ClassVO[]>([]);
const loading = ref(false);
const showJoinDialog = ref(false);
const invitationCode = ref('');

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  loadClasses();
});

async function loadClasses() {
  loading.value = true;
  try {
    const user = getLoginUser();
    const res = await post<ClassVO[]>('/api/auth/class/student/classes', {
      current: 1,
      pageSize: 50,
      studentId: user?.id,
    });
    classList.value = res.data?.records || res.data || [];
  } catch (e: any) {
    if (e?.code !== 40100) {
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function joinClass() {
  const code = invitationCode.value.trim();
  if (!code) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' });
    return;
  }
  try {
    await post('/api/auth/class/join', undefined, {
      query: { invitationCode: code },
    });
    uni.showToast({ title: '加入成功', icon: 'success' });
    showJoinDialog.value = false;
    invitationCode.value = '';
    loadClasses();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加入失败', icon: 'none' });
  }
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/class/detail?id=${id}` });
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20rpx;
}

.top-bar {
  padding: 20rpx 30rpx;
  background: #fff;
}

.join-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  background: #e6f7ff;
  border-radius: 12rpx;
  border: 2rpx dashed #1890ff;
}

.join-icon {
  font-size: 36rpx;
  color: #1890ff;
  margin-right: 10rpx;
  font-weight: bold;
}

.join-text {
  font-size: 28rpx;
  color: #1890ff;
}

.class-list {
  padding: 20rpx 30rpx;
}

.class-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.class-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-count {
  font-size: 24rpx;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  margin-left: 16rpx;
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.teacher-name {
  font-size: 26rpx;
  color: #666;
}

.create-time {
  font-size: 24rpx;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
}

.loading-box {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}

/* 弹窗 */
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
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}

.dialog-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #333;
}

.dialog-input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  margin-bottom: 30rpx;
}

.dialog-btns {
  display: flex;
  gap: 20rpx;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  text-align: center;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #1890ff;
  color: #fff;
}
</style>
