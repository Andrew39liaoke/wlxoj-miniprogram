<template>
  <view class="page">
    <!-- 顶部信息栏 -->
    <view class="top-bar">
      <view class="top-row">
        <text class="paper-title">{{ paperInfo.title || paperInfo.paperName || '考试答题' }}</text>
        <view class="timer" :class="{ urgent: remainSec < 300 }">
          <text class="timer-text">⏱ {{ formatTimer(remainSec) }}</text>
        </view>
      </view>
      <text class="back-btn" @tap="goBack">← 返回</text>
    </view>

    <!-- 题目导航 -->
    <view class="nav-wrapper">
      <scroll-view scroll-x class="question-nav">
        <view class="nav-inner">
          <view
            v-for="(q, idx) in questions"
            :key="idx"
            class="nav-dot"
            :class="{
              current: currentIdx === idx,
              answered: answers[q.id] !== undefined && answers[q.id] !== ''
            }"
            @tap="currentIdx = idx"
          >{{ idx + 1 }}</view>
        </view>
      </scroll-view>
    </view>

    <!-- 题目内容（可滚动区域） -->
    <scroll-view scroll-y class="question-scroll">
      <view v-if="currentQuestion" class="question-area">
        <view class="q-header">
          <text class="q-index">第 {{ currentIdx + 1 }} / {{ questions.length }} 题</text>
          <text v-if="currentQuestion.score" class="q-score">{{ currentQuestion.score }}分</text>
        </view>
        <view class="q-title-wrap">
          <rich-text :nodes="renderContent(currentQuestion.title)" class="q-title"></rich-text>
        </view>
        <view v-if="currentQuestion.content" class="q-content">
          <rich-text :nodes="renderContent(currentQuestion.content)"></rich-text>
        </view>

        <!-- 选择题选项 -->
        <view v-if="isChoiceQuestion(currentQuestion)" class="options">
          <view
            v-for="(opt, oidx) in getOptions(currentQuestion)"
            :key="oidx"
            class="option-item"
            :class="{ selected: isOptionSelected(currentQuestion, opt.key) }"
            @tap="selectOption(currentQuestion, opt.key)"
          >
            <text class="option-key">{{ opt.key }}</text>
            <text class="option-text">{{ opt.text }}</text>
          </view>
        </view>

        <!-- 编程题/简答题 -->
        <view v-else class="code-area">
          <textarea
            v-model="answers[currentQuestion.id]"
            class="code-input"
            placeholder="请输入你的答案..."
            :maxlength="5000"
          />
        </view>
      </view>

      <view v-else class="empty-question">
        <text class="empty-text">{{ questions.length ? '加载题目中...' : '暂无题目数据' }}</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <text
        class="btn-prev"
        :class="{ disabled: currentIdx === 0 }"
        @tap="prevQuestion"
      >上一题</text>
      <text
        class="btn-submit"
        @tap="submitExam"
      >交卷</text>
      <text
        class="btn-next"
        :class="{ disabled: currentIdx >= questions.length - 1 }"
        @tap="nextQuestion"
      >下一题</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get, post } from '../../utils/request';
import { markdownToHtml } from '../../utils/markdown';

interface ExamQuestion {
  id: number;
  title: string;
  content?: string;
  score?: number;
  questionType?: string;
  options?: string;
}

const paperId = ref(0);
const paperInfo = ref<any>({});
const questions = ref<ExamQuestion[]>([]);
const currentIdx = ref(0);
const answers = ref<Record<number, string>>({});
const remainSec = ref(0);
const recordId = ref(0);
let timer: any = null;

const currentQuestion = computed(() => questions.value[currentIdx.value] || null);

onLoad(async (query: any) => {
  paperId.value = Number(query?.paperId) || 0;
  if (!paperId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    return;
  }
  await loadPaper();
  await startExam();
});

async function loadPaper() {
  try {
    const res = await get<any>(`/api/question/exam/paper/take/${paperId.value}`);
    const data = res.data || {};
    paperInfo.value = data;
    questions.value = data.questions || data.examQuestions || [];
    console.log('[loadPaper] paperInfo:', JSON.stringify(data));
    console.log('[loadPaper] questions count:', questions.value.length);
    // 设置倒计时（兼容 timeLimit / duration）
    const duration = data.timeLimit || data.duration || 60; // 分钟
    remainSec.value = duration * 60;
  } catch (e: any) {
    console.error('[loadPaper error]', e);
    uni.showToast({ title: e?.message || '加载试卷失败', icon: 'none' });
  }
}

async function startExam() {
  try {
    const res = await post<any>('/api/question/exam/answer/start', undefined, {
      query: { paperId: paperId.value },
    });
    recordId.value = res.data?.id || res.data || 0;
    // 开始倒计时
    startTimer();
  } catch (e: any) {
    // 可能已经开始过考试
    console.warn('开始考试:', e?.message);
    startTimer();
  }
}

function startTimer() {
  timer = setInterval(() => {
    if (remainSec.value <= 0) {
      clearInterval(timer);
      submitExam();
      return;
    }
    remainSec.value--;
  }, 1000);
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function formatTimer(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function renderContent(text?: string): string {
  if (!text) return '';
  // 如果包含 Markdown 标记则转换，否则简单换行处理
  if (/[#*`\-\[\]]/.test(text)) {
    return markdownToHtml(text);
  }
  return `<p style="font-size:28rpx;color:#555;line-height:1.8;">${text.replace(/\n/g, '<br/>')}</p>`;
}

function isChoiceQuestion(q: ExamQuestion) {
  if (!q) return false;
  const type = (q.questionType || '').toLowerCase();
  return type.includes('choice') || type.includes('single') || type.includes('multi') || type.includes('选择') || !!q.options;
}

function isOptionSelected(q: ExamQuestion, key: string) {
  const val = answers.value[q.id];
  if (!val) return false;
  // 多选题：逗号分隔
  if (val.includes(',')) return val.split(',').includes(key);
  return val === key;
}

function selectOption(q: ExamQuestion, key: string) {
  const type = (q.questionType || '').toLowerCase();
  const isMulti = type.includes('multi') || type.includes('多选');
  if (isMulti) {
    // 多选：切换
    const current = answers.value[q.id] ? answers.value[q.id].split(',') : [];
    const idx = current.indexOf(key);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(key);
    current.sort();
    answers.value[q.id] = current.join(',');
  } else {
    answers.value[q.id] = key;
  }
}

function getOptions(q: ExamQuestion) {
  if (!q.options) return [];
  try {
    const parsed = JSON.parse(q.options);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        key: item.key || String.fromCharCode(65 + idx),
        text: item.text || item.value || item,
      }));
    }
  } catch {}
  return [];
}

function goBack() {
  uni.showModal({
    title: '提示',
    content: '确定要退出答题吗？答题进度不会保存。',
    success: (res) => {
      if (res.confirm) {
        if (timer) clearInterval(timer);
        uni.navigateBack();
      }
    },
  });
}

function prevQuestion() {
  if (currentIdx.value > 0) currentIdx.value--;
}

function nextQuestion() {
  if (currentIdx.value < questions.length - 1) currentIdx.value++;
}

async function submitExam() {
  const answeredCount = Object.values(answers.value).filter(v => v !== undefined && v !== '').length;
  const total = questions.value.length;

  uni.showModal({
    title: '确认交卷',
    content: `已答 ${answeredCount}/${total} 题，确定提交吗？`,
    success: async (res) => {
      if (!res.confirm) return;

      if (timer) clearInterval(timer);

      // 构建提交数据
      const answerList = questions.value.map(q => ({
        questionId: q.id,
        answer: answers.value[q.id] || '',
      }));

      try {
        const submitRes = await post<any>('/api/question/exam/answer/submit', {
          recordId: recordId.value,
          paperId: paperId.value,
          answers: answerList,
        });
        const resRecordId = submitRes.data?.id || submitRes.data || recordId.value;
        uni.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => {
          uni.redirectTo({ url: `/pages/exam/result?recordId=${resRecordId}` });
        }, 1000);
      } catch (e: any) {
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
      }
    },
  });
}
</script>

<style scoped>
.page {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  display: flex;
  flex-direction: column;
  padding: 16rpx 24rpx;
  background: #fff;
  flex-shrink: 0;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  font-size: 26rpx;
  color: #1890ff;
  padding: 8rpx 0;
}

.paper-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.timer {
  background: #e6f7ff;
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.timer.urgent {
  background: #fff1f0;
}

.timer-text {
  font-size: 28rpx;
  color: #1890ff;
  font-weight: bold;
  font-family: monospace;
}

.timer.urgent .timer-text {
  color: #ff4d4f;
}

/* 题目导航 */
.nav-wrapper {
  background: #fff;
  border-top: 2rpx solid #f0f0f0;
  flex-shrink: 0;
}

.question-nav {
  padding: 16rpx 20rpx;
  white-space: nowrap;
}

.nav-inner {
  display: inline-flex;
  gap: 12rpx;
}

.nav-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  font-size: 24rpx;
  color: #999;
  background: #f5f5f5;
  flex-shrink: 0;
}

.nav-dot.current {
  background: #1890ff;
  color: #fff;
}

.nav-dot.answered {
  background: #52c41a;
  color: #fff;
}

.nav-dot.current.answered {
  background: #1890ff;
}

/* 题目滚动区域 */
.question-scroll {
  flex: 1;
  overflow: hidden;
}

.question-area {
  padding: 30rpx;
}

.empty-question {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 200rpx;
}

.empty-question .empty-text {
  font-size: 28rpx;
  color: #999;
}

.q-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.q-index {
  font-size: 26rpx;
  color: #999;
}

.q-score {
  font-size: 26rpx;
  color: #faad14;
  font-weight: bold;
}

.q-title-wrap {
  margin-bottom: 20rpx;
}

.q-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.6;
}

.q-content {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
  font-size: 28rpx;
  color: #555;
  line-height: 1.6;
}

/* 选项 */
.options {
  margin-top: 20rpx;
}

.option-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid #eee;
}

.option-item.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.option-key {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #666;
  margin-right: 20rpx;
  text-align: center;
  line-height: 56rpx;
}

.option-item.selected .option-key {
  background: #1890ff;
  color: #fff;
}

.option-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

/* 编程题/简答 */
.code-area {
  margin-top: 20rpx;
}

.code-input {
  width: 100%;
  min-height: 300rpx;
  background: #fff;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  font-family: monospace;
  box-sizing: border-box;
  line-height: 1.6;
}

/* 底部操作栏 */
.bottom-bar {
  display: flex;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
  gap: 20rpx;
}

.btn-prev,
.btn-next,
.btn-submit {
  flex: 1;
  text-align: center;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.btn-prev,
.btn-next {
  background: #f5f5f5;
  color: #333;
}

.btn-prev.disabled,
.btn-next.disabled {
  color: #ccc;
}

.btn-submit {
  background: #1890ff;
  color: #fff;
}
</style>
