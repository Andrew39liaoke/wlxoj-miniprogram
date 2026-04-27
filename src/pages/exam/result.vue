<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">努力加载数据中...</text>
    </view>

    <template v-else-if="report || result.details.length">
      <!-- 成绩卡片 -->
      <view class="score-card">
        <text class="score-label">总分</text>
        <view class="score-big">
          <text class="score-value">{{ report?.totalScore ?? result.totalScore ?? '-' }}</text>
          <text class="score-full">/ {{ report?.totalFullScore ?? result.fullScore ?? '?' }}</text>
        </view>
        <view class="score-progress" v-if="report?.accuracyRate != null">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: (report.accuracyRate * 100) + '%', background: report.accuracyRate >= 0.6 ? '#52c41a' : '#ff4d4f' }" />
          </view>
          <text class="progress-text">{{ (report.accuracyRate * 100).toFixed(1) }}%</text>
        </view>
        <view class="score-stats">
          <view class="stat-item">
            <text class="stat-num">{{ ((report?.accuracyRate || 0) * 100).toFixed(1) }}%</text>
            <text class="stat-label">正确率</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-num">{{ result.correctCount ?? '-' }}</text>
            <text class="stat-label">正确</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-num">{{ formatTimeSpent(report?.timeSpent) }}</text>
            <text class="stat-label">用时</text>
          </view>
        </view>
      </view>

      <!-- 知识点掌握度分析 -->
      <view v-if="report?.knowledgeAbilities?.length" class="section">
        <text class="section-title">知识点掌握度</text>
        <view class="ability-list">
          <view v-for="ka in report.knowledgeAbilities" :key="ka.knowledgeId" class="ability-item">
            <view class="ability-header">
              <text class="ability-name">{{ ka.knowledgeName }}</text>
              <text class="ability-tag" :class="'level-' + ka.masteryLevel">{{ ka.masteryLabel }}</text>
            </view>
            <view class="ability-bar">
              <view class="ability-fill" :style="{ width: ((ka.masteryRate || 0) * 100) + '%', background: ka.masteryLevel === 3 ? '#52c41a' : ka.masteryLevel === 2 ? '#faad14' : '#ff4d4f' }" />
            </view>
            <text class="ability-detail">正确 {{ ka.correctCount }}/{{ ka.totalCount }} 题 · 得分 {{ ka.obtainedScore }}/{{ ka.totalScore }}</text>
          </view>
        </view>
      </view>

      <!-- 薄弱知识点 -->
      <view v-if="report?.weakKnowledges?.length" class="section">
        <text class="section-title">薄弱知识点</text>
        <view class="weak-list">
          <view v-for="wk in report.weakKnowledges" :key="wk.knowledgeId" class="weak-item">
            <view class="weak-info">
              <text class="weak-icon">{{ wk.masteryLevel === 1 ? '❌' : '⚠️' }}</text>
              <text class="weak-name">{{ wk.knowledgeName }}</text>
              <text class="weak-rate">({{ ((wk.masteryRate || 0) * 100).toFixed(1) }}%)</text>
            </view>
            <text class="weak-btn" @tap="goPractice">去练习</text>
          </view>
        </view>
      </view>

      <!-- 答题详情 -->
      <view v-if="result.details.length > 0" class="section">
        <text class="section-title">答题详情</text>
        <view v-for="(d, idx) in result.details" :key="idx" class="detail-item" :class="{ 'detail-correct': d.isCorrect === 1, 'detail-wrong': d.isCorrect === 0, 'detail-partial': d.isCorrect === 2 }">
          <view class="detail-header">
            <text class="detail-idx">第{{ d.questionOrder || idx + 1 }}题</text>
            <text v-if="d.isCorrect === 1" class="detail-tag tag-correct">正确</text>
            <text v-else-if="d.isCorrect === 2" class="detail-tag tag-partial">部分正确</text>
            <text v-else class="detail-tag tag-wrong">错误</text>
            <text class="detail-score">{{ d.scoreObtained }}/{{ d.scoreFull }}分</text>
          </view>
          <text class="detail-title">{{ d.questionTitle }}</text>
          <view class="detail-answers">
            <view class="detail-answer">
              <text class="answer-label">你的答案：</text>
              <text class="answer-text" :class="d.isCorrect === 1 ? 'text-green' : 'text-red'">{{ d.userAnswer || '未作答' }}</text>
            </view>
            <view class="detail-answer">
              <text class="answer-label">正确答案：</text>
              <text class="answer-text text-green">{{ d.correctAnswer }}</text>
            </view>
          </view>
          <view v-if="d.analysis" class="detail-analysis">
            <text class="analysis-text">💡 {{ d.analysis }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 无数据 -->
    <view v-else class="empty-wrap">
      <text class="empty-text">暂无成绩数据</text>
    </view>

    <!-- 操作按钮 -->
    <view class="bottom-btns">
      <text class="btn-practice" @tap="goPractice">针对性练习</text>
      <text class="btn-back" @tap="goBack">返回列表</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get } from '../../utils/request';

const recId = ref(0);
const loading = ref(false);

const result = ref<any>({
  totalScore: null,
  fullScore: null,
  correctCount: null,
  details: [],
});

const report = ref<any>(null);

onLoad(async (query: any) => {
  recId.value = Number(query?.recordId) || 0;
  if (!recId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    return;
  }
  loading.value = true;
  await Promise.all([loadResult(), loadAbility()]);
  loading.value = false;
});

/** E15 - 获取答题结果 */
async function loadResult() {
  try {
    const res = await get<any>(`/api/question/exam/answer/result/${recId.value}`);
    const data = res.data || {};
    result.value = {
      totalScore: data.totalScore ?? data.score ?? null,
      fullScore: data.fullScore ?? data.paperScore ?? null,
      correctCount: data.correctCount ?? null,
      details: data.details || data.answers || [],
    };
  } catch (e: any) {
    console.error('[result] loadResult error:', e);
    uni.showToast({ title: e?.message || '加载结果失败', icon: 'none' });
  }
}

/** E16 - 获取能力分析报告 */
async function loadAbility() {
  try {
    const res = await get<any>(`/api/question/exam/ability/${recId.value}`);
    report.value = res.data || null;
  } catch (e: any) {
    console.error('[result] loadAbility error:', e);
    // 能力报告可能不可用，不阻断页面
  }
}

function formatTimeSpent(s?: number) {
  if (!s) return '-';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}分${sec}秒`;
}

function goPractice() {
  uni.navigateTo({ url: `/pages/exam/practice?recordId=${recId.value}` });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
}
.loading-text { font-size: 28rpx; color: #999; }
.empty-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
}
.empty-text { font-size: 28rpx; color: #999; }

/* 成绩卡片 */
.score-card {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  margin: 30rpx;
  border-radius: 20rpx;
  padding: 50rpx 30rpx;
  text-align: center;
  color: #fff;
}
.score-label {
  display: block;
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 10rpx;
}
.score-big {
  display: flex;
  justify-content: center;
  align-items: baseline;
}
.score-value {
  font-size: 80rpx;
  font-weight: bold;
}
.score-full {
  font-size: 32rpx;
  opacity: 0.8;
  margin-left: 8rpx;
}
.score-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 20rpx 40rpx 0;
}
.progress-bar {
  flex: 1;
  height: 12rpx;
  background: rgba(255,255,255,0.3);
  border-radius: 6rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}
.progress-text {
  font-size: 24rpx;
  opacity: 0.9;
}
.score-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30rpx;
}
.stat-item {
  flex: 1;
  text-align: center;
}
.stat-num {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
}
.stat-label {
  display: block;
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 6rpx;
}
.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.3);
}

/* 通用 section */
.section {
  margin: 20rpx 30rpx;
}
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

/* 知识点掌握度 */
.ability-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.ability-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.ability-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}
.ability-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  color: #fff;
}
.ability-tag.level-3 { background: #52c41a; }
.ability-tag.level-2 { background: #faad14; }
.ability-tag.level-1 { background: #ff4d4f; }
.ability-bar {
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}
.ability-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}
.ability-detail {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 薄弱知识点 */
.weak-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff8f0;
  border: 2rpx solid #ffe4ba;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.weak-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.weak-icon { font-size: 28rpx; }
.weak-name { font-size: 28rpx; color: #333; font-weight: 600; }
.weak-rate { font-size: 24rpx; color: #999; }
.weak-btn {
  font-size: 24rpx;
  color: #1890ff;
  padding: 8rpx 20rpx;
  border: 2rpx solid #1890ff;
  border-radius: 8rpx;
}

/* 答题详情 */
.detail-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border-left: 6rpx solid #e5e6eb;
}
.detail-correct { border-left-color: #52c41a; }
.detail-wrong { border-left-color: #ff4d4f; }
.detail-partial { border-left-color: #faad14; }
.detail-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.detail-idx {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}
.detail-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  color: #fff;
}
.tag-correct { background: #52c41a; }
.tag-wrong { background: #ff4d4f; }
.tag-partial { background: #faad14; }
.detail-score {
  font-size: 24rpx;
  color: #999;
  margin-left: auto;
}
.detail-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}
.detail-answers {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.detail-answer {
  display: flex;
  gap: 10rpx;
}
.answer-label {
  font-size: 24rpx;
  color: #999;
  white-space: nowrap;
}
.answer-text {
  font-size: 24rpx;
  color: #333;
}
.text-green { color: #52c41a; }
.text-red { color: #ff4d4f; }
.detail-analysis {
  margin-top: 12rpx;
  padding: 16rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
}
.analysis-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

/* 底部按钮 */
.bottom-btns {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.btn-practice,
.btn-back {
  flex: 1;
  text-align: center;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.btn-practice {
  background: #1890ff;
  color: #fff;
}
.btn-back {
  background: #f5f5f5;
  color: #666;
}
</style>
