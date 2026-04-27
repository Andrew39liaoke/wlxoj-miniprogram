<template>
  <view class="page">
    <!-- 班级选择器 -->
    <view class="class-picker" @tap="showClassPicker = true">
      <text class="picker-label">当前班级：</text>
      <text class="picker-value">{{ currentClass?.name || '请选择班级' }}</text>
      <text class="picker-arrow">▼</text>
    </view>

    <!-- 考试列表 -->
    <view v-if="papers.length > 0" class="paper-list">
      <view
        v-for="paper in papers"
        :key="paper.id"
        class="paper-card"
        @tap="handlePaper(paper)"
      >
        <view class="paper-header">
          <text class="paper-name">{{ paper.paperName || paper.title || '试卷' }}</text>
          <text class="paper-badge" :class="getBadgeClass(paper)">
            {{ getBadgeText(paper) }}
          </text>
        </view>
        <view class="paper-info">
          <text v-if="paper.timeLimit || paper.duration" class="paper-meta">⏱ {{ paper.timeLimit || paper.duration }}分钟</text>
          <text v-if="paper.totalScore" class="paper-meta">📊 满分{{ paper.totalScore }}分</text>
          <text v-if="paper.questionCount" class="paper-meta">📝 {{ paper.questionCount }}题</text>
        </view>
        <view v-if="paper.startTime || paper.endTime" class="paper-time">
          <text class="time-text" v-if="paper.startTime">开始：{{ formatTime(paper.startTime) }}</text>
          <text class="time-text" v-if="paper.endTime">截止：{{ formatTime(paper.endTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty">
      <text class="empty-icon">📝</text>
      <text class="empty-text">{{ currentClass ? '暂无考试' : '请先选择班级' }}</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-box"><text>加载中...</text></view>

    <!-- 班级选择弹窗 -->
    <view v-if="showClassPicker" class="mask" @tap="showClassPicker = false">
      <view class="picker-dialog" @tap.stop>
        <text class="dialog-title">选择班级</text>
        <scroll-view scroll-y class="class-scroll">
          <view
            v-for="c in classList"
            :key="c.id"
            class="class-option"
            :class="{ selected: currentClass?.id === c.id }"
            @tap="selectClass(c)"
          >
            <text class="option-name">{{ c.name }}</text>
            <text class="option-teacher">{{ c.teacherName || '' }}</text>
          </view>
          <view v-if="classList.length === 0" class="empty-tip">暂无班级，请先加入班级</view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { post } from '../../utils/request';
import { isLoggedIn, getLoginUser } from '../../store/user';

interface ClassItem {
  id: number;
  name: string;
  teacherName?: string;
}

interface PaperItem {
  id: number;
  title?: string;
  paperName?: string;
  status?: number;
  statusLabel?: string;
  timeLimit?: number;
  duration?: number;
  totalScore?: number;
  questionCount?: number;
  startTime?: string;
  endTime?: string;
  hasAnswered?: boolean;
  hasSubmitted?: boolean;
  recordId?: number;
}

const classList = ref<ClassItem[]>([]);
const currentClass = ref<ClassItem | null>(null);
const papers = ref<PaperItem[]>([]);
const loading = ref(false);
const showClassPicker = ref(false);

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  loadClasses();
});

async function loadClasses() {
  try {
    const user = getLoginUser();
    const res = await post<any>('/api/auth/class/student/classes', {
      current: 1,
      pageSize: 50,
      studentId: user?.id,
    });
    classList.value = res.data?.records || res.data || [];
    if (classList.value.length > 0 && !currentClass.value) {
      selectClass(classList.value[0]);
    }
  } catch (e) {
    console.error('[loadClasses error]', e);
  }
}

function selectClass(c: ClassItem) {
  currentClass.value = c;
  showClassPicker.value = false;
  loadPapers();
}

async function loadPapers() {
  if (!currentClass.value) return;
  loading.value = true;
  try {
    const res = await post<any>('/api/question/exam/paper/list', {
      classId: currentClass.value.id,
      current: 1,
      pageSize: 50,
    });
    const data = res.data;
    papers.value = Array.isArray(data) ? data : (data?.records || []);
  } catch {
    papers.value = [];
  } finally {
    loading.value = false;
  }
}

function handlePaper(paper: PaperItem) {
  const state = getPaperState(paper);
  // 已完成 → 查看成绩
  if (state === 'done') {
    goResult(paper);
    return;
  }
  // 未开始或草稿
  if (state === 'pending' || state === 'draft') {
    uni.showToast({ title: '考试尚未开始', icon: 'none' });
    return;
  }
  // 已结束
  if (state === 'ended') {
    uni.showToast({ title: '考试已结束', icon: 'none' });
    return;
  }
  // 进行中 → 进入答题
  uni.navigateTo({ url: `/pages/exam/take?paperId=${paper.id}` });
}

async function goResult(paper: PaperItem) {
  // 通过 startExam 接口获取 recordId（后端控制：已答题则返回现有 recordId）
  try {
    uni.showLoading({ title: '加载中...' });
    const res = await post<any>('/api/question/exam/answer/start', undefined, {
      query: { paperId: paper.id },
    });
    uni.hideLoading();
    const recordId = res.data?.id || res.data;
    if (recordId) {
      uni.navigateTo({ url: `/pages/exam/result?recordId=${recordId}` });
    } else {
      uni.showToast({ title: '获取成绩记录失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '请求失败', icon: 'none' });
  }
}

/**
 * 根据 status + 时间 + hasAnswered 综合判断试卷状态
 */
function getPaperState(paper: PaperItem): 'draft' | 'pending' | 'active' | 'ended' | 'done' {
  // 已答题
  if (paper.hasAnswered || paper.hasSubmitted) return 'done';
  // 草稿
  if (paper.status === 0) return 'draft';
  // 已结束（后端标记）
  if (paper.status === 2) return 'ended';
  // 已发布（status===1），根据时间再细分
  const now = Date.now();
  if (paper.endTime && new Date(paper.endTime).getTime() < now) return 'ended';
  if (paper.startTime && new Date(paper.startTime).getTime() > now) return 'pending';
  return 'active';
}

function getBadgeClass(paper: PaperItem) {
  return getPaperState(paper);
}

function getBadgeText(paper: PaperItem) {
  const stateMap: Record<string, string> = {
    draft: '未发布',
    pending: '未开始',
    active: '进行中',
    ended: '已结束',
    done: '已完成',
  };
  return stateMap[getPaperState(paper)] || '未知';
}

function formatTime(t?: string) {
  if (!t) return '';
  return t.substring(0, 16).replace('T', ' ');
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.class-picker {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 24rpx 30rpx;
  margin-bottom: 4rpx;
}

.picker-label {
  font-size: 28rpx;
  color: #666;
}

.picker-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.paper-list {
  padding: 20rpx 30rpx;
}

.paper-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.paper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.paper-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.paper-badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  margin-left: 16rpx;
}

.paper-badge.active {
  background: #f6ffed;
  color: #52c41a;
}

.paper-badge.done {
  background: #e6f7ff;
  color: #1890ff;
}

.paper-badge.pending,
.paper-badge.draft {
  background: #fff7e6;
  color: #faad14;
}

.paper-badge.ended {
  background: #f5f5f5;
  color: #999;
}

.paper-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.paper-meta {
  font-size: 24rpx;
  color: #666;
}

.paper-time {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.time-text {
  font-size: 22rpx;
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
  font-size: 28rpx;
  color: #999;
}

.loading-box {
  text-align: center;
  padding: 40rpx;
  color: #999;
}

/* 弹窗 */
.mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.picker-dialog {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  max-height: 70vh;
}

.dialog-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
  color: #333;
}

.class-scroll {
  max-height: 50vh;
}

.class-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 20rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.class-option.selected {
  background: #e6f7ff;
}

.option-name {
  font-size: 28rpx;
  color: #333;
}

.option-teacher {
  font-size: 24rpx;
  color: #999;
}

.empty-tip {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
