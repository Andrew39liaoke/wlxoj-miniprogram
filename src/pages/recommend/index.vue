<template>
  <view class="recommend-page">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <text :class="['tab-item', { active: activeTab === 'question' }]" @click="activeTab = 'question'">题目推荐</text>
      <text :class="['tab-item', { active: activeTab === 'post' }]" @click="activeTab = 'post'">帖子推荐</text>
      <text class="refresh-btn" @click="refreshAll">刷新</text>
    </view>

    <!-- 题目推荐 -->
    <scroll-view class="content-scroll" scroll-y v-if="activeTab === 'question'" @scrolltolower="loadMoreQ">
      <view v-for="item in questionRecs" :key="item.itemId" class="rec-card" @click="goQuestion(item.itemId)">
        <view class="rec-title">{{ item.questionTitle }}</view>
        <view class="rec-tags" v-if="item.questionTags?.length">
          <text v-for="t in item.questionTags" :key="t" class="rec-tag">{{ t }}</text>
        </view>
        <view class="rec-reason" v-if="item.reason">
          <text class="reason-label">推荐理由：</text>{{ item.reason }}
        </view>
        <view class="rec-stats">
          <text class="stat">提交 {{ item.submitNum || 0 }}</text>
          <text class="stat">通过 {{ item.acceptedNum || 0 }}</text>
          <text class="stat">👍 {{ item.thumbNum || 0 }}</text>
        </view>
      </view>
      <view class="tip" v-if="loadingQ">加载中...</view>
      <view class="tip" v-else-if="!questionRecs.length">暂无推荐</view>
    </scroll-view>

    <!-- 帖子推荐 -->
    <scroll-view class="content-scroll" scroll-y v-if="activeTab === 'post'" @scrolltolower="loadMoreP">
      <view v-for="item in postRecs" :key="item.itemId" class="rec-card" @click="goPost(item.itemId)">
        <view class="rec-row">
          <view class="rec-info">
            <view class="rec-title">{{ item.postTitle }}</view>
            <view class="rec-tags" v-if="item.postTags?.length">
              <text v-for="t in item.postTags" :key="t" class="rec-tag">{{ t }}</text>
            </view>
          </view>
          <image v-if="item.postCover" class="rec-cover" :src="item.postCover" mode="aspectFill" />
        </view>
        <view class="rec-reason" v-if="item.reason">
          <text class="reason-label">推荐理由：</text>{{ item.reason }}
        </view>
        <view class="rec-stats">
          <text class="stat">👍 {{ item.postThumbNum || 0 }}</text>
          <text class="stat">⭐ {{ item.postFavourNum || 0 }}</text>
          <text class="stat">👁 {{ item.postViewNum || 0 }}</text>
        </view>
      </view>
      <view class="tip" v-if="loadingP">加载中...</view>
      <view class="tip" v-else-if="!postRecs.length">暂无推荐</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { post } from "../../utils/request";

interface RecVO {
  itemId?: number;
  score?: number;
  reason?: string;
  questionTitle?: string;
  questionTags?: string[];
  submitNum?: number;
  acceptedNum?: number;
  thumbNum?: number;
  favourNum?: number;
  postTitle?: string;
  postCover?: string;
  postTags?: string[];
  postThumbNum?: number;
  postFavourNum?: number;
  postViewNum?: number;
}

const activeTab = ref("question");
const questionRecs = ref<RecVO[]>([]);
const postRecs = ref<RecVO[]>([]);
const loadingQ = ref(false);
const loadingP = ref(false);
let qPage = 1;
let pPage = 1;

onMounted(() => {
  loadQuestionRecs(true);
  loadPostRecs(true);
});

async function loadQuestionRecs(reset = false) {
  if (loadingQ.value) return;
  if (reset) { qPage = 1; questionRecs.value = []; }
  loadingQ.value = true;
  try {
    const res = await post<any>("/api/question/recommend/question", {
      current: qPage, pageSize: 10, recommendType: 0,
    });
    const records = res.data?.records || [];
    questionRecs.value.push(...records);
    qPage++;
  } catch { /* ignore */ } finally { loadingQ.value = false; }
}

async function loadPostRecs(reset = false) {
  if (loadingP.value) return;
  if (reset) { pPage = 1; postRecs.value = []; }
  loadingP.value = true;
  try {
    const res = await post<any>("/api/question/recommend/post", {
      current: pPage, pageSize: 10, recommendType: 1,
    });
    const records = res.data?.records || [];
    postRecs.value.push(...records);
    pPage++;
  } catch { /* ignore */ } finally { loadingP.value = false; }
}

function loadMoreQ() { loadQuestionRecs(); }
function loadMoreP() { loadPostRecs(); }

async function refreshAll() {
  try {
    await post("/api/question/recommend/refresh");
    uni.showToast({ title: "已刷新推荐", icon: "success" });
    loadQuestionRecs(true);
    loadPostRecs(true);
  } catch { uni.showToast({ title: "刷新失败", icon: "none" }); }
}

function goQuestion(id?: number) {
  if (id) uni.navigateTo({ url: `/pages/question/detail?id=${id}` });
}

function goPost(id?: number) {
  if (id) uni.navigateTo({ url: `/pages/post/detail?id=${id}` });
}
</script>

<style scoped>
.recommend-page { background: #f5f5f5; min-height: 100vh; }
.tab-bar { display: flex; align-items: center; background: #fff; padding: 16rpx 24rpx; }
.tab-item { font-size: 30rpx; color: #999; margin-right: 40rpx; padding-bottom: 8rpx; }
.tab-item.active { color: #1890ff; font-weight: 600; border-bottom: 4rpx solid #1890ff; }
.refresh-btn { margin-left: auto; color: #1890ff; font-size: 26rpx; }
.content-scroll { height: calc(100vh - 100rpx); padding: 16rpx 24rpx; }
.rec-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.rec-row { display: flex; }
.rec-info { flex: 1; }
.rec-cover { width: 160rpx; height: 120rpx; border-radius: 8rpx; margin-left: 16rpx; flex-shrink: 0; }
.rec-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 12rpx; }
.rec-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.rec-tag { font-size: 22rpx; color: #1890ff; background: #e6f7ff; padding: 4rpx 12rpx; border-radius: 6rpx; }
.rec-reason { font-size: 24rpx; color: #666; margin-bottom: 12rpx; line-height: 1.5; }
.reason-label { color: #999; }
.rec-stats { display: flex; gap: 24rpx; }
.stat { font-size: 22rpx; color: #999; }
.tip { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }
</style>
