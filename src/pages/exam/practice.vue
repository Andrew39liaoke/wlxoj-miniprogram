<template>
  <view class="page">
    <view class="header">
      <text class="header-title">个性化练习</text>
      <text class="header-desc">根据你的薄弱知识点推荐以下练习题</text>
    </view>

    <!-- 推荐列表模式 -->
    <template v-if="!practicing">
      <view v-if="loading" class="loading-box"><text>加载中...</text></view>

      <view v-else-if="recommendations.length > 0" class="rec-list">
        <view v-for="group in recommendations" :key="group.knowledgeId" class="rec-group">
          <view class="rec-group-header">
            <view class="rec-kp-info">
              <text class="rec-kp-name">{{ group.knowledgeName }}</text>
              <text class="rec-tag" :class="group.masteryLabel === '薄弱' ? 'tag-red' : 'tag-orange'">
                {{ group.masteryLabel }}
              </text>
            </view>
            <text class="rec-rate">掌握度 {{ ((group.masteryRate || 0) * 100).toFixed(1) }}%</text>
          </view>

          <!-- 掌握度进度条 -->
          <view class="rec-progress">
            <view class="rec-progress-fill" :style="{ width: ((group.masteryRate || 0) * 100) + '%', background: group.masteryLabel === '薄弱' ? '#ff4d4f' : '#faad14' }" />
          </view>

          <!-- 题目列表预览 -->
          <view class="rec-questions">
            <view v-for="q in group.questions" :key="q.questionId" class="rec-q-item" :class="{ practiced: q.isPracticed }">
              <view class="rec-q-info">
                <text class="rec-q-diff" :class="'diff-' + q.difficulty">{{ q.difficultyLabel || getDiffLabel(q.difficulty) }}</text>
                <text class="rec-q-title">{{ truncate(q.title, 40) }}</text>
              </view>
              <view class="rec-q-reason">
                <text class="rec-q-type-tag" :class="'rtype-' + q.recommendType">
                  {{ q.recommendType === 1 ? '规则推荐' : q.recommendType === 2 ? '知识图谱' : '相似度' }}
                </text>
                <text v-if="q.recommendReason" class="reason-text">{{ q.recommendReason }}</text>
              </view>
            </view>
          </view>

          <!-- 开始练习按钮 -->
          <text class="start-btn" @tap="startPractice(group)">
            开始练习 ({{ getUnpracticedCount(group) }}题)
          </text>
        </view>
      </view>

      <view v-else class="empty">
        <text class="empty-icon">🎉</text>
        <text class="empty-text">暂无推荐练习</text>
        <text class="empty-hint">你的表现不错！</text>
      </view>
    </template>

    <!-- 答题模式 -->
    <template v-else>
      <view class="practice-body">
        <view class="p-question-card">
          <view class="p-q-header">
            <text class="p-q-num">练习 {{ pCurrentIdx + 1 }}/{{ practiceQuestions.length }}</text>
            <text class="p-q-type-tag">{{ currentQ.questionType === 1 ? '单选' : '多选' }}</text>
          </view>
          <text class="p-q-title">{{ currentQ.title }}</text>

          <!-- 选项列表 -->
          <view class="option-list">
            <view
              v-for="opt in (currentQ.options || [])"
              :key="opt.key"
              class="option-item"
              :class="{ selected: isOptionSelected(opt.key) }"
              @tap="selectOption(opt.key)"
            >
              <view class="option-radio" :class="{ checked: isOptionSelected(opt.key) }">
                <text v-if="isOptionSelected(opt.key)" class="check-icon">✓</text>
              </view>
              <text class="option-key">{{ opt.key }}</text>
              <text class="option-value">{{ opt.value }}</text>
            </view>
          </view>

          <!-- 导航 -->
          <view class="p-nav">
            <text class="nav-btn nav-prev" :class="{ disabled: pCurrentIdx === 0 }" @tap="pPrev">上一题</text>
            <text v-if="pCurrentIdx < practiceQuestions.length - 1" class="nav-btn nav-next" @tap="pNext">下一题</text>
            <text v-else class="nav-btn nav-submit" @tap="submitPractice">提交练习</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 练习结果弹窗 -->
    <view v-if="showResult && practiceResult" class="result-mask" @tap.self="showResult = false">
      <view class="result-modal">
        <text class="result-modal-title">练习结果</text>
        <text class="result-summary">
          正确 {{ practiceResult.correctCount }}/{{ practiceResult.totalCount }} · 正确率 {{ ((practiceResult.accuracyRate || 0) * 100).toFixed(1) }}%
        </text>
        <scroll-view scroll-y class="result-detail-scroll">
          <view v-for="d in (practiceResult.details || [])" :key="d.questionId" class="result-detail-item" :class="d.isCorrect === 1 ? 'r-correct' : 'r-wrong'">
            <view class="r-d-header">
              <text class="r-d-tag" :class="d.isCorrect === 1 ? 'tag-green' : 'tag-red'">{{ d.isCorrect === 1 ? '正确' : '错误' }}</text>
              <text class="r-d-title">{{ truncate(d.questionTitle, 30) }}</text>
            </view>
            <text class="r-d-answers">你的答案: {{ d.userAnswer || '未作答' }} · 正确答案: {{ d.correctAnswer }}</text>
            <text v-if="d.analysis" class="r-d-analysis">{{ d.analysis }}</text>
          </view>
        </scroll-view>
        <text class="result-close-btn" @tap="closeResult">关闭</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <text class="btn-back" @tap="goBack">{{ practicing ? '返回推荐列表' : '返回考试结果' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get, post } from '../../utils/request';

const recId = ref(0);
const loading = ref(false);
const recommendations = ref<any[]>([]);

// 答题模式
const practicing = ref(false);
const practiceQuestions = ref<any[]>([]);
const pCurrentIdx = ref(0);
const pAnswers = ref<Record<number, string>>({});
const pMultiAnswers = ref<Record<number, string[]>>({});
const pSubmitting = ref(false);

// 练习结果
const showResult = ref(false);
const practiceResult = ref<any>(null);

const currentQ = computed(() => practiceQuestions.value[pCurrentIdx.value] || {});

onLoad(async (query: any) => {
  recId.value = Number(query?.recordId) || 0;
  if (!recId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    return;
  }
  await loadRecommendations();
});

/** E17 - 获取练习推荐列表 */
async function loadRecommendations() {
  loading.value = true;
  try {
    const res = await get<any>(`/api/question/exam/practice/recommend/${recId.value}`);
    recommendations.value = res.data || [];
    console.log('[practice] recommendations:', recommendations.value);
  } catch (e: any) {
    console.error('[practice] load error:', e);
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function getUnpracticedCount(group: any): number {
  const qs = group.questions || [];
  return qs.filter((q: any) => !q.isPracticed).length;
}

function getDiffLabel(diff?: number): string {
  if (diff === 1) return '简单';
  if (diff === 2) return '中等';
  if (diff === 3) return '困难';
  return '未知';
}

function truncate(s?: string, max = 40): string {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '...' : s;
}

/** 开始练习 - 加载某个知识点分组下未练习的题目 */
async function startPractice(group: any) {
  const unpracticed = (group.questions || []).filter((q: any) => !q.isPracticed);
  if (unpracticed.length === 0) {
    uni.showToast({ title: '所有题目已练习', icon: 'none' });
    return;
  }

  // 尝试获取完整题目信息（带选项）
  try {
    uni.showLoading({ title: '加载题目...' });
    const res = await post<any>('/api/question/exam/question/list/page', {
      current: 1,
      pageSize: 50,
    });
    uni.hideLoading();

    const allQ = res.data?.records || [];
    practiceQuestions.value = unpracticed.map((uq: any) => {
      const full = allQ.find((q: any) => q.id === uq.questionId);
      return { ...uq, ...(full || {}), questionId: uq.questionId };
    });

    // 初始化答案
    pAnswers.value = {};
    pMultiAnswers.value = {};
    pCurrentIdx.value = 0;
    practicing.value = true;
  } catch (e: any) {
    uni.hideLoading();
    console.error('[practice] startPractice error:', e);
    uni.showToast({ title: e?.message || '加载题目失败', icon: 'none' });
  }
}

function isOptionSelected(key: string): boolean {
  const qId = currentQ.value.questionId || currentQ.value.id;
  if (currentQ.value.questionType === 1) {
    return pAnswers.value[qId] === key;
  } else {
    return (pMultiAnswers.value[qId] || []).includes(key);
  }
}

function selectOption(key: string) {
  const qId = currentQ.value.questionId || currentQ.value.id;
  if (currentQ.value.questionType === 1) {
    // 单选
    pAnswers.value[qId] = key;
  } else {
    // 多选
    const arr = pMultiAnswers.value[qId] || [];
    const idx = arr.indexOf(key);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(key);
    }
    pMultiAnswers.value[qId] = [...arr];
    // 同步到 pAnswers（排序拼接）
    pAnswers.value[qId] = arr.sort().join(',');
  }
}

function pPrev() {
  if (pCurrentIdx.value > 0) pCurrentIdx.value--;
}

function pNext() {
  if (pCurrentIdx.value < practiceQuestions.value.length - 1) pCurrentIdx.value++;
}

/** E18 - 提交练习答案 */
async function submitPractice() {
  if (pSubmitting.value) return;
  pSubmitting.value = true;
  try {
    const answers = practiceQuestions.value.map((q) => ({
      questionId: q.questionId || q.id,
      userAnswer: pAnswers.value[q.questionId || q.id] || '',
    }));
    const res = await post<any>('/api/question/exam/practice/submit', {
      recordId: recId.value,
      answers,
    });
    if (res.data) {
      practiceResult.value = res.data;
      showResult.value = true;
      practicing.value = false;
      // 刷新推荐列表
      loadRecommendations();
    }
  } catch (e: any) {
    console.error('[practice] submit error:', e);
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    pSubmitting.value = false;
  }
}

function closeResult() {
  showResult.value = false;
}

function goBack() {
  if (practicing.value) {
    uni.showModal({
      title: '提示',
      content: '确定退出答题吗？',
      success: (res) => {
        if (res.confirm) {
          practicing.value = false;
        }
      },
    });
  } else {
    uni.navigateBack();
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}
.header {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 4rpx;
}
.header-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}
.header-desc {
  font-size: 26rpx;
  color: #999;
}
.loading-box {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

/* 推荐列表 */
.rec-list {
  padding: 20rpx 30rpx;
}
.rec-group {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.rec-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.rec-kp-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.rec-kp-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.rec-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  color: #fff;
}
.tag-red { background: #ff4d4f; }
.tag-orange { background: #faad14; }
.tag-green { background: #52c41a; }
.rec-rate {
  font-size: 24rpx;
  color: #999;
}
.rec-progress {
  height: 10rpx;
  background: #f0f0f0;
  border-radius: 5rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}
.rec-progress-fill {
  height: 100%;
  border-radius: 5rpx;
  transition: width 0.3s;
}

/* 题目预览 */
.rec-questions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.rec-q-item {
  padding: 16rpx 20rpx;
  border-radius: 10rpx;
  background: #f7f8fa;
}
.rec-q-item.practiced {
  opacity: 0.5;
}
.rec-q-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}
.rec-q-diff {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  color: #fff;
}
.diff-1 { background: #52c41a; }
.diff-2 { background: #faad14; }
.diff-3 { background: #ff4d4f; }
.rec-q-title {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
.rec-q-reason {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}
.rec-q-type-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  color: #fff;
}
.rtype-1 { background: #1890ff; }
.rtype-2 { background: #722ed1; }
.rtype-3 { background: #13c2c2; }
.reason-text {
  font-size: 22rpx;
  color: #999;
}
.start-btn {
  display: block;
  text-align: center;
  background: #1890ff;
  color: #fff;
  padding: 18rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: bold;
}

/* 答题模式 */
.practice-body {
  padding: 20rpx 30rpx;
}
.p-question-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.p-q-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.p-q-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #1890ff;
}
.p-q-type-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #e6f7ff;
  color: #1890ff;
}
.p-q-title {
  display: block;
  font-size: 30rpx;
  line-height: 1.8;
  color: #333;
  margin-bottom: 24rpx;
}

/* 选项 */
.option-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 30rpx;
}
.option-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border: 2rpx solid #e5e6eb;
  border-radius: 12rpx;
  gap: 16rpx;
}
.option-item.selected {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.04);
}
.option-radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.option-radio.checked {
  background: #1890ff;
  border-color: #1890ff;
}
.check-icon {
  color: #fff;
  font-size: 20rpx;
}
.option-key {
  font-weight: bold;
  color: #1890ff;
  font-size: 28rpx;
  margin-right: 8rpx;
}
.option-value {
  font-size: 28rpx;
  color: #333;
  flex: 1;
}

/* 导航 */
.p-nav {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}
.nav-btn {
  flex: 1;
  text-align: center;
  padding: 18rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.nav-prev {
  background: #f5f5f5;
  color: #666;
}
.nav-prev.disabled {
  opacity: 0.4;
}
.nav-next {
  background: #1890ff;
  color: #fff;
}
.nav-submit {
  background: #52c41a;
  color: #fff;
  font-weight: bold;
}

/* 结果弹窗 */
.result-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.result-modal {
  width: 85%;
  max-height: 80vh;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
}
.result-modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 16rpx;
}
.result-summary {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 20rpx;
}
.result-detail-scroll {
  max-height: 50vh;
}
.result-detail-item {
  padding: 16rpx 20rpx;
  border-radius: 10rpx;
  border: 2rpx solid #e5e6eb;
  margin-bottom: 12rpx;
}
.r-correct { border-left: 6rpx solid #52c41a; }
.r-wrong { border-left: 6rpx solid #ff4d4f; }
.r-d-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.r-d-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  color: #fff;
}
.r-d-title {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
.r-d-answers {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
}
.r-d-analysis {
  font-size: 24rpx;
  color: #999;
  padding: 10rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  margin-top: 8rpx;
}
.result-close-btn {
  display: block;
  text-align: center;
  padding: 18rpx;
  background: #1890ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
  margin-top: 20rpx;
}

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 30rpx; color: #333; margin-bottom: 10rpx; }
.empty-hint { font-size: 26rpx; color: #999; }

/* 底部 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.btn-back {
  display: block;
  text-align: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
}
</style>
