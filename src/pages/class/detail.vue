<template>
  <view class="page">
    <!-- 班级信息头 -->
    <view class="info-header">
      <text class="class-name">{{ classInfo.name || '班级详情' }}</text>
      <view class="info-row">
        <text class="info-label">教师：{{ classInfo.teacherName || '-' }}</text>
        <text class="info-label">{{ classInfo.joinNumber || 0 }}人</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <text
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >{{ tab.label }}</text>
    </view>

    <!-- 成员列表 -->
    <view v-if="activeTab === 'members'" class="tab-content">
      <view v-for="s in students" :key="s.id" class="member-item">
        <image
          class="member-avatar"
          :src="s.userAvatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <view class="member-info">
          <text class="member-name">{{ s.nickName || s.userName || '未知' }}</text>
          <text class="member-role">{{ s.userRole === 'teacher' ? '教师' : '学生' }}</text>
        </view>
      </view>
      <view v-if="students.length === 0 && !loading" class="empty-tip">暂无成员</view>
      <view v-if="hasMoreStudents" class="load-more" @tap="loadStudents">加载更多</view>
    </view>

    <!-- 题目列表 -->
    <view v-if="activeTab === 'questions'" class="tab-content">
      <view
        v-for="q in questions"
        :key="q.id"
        class="question-item"
        @tap="goQuestion(q.id)"
      >
        <text class="q-title">{{ q.title }}</text>
        <view class="q-meta">
          <text class="q-tags" v-if="q.tags">{{ formatTags(q.tags) }}</text>
          <text class="q-stat">通过率 {{ getRate(q) }}%</text>
        </view>
      </view>
      <view v-if="questions.length === 0 && !loading" class="empty-tip">暂无题目</view>
      <view v-if="hasMoreQuestions" class="load-more" @tap="loadQuestions">加载更多</view>
    </view>

    <!-- 知识库 -->
    <view v-if="activeTab === 'knowledge'" class="tab-content">
      <view v-for="(k, idx) in knowledgeList" :key="idx" class="knowledge-item">
        <text class="k-icon">📄</text>
        <text class="k-name">{{ k.fileName || k.name || '文件' }}</text>
      </view>
      <view v-if="knowledgeList.length === 0 && !loading" class="empty-tip">暂无知识库文件</view>
    </view>

    <!-- 考试入口 -->
    <view v-if="activeTab === 'exams'" class="tab-content">
      <view
        v-for="paper in papers"
        :key="paper.id"
        class="exam-card"
        @tap="goExam(paper)"
      >
        <view class="exam-header">
          <text class="exam-name">{{ paper.paperName || paper.title || '试卷' }}</text>
          <text class="exam-status" :class="paper.status === 1 ? 'published' : 'draft'">
            {{ paper.status === 1 ? '进行中' : '未开始' }}
          </text>
        </view>
        <view class="exam-meta">
          <text v-if="paper.duration">时长 {{ paper.duration }}分钟</text>
          <text v-if="paper.totalScore">满分 {{ paper.totalScore }}分</text>
        </view>
      </view>
      <view v-if="papers.length === 0 && !loading" class="empty-tip">暂无考试</view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-box"><text>加载中...</text></view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <text class="chat-btn" @tap="goChat">班级聊天</text>
      <text class="quit-btn" @tap="quitClass">退出班级</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get, post } from '../../utils/request';
import { getLoginUser } from '../../store/user';

const tabs = [
  { key: 'members', label: '成员' },
  { key: 'questions', label: '题目' },
  { key: 'exams', label: '考试' },
  { key: 'knowledge', label: '知识库' },
];

const activeTab = ref('members');
const classId = ref(0);
const classInfo = ref<any>({});
const loading = ref(false);

// 成员
const students = ref<any[]>([]);
const studentPage = ref(1);
const hasMoreStudents = ref(false);

// 题目
const questions = ref<any[]>([]);
const questionPage = ref(1);
const hasMoreQuestions = ref(false);

// 知识库
const knowledgeList = ref<any[]>([]);

// 考试试卷
const papers = ref<any[]>([]);

onLoad((query: any) => {
  classId.value = Number(query?.id) || 0;
  if (classId.value) {
    loadAll();
  }
});

async function loadAll() {
  loading.value = true;
  await Promise.all([
    loadStudents(),
    loadQuestions(),
    loadKnowledge(),
    loadPapers(),
  ]);
  loading.value = false;
}

async function loadStudents() {
  try {
    const res = await post<any>('/api/auth/class/student/page', {
      classId: classId.value,
      current: studentPage.value,
      pageSize: 20,
    });
    const records = res.data?.records || [];
    if (studentPage.value === 1) {
      students.value = records;
      // 从第一个成员推断班级信息（如果没有单独获取接口）
    } else {
      students.value.push(...records);
    }
    hasMoreStudents.value = records.length >= 20;
    studentPage.value++;
  } catch {}
}

async function loadQuestions() {
  try {
    const res = await post<any>('/api/auth/class/question/page', {
      classId: classId.value,
      current: questionPage.value,
      pageSize: 20,
    });
    const records = res.data?.records || [];
    if (questionPage.value === 1) {
      questions.value = records;
    } else {
      questions.value.push(...records);
    }
    hasMoreQuestions.value = records.length >= 20;
    questionPage.value++;
  } catch {}
}

async function loadKnowledge() {
  try {
    const res = await get<any[]>('/api/auth/class/knowledge/list', {
      classId: classId.value,
    });
    knowledgeList.value = res.data || [];
  } catch {}
}

async function loadPapers() {
  try {
    const res = await post<any>('/api/question/exam/paper/list', {
      classId: classId.value,
      current: 1,
      pageSize: 50,
    });
    const records = res.data?.records || res.data || [];
    papers.value = Array.isArray(records) ? records : [];
    // 尝试从第一条数据获取班级名
    if (!classInfo.value.name && papers.value.length > 0) {
      classInfo.value.name = papers.value[0].className || '';
    }
  } catch {}
}

// 从学生列表中推断班级信息的补充方法
async function loadClassInfo() {
  // 尝试获取班级信息
  try {
    const res = await post<any[]>('/api/auth/class/student/classes', {
      current: 1,
      pageSize: 50,
    });
    const list = res.data || [];
    const found = list.find((c: any) => c.id === classId.value);
    if (found) {
      classInfo.value = found;
    }
  } catch {}
}

onMounted(() => {
  loadClassInfo();
});

function goQuestion(id: number) {
  uni.navigateTo({ url: `/pages/question/detail?id=${id}` });
}

function goExam(paper: any) {
  if (paper.status !== 1) {
    uni.showToast({ title: '考试尚未开始', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/exam/take?paperId=${paper.id}` });
}

function goChat() {
  uni.navigateTo({
    url: `/pages/class/chat?id=${classId.value}&name=${encodeURIComponent(classInfo.value.name || '班级聊天')}`,
  });
}

async function quitClass() {
  uni.showModal({
    title: '提示',
    content: '确定退出该班级吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await post('/api/auth/class/quit', { classId: classId.value });
          uni.showToast({ title: '已退出', icon: 'success' });
          setTimeout(() => uni.navigateBack(), 1000);
        } catch (e: any) {
          uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
        }
      }
    },
  });
}

function formatTags(tags: any) {
  if (typeof tags === 'string') {
    try { return JSON.parse(tags).join(' / '); } catch { return tags; }
  }
  if (Array.isArray(tags)) return tags.join(' / ');
  return '';
}

function getRate(q: any) {
  if (!q.submitNum || q.submitNum === 0) return 0;
  return Math.round((q.acceptedNum || 0) / q.submitNum * 100);
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.info-header {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  padding: 40rpx 30rpx;
  color: #fff;
}

.class-name {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.info-row {
  display: flex;
  gap: 30rpx;
}

.info-label {
  font-size: 26rpx;
  opacity: 0.9;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 2rpx solid #eee;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #1890ff;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 30%;
  right: 30%;
  height: 4rpx;
  background: #1890ff;
  border-radius: 2rpx;
}

.tab-content {
  padding: 20rpx 30rpx;
}

/* 成员 */
.member-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.member-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  background: #eee;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.member-role {
  font-size: 24rpx;
  color: #999;
}

/* 题目 */
.question-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.q-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.q-meta {
  display: flex;
  justify-content: space-between;
}

.q-tags {
  font-size: 24rpx;
  color: #1890ff;
}

.q-stat {
  font-size: 24rpx;
  color: #999;
}

/* 知识库 */
.knowledge-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.k-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.k-name {
  font-size: 28rpx;
  color: #333;
}

/* 考试 */
.exam-card {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.exam-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.exam-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.exam-status.published {
  background: #f6ffed;
  color: #52c41a;
}

.exam-status.draft {
  background: #fff7e6;
  color: #faad14;
}

.exam-meta {
  display: flex;
  gap: 30rpx;
  font-size: 24rpx;
  color: #999;
}

.empty-tip {
  text-align: center;
  padding: 60rpx;
  color: #999;
  font-size: 28rpx;
}

.load-more {
  text-align: center;
  padding: 20rpx;
  color: #1890ff;
  font-size: 26rpx;
}

.loading-box {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 20rpx;
}

.chat-btn {
  flex: 2;
  text-align: center;
  padding: 20rpx;
  color: #fff;
  background: #1890ff;
  font-size: 28rpx;
  border-radius: 12rpx;
}

.quit-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  color: #ff4d4f;
  font-size: 28rpx;
  border: 2rpx solid #ff4d4f;
  border-radius: 12rpx;
}
</style>
