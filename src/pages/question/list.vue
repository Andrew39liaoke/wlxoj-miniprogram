<template>
  <view class="question-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        v-model="searchText"
        placeholder="搜索题目"
        confirm-type="search"
        @confirm="doSearch"
      />
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <!-- 标签筛选 -->
    <view class="tag-wrap-area" v-if="allTags.length">
      <view class="tag-list" :class="{ collapsed: !tagExpanded }">
        <text
          class="tag-item"
          :class="{ active: selectedTag === '' }"
          @click="selectTag('')"
        >全部</text>
        <text
          v-for="tag in allTags"
          :key="tag"
          class="tag-item"
          :class="{ active: selectedTag === tag }"
          @click="selectTag(tag)"
        >{{ tag }}</text>
      </view>
      <view class="tag-expand-btn" @click="tagExpanded = !tagExpanded">
        <text class="tag-expand-text">{{ tagExpanded ? '收起 ▲' : '展开 ▼' }}</text>
      </view>
    </view>

    <!-- 题目列表 -->
    <scroll-view
      class="question-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :style="{ height: scrollHeight + 'px' }"
    >
      <view
        v-for="item in questionList"
        :key="item.id"
        class="question-card"
        @click="goDetail(item.id)"
      >
        <view class="q-title">{{ item.title }}</view>
        <view class="q-tags" v-if="item.tags?.length">
          <text v-for="t in item.tags" :key="t" class="q-tag">{{ t }}</text>
        </view>
        <view class="q-stats">
          <text class="stat-item">提交 {{ item.submitNum || 0 }}</text>
          <text class="stat-item">通过 {{ item.acceptedNum || 0 }}</text>
          <text class="stat-item rate" v-if="item.submitNum">
            {{ Math.round(((item.acceptedNum || 0) / item.submitNum) * 100) }}%
          </text>
          <text class="stat-item like">👍 {{ item.thumbNum || 0 }}</text>
          <text class="stat-item fav">⭐ {{ item.favourNum || 0 }}</text>
        </view>
      </view>

      <view class="loading-tip" v-if="loading">加载中...</view>
      <view class="loading-tip" v-else-if="noMore">没有更多了</view>
      <view class="empty-tip" v-else-if="!questionList.length && !loading">暂无题目</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { post, get } from "../../utils/request";
import { isLoggedIn } from "../../store/user";

interface QuestionVO {
  id?: number;
  title?: string;
  tags?: string[];
  submitNum?: number;
  acceptedNum?: number;
  thumbNum?: number;
  favourNum?: number;
}

const searchText = ref("");
const selectedTag = ref("");
const allTags = ref<string[]>([]);
const tagExpanded = ref(false);
const questionList = ref<QuestionVO[]>([]);
const loading = ref(false);
const noMore = ref(false);
const current = ref(1);
const pageSize = 10;
const scrollHeight = ref(500);

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: "/pages/auth/login" });
    return;
  }
});

onMounted(() => {
  // 计算滚动区域高度
  const sysInfo = uni.getSystemInfoSync();
  // tabBar高度约50px，搜索栏+标签栏约100px
  scrollHeight.value = sysInfo.windowHeight - 160;
  loadTags();
  loadQuestions(true);
});

async function loadTags() {
  try {
    const res = await get<string[]>("/api/question/tags");
    allTags.value = res.data || [];
  } catch (e) {
    console.error('[loadTags error]', e);
  }
}

async function loadQuestions(reset = false) {
  if (loading.value) return;
  if (reset) {
    current.value = 1;
    noMore.value = false;
    questionList.value = [];
  }
  if (noMore.value) return;

  loading.value = true;
  try {
    const tags = selectedTag.value ? [selectedTag.value] : undefined;
    const res = await post<any>("/api/question/list/page/vo", {
      current: current.value,
      pageSize,
      title: searchText.value.trim() || undefined,
      tags,
      sortField: "create_time",
      sortOrder: "descend",
    });
    const records = res.data?.records || [];
    if (reset) {
      questionList.value = records;
    } else {
      questionList.value.push(...records);
    }
    if (records.length < pageSize) {
      noMore.value = true;
    }
    current.value++;
  } catch (e) {
    console.error('[loadQuestions error]', e);
    uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function doSearch() {
  loadQuestions(true);
}

function selectTag(tag: string) {
  selectedTag.value = tag;
  loadQuestions(true);
}

function loadMore() {
  loadQuestions(false);
}

function goDetail(id?: number) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/question/detail?id=${id}` });
}
</script>

<style scoped>
.question-list {
  background: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
}

.search-btn {
  margin-left: 16rpx;
  color: #1890ff;
  font-size: 28rpx;
  flex-shrink: 0;
}

.tag-wrap-area {
  background: #fff;
  padding: 12rpx 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 12rpx;
}

.tag-list.collapsed {
  max-height: 88rpx;
  overflow: hidden;
}

.tag-item {
  display: inline-block;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  flex-shrink: 0;
  line-height: 36rpx;
}

.tag-item.active {
  background: #1890ff;
  color: #fff;
}

.tag-expand-btn {
  text-align: center;
  padding: 6rpx 0 10rpx;
  border-top: 1rpx solid #f5f5f5;
}

.tag-expand-text {
  font-size: 22rpx;
  color: #1890ff;
}

.question-scroll {
  padding: 16rpx 24rpx;
}

.question-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.q-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.q-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.q-tag {
  font-size: 22rpx;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.q-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #999;
}

.stat-item.rate {
  color: #52c41a;
  font-weight: 600;
}

.loading-tip,
.empty-tip {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
</style>
