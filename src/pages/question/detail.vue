<template>
  <view class="detail-page" v-if="question">
    <!-- 标题区 -->
    <view class="title-area">
      <text class="title">{{ question.title }}</text>
      <view class="tags" v-if="question.tags?.length">
        <text v-for="t in question.tags" :key="t" class="tag">{{ t }}</text>
      </view>
      <view class="meta">
        <text class="meta-item">提交 {{ question.submitNum || 0 }}</text>
        <text class="meta-item">通过 {{ question.acceptedNum || 0 }}</text>
        <text class="meta-item rate" v-if="question.submitNum">
          通过率 {{ Math.round(((question.acceptedNum || 0) / question.submitNum) * 100) }}%
        </text>
      </view>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <view class="action-item" @click="toggleThumb">
        <text :class="['action-icon', { active: hasThumb }]">👍</text>
        <text class="action-text">{{ question.thumbNum || 0 }}</text>
      </view>
      <view class="action-item" @click="toggleFavour">
        <text :class="['action-icon', { active: hasFavour }]">⭐</text>
        <text class="action-text">{{ question.favourNum || 0 }}</text>
      </view>
    </view>

    <!-- 题目内容 -->
    <view class="section">
      <view class="section-title">题目描述</view>
      <view class="section-content">
        <rich-text :nodes="contentHtml"></rich-text>
      </view>
    </view>

    <!-- 判题限制 -->
    <view class="section" v-if="question.judgeConfig">
      <view class="section-title">判题限制</view>
      <view class="limit-list">
        <view class="limit-item" v-if="question.judgeConfig.timeLimit">
          <text class="limit-label">时间限制</text>
          <text class="limit-value">{{ question.judgeConfig.timeLimit }} ms</text>
        </view>
        <view class="limit-item" v-if="question.judgeConfig.memoryLimit">
          <text class="limit-label">内存限制</text>
          <text class="limit-value">{{ question.judgeConfig.memoryLimit }} KB</text>
        </view>
        <view class="limit-item" v-if="question.judgeConfig.stackLimit">
          <text class="limit-label">栈限制</text>
          <text class="limit-value">{{ question.judgeConfig.stackLimit }} KB</text>
        </view>
      </view>
    </view>

    <!-- 样例 -->
    <view class="section" v-if="question.judgeCase?.length">
      <view class="section-title">示例</view>
      <view v-for="(c, idx) in question.judgeCase" :key="idx" class="sample">
        <view class="sample-block">
          <text class="sample-label">输入</text>
          <view class="sample-code"><text>{{ c.input }}</text></view>
        </view>
        <view class="sample-block">
          <text class="sample-label">输出</text>
          <view class="sample-code"><text>{{ c.output }}</text></view>
        </view>
      </view>
    </view>

    <!-- 题解 -->
    <view class="section" v-if="question.answer">
      <view class="section-title">官方题解</view>
      <view class="section-content">
        <rich-text :nodes="answerHtml"></rich-text>
      </view>
    </view>
  </view>

  <view class="loading-page" v-else>
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { get, post, request } from "../../utils/request";
import { markdownToHtml } from "../../utils/markdown";

interface JudgeConfig {
  timeLimit?: number;
  memoryLimit?: number;
  stackLimit?: number;
}

interface JudgeCase {
  input?: string;
  output?: string;
}

interface QuestionVO {
  id?: number;
  title?: string;
  content?: string;
  answer?: string;
  tags?: string[];
  submitNum?: number;
  acceptedNum?: number;
  judgeConfig?: JudgeConfig;
  thumbNum?: number;
  favourNum?: number;
  judgeCase?: JudgeCase[];
}

const question = ref<QuestionVO | null>(null);
const hasThumb = ref(false);
const hasFavour = ref(false);
let questionId = 0;

// Markdown 转 HTML
const contentHtml = computed(() => {
  return markdownToHtml(question.value?.content || '') || '暂无描述';
});
const answerHtml = computed(() => {
  return markdownToHtml(question.value?.answer || '');
});

onLoad((options: any) => {
  questionId = Number(options?.id || 0);
  if (questionId) {
    loadQuestion();
    loadActionStatus();
  }
});

async function loadQuestion() {
  try {
    const res = await get<QuestionVO>("/api/question/get/vo", { id: questionId });
    question.value = res.data;
  } catch (err: any) {
    uni.showToast({ title: err?.message || "加载失败", icon: "none" });
  }
}

async function loadActionStatus() {
  try {
    const res = await post<any>("/api/question/action/status", {
      questionIds: [questionId],
    });
    if (res.data) {
      hasThumb.value = !!res.data.thumbIds?.includes(questionId);
      hasFavour.value = !!res.data.favourIds?.includes(questionId);
    }
  } catch {
    // 忽略
  }
}

async function toggleThumb() {
  try {
    if (hasThumb.value) {
      await request({ url: "/api/question/question/thumb/remove", method: "DELETE", data: { id: questionId } });
      hasThumb.value = false;
      if (question.value) question.value.thumbNum = (question.value.thumbNum || 1) - 1;
    } else {
      await post("/api/question/question/thumb/save", { id: questionId });
      hasThumb.value = true;
      if (question.value) question.value.thumbNum = (question.value.thumbNum || 0) + 1;
    }
  } catch {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

async function toggleFavour() {
  try {
    if (hasFavour.value) {
      await request({ url: "/api/question/question/favour/remove", method: "DELETE", data: { id: questionId } });
      hasFavour.value = false;
      if (question.value) question.value.favourNum = (question.value.favourNum || 1) - 1;
    } else {
      await post("/api/question/question/favour/save", { id: questionId });
      hasFavour.value = true;
      if (question.value) question.value.favourNum = (question.value.favourNum || 0) + 1;
    }
  } catch {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}
</script>

<style scoped>
.detail-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.title-area {
  background: #fff;
  padding: 32rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tag {
  font-size: 22rpx;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.meta {
  display: flex;
  gap: 24rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.meta-item.rate {
  color: #52c41a;
}

.action-bar {
  background: #fff;
  margin-top: 2rpx;
  padding: 20rpx 32rpx;
  display: flex;
  gap: 48rpx;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 32rpx;
  opacity: 0.5;
}

.action-icon.active {
  opacity: 1;
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

.section {
  background: #fff;
  margin-top: 16rpx;
  padding: 28rpx 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1890ff;
}

.section-content {
  font-size: 28rpx;
  color: #555;
  line-height: 1.8;
}

.limit-list {
  display: flex;
  gap: 32rpx;
}

.limit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f7f8fa;
  padding: 20rpx 32rpx;
  border-radius: 12rpx;
}

.limit-label {
  font-size: 22rpx;
  color: #999;
}

.limit-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-top: 8rpx;
}

.sample {
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.sample:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.sample-block {
  margin-bottom: 12rpx;
}

.sample-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.sample-code {
  background: #f7f8fa;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  font-family: monospace;
  word-break: break-all;
}

.loading-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: #999;
}
</style>
