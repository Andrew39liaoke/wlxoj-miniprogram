<template>
  <view class="post-list-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" v-model="searchText" placeholder="搜索帖子" confirm-type="search" @confirm="doSearch" />
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <!-- 分区筛选 -->
    <scroll-view class="zone-scroll" scroll-x>
      <view class="zone-list">
        <text :class="['zone-item', { active: selectedZone === '' }]" @click="selectZone('')">全部</text>
        <text v-for="z in zones" :key="z" :class="['zone-item', { active: selectedZone === z }]" @click="selectZone(z)">{{ z }}</text>
      </view>
    </scroll-view>

    <!-- 发帖按钮 -->
    <view class="fab" @click="goAddPost">+</view>

    <!-- 帖子列表 -->
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore" :style="{ height: scrollH + 'px' }">
      <view v-for="item in postList" :key="item.id" class="post-card" @click="goDetail(item.id)">
        <!-- 顶部：头像 + 用户名 + 标签 + 时间 -->
        <view class="post-top-row">
          <view class="post-user-row">
            <image class="post-avatar" :src="item.user?.userAvatar || '/static/default-avatar.png'" mode="aspectFill" />
            <text class="post-nick">{{ item.user?.nickName || item.user?.userName || '匿名' }}</text>
          </view>
          <view class="post-tags-row" v-if="item.tagList?.length">
            <text v-for="t in item.tagList.slice(0, 3)" :key="t" class="post-tag">{{ t }}</text>
          </view>
        </view>

        <!-- 中间：标题 + 内容预览 + 图片 -->
        <view class="post-body">
          <view class="post-body-left">
            <text class="post-title">{{ item.title }}</text>
            <text class="post-preview">{{ getPreview(item.content) }}</text>
          </view>
          <image class="post-cover" :src="getPostImage(item)" mode="aspectFill" />
        </view>

        <!-- 底部：操作栏 -->
        <view class="post-stats">
          <view class="pstat" :class="{ active: item.hasThumb }" @click.stop="handleThumb(item)">
            <text>👍</text>
            <text>{{ item.thumbNum || 0 }}</text>
          </view>
          <view class="pstat" :class="{ active: item.hasFavour }" @click.stop="handleFavour(item)">
            <text>⭐</text>
            <text>{{ item.favourNum || 0 }}</text>
          </view>
          <view class="pstat">
            <text>👁</text>
            <text>{{ item.viewNum || 0 }}</text>
          </view>
          <text class="post-time">{{ formatTime(item.createTime) }}</text>
        </view>
      </view>

      <view class="tip" v-if="loading">加载中...</view>
      <view class="tip" v-else-if="noMore && postList.length">没有更多了</view>
      <view class="tip" v-else-if="!postList.length">暂无帖子</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { post as postReq } from "../../utils/request";
import { isLoggedIn } from "../../store/user";

interface PostVO {
  id?: number; title?: string; content?: string; thumbNum?: number; favourNum?: number;
  zone?: string; viewNum?: number; zoneName?: string; userId?: number;
  createTime?: string; tagList?: string[]; cover?: string;
  user?: { userName?: string; nickName?: string; userAvatar?: string };
  hasThumb?: boolean; hasFavour?: boolean;
}

const searchText = ref("");
const selectedZone = ref("");
const zones = ref(["学习交流", "题目讨论", "经验分享", "求助", "其他"]);
const postList = ref<PostVO[]>([]);
const loading = ref(false);
const noMore = ref(false);
let currentPage = 1;
const scrollH = ref(500);

// 占位图颜色列表
const placeholderColors = ['#1890ff', '#36cfc9', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#52c41a'];

onShow(() => {
  if (!isLoggedIn()) { uni.reLaunch({ url: "/pages/auth/login" }); return; }
});

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  scrollH.value = sys.windowHeight - 160;
  loadPosts(true);
});

async function loadPosts(reset = false) {
  if (loading.value) return;
  if (reset) { currentPage = 1; noMore.value = false; postList.value = []; }
  if (noMore.value) return;
  loading.value = true;
  try {
    const res = await postReq<any>("/api/post/page", {
      current: currentPage, pageSize: 10,
      title: searchText.value.trim() || undefined,
      zone: selectedZone.value || undefined,
      sortField: "create_time", sortOrder: "descend",
    });
    const records = res.data?.records || [];
    if (reset) postList.value = records;
    else postList.value.push(...records);
    if (records.length < 10) noMore.value = true;
    currentPage++;
  } catch (e) {
    console.error('[loadPosts error]', e);
    uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
  } finally { loading.value = false; }
}

function doSearch() { loadPosts(true); }
function selectZone(z: string) { selectedZone.value = z; loadPosts(true); }
function loadMore() { loadPosts(); }

function goDetail(id?: number) {
  if (id) uni.navigateTo({ url: `/pages/post/detail?id=${id}` });
}

function goAddPost() {
  uni.navigateTo({ url: "/pages/post/edit" });
}

function formatTime(t?: string) {
  if (!t) return "";
  return t.substring(0, 10);
}

/** 从帖子获取图片：cover > 内容中第一张图 > 占位图 */
function getPostImage(item: PostVO): string {
  // 1. 有封面直接用
  if (item.cover) return item.cover;
  // 2. 从 markdown 内容提取第一张图片
  if (item.content) {
    const imgMatch = item.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    if (imgMatch) return imgMatch[1];
    // 也尝试匹配 <img src="...">
    const htmlMatch = item.content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/);
    if (htmlMatch) return htmlMatch[1];
  }
  // 3. 使用 picsum 占位图（和前端一致）
  const seed = item.id ?? Math.floor(Math.random() * 10000);
  return `https://picsum.photos/seed/post-${seed}/320/200`;
}

/** Markdown + HTML 转纯文本预览 */
function getPreview(content?: string): string {
  if (!content) return '暂无内容';
  return content
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 移除 markdown 标题
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .substring(0, 80) || '暂无内容';
}

/** 点赞 */
async function handleThumb(item: PostVO) {
  try {
    const res = await postReq<any>(
      item.hasThumb ? '/api/post_thumb/remove' : '/api/post_thumb/save',
      { id: item.id }
    );
    if (res.code === 0) {
      item.hasThumb = !item.hasThumb;
      item.thumbNum = (item.thumbNum || 0) + (item.hasThumb ? 1 : -1);
    }
  } catch (e) {
    console.error('[thumb error]', e);
  }
}

/** 收藏 */
async function handleFavour(item: PostVO) {
  try {
    const res = await postReq<any>(
      item.hasFavour ? '/api/post_favour/remove' : '/api/post_favour/save',
      { id: item.id }
    );
    if (res.code === 0) {
      item.hasFavour = !item.hasFavour;
      item.favourNum = (item.favourNum || 0) + (item.hasFavour ? 1 : -1);
    }
  } catch (e) {
    console.error('[favour error]', e);
  }
}
</script>

<style scoped>
.post-list-page { background: #f5f5f5; min-height: 100vh; position: relative; }
.search-bar { display: flex; align-items: center; padding: 16rpx 24rpx; background: #fff; }
.search-input { flex: 1; height: 72rpx; background: #f5f5f5; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.search-btn { margin-left: 16rpx; color: #1890ff; font-size: 28rpx; }
.zone-scroll { white-space: nowrap; background: #fff; padding: 12rpx 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.zone-list { display: inline-flex; gap: 16rpx; }
.zone-item { display: inline-block; padding: 8rpx 24rpx; border-radius: 24rpx; font-size: 24rpx; color: #666; background: #f5f5f5; }
.zone-item.active { background: #1890ff; color: #fff; }

.fab { position: fixed; right: 40rpx; bottom: 200rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #1890ff; color: #fff; font-size: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(24,144,255,0.4); z-index: 100; }

.list-scroll { padding: 16rpx 24rpx; }

/* 帖子卡片 */
.post-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 顶部行：头像+用户名 | 标签 */
.post-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.post-user-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.post-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #e8e8e8;
  flex-shrink: 0;
}
.post-nick {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
}
.post-tags-row {
  display: flex;
  gap: 8rpx;
  flex-wrap: nowrap;
  overflow: hidden;
}
.post-tag {
  font-size: 22rpx;
  color: #1890ff;
  background: rgba(24, 144, 255, 0.06);
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 中间：标题+预览 | 图片 */
.post-body {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.post-body-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 140rpx;
  overflow: hidden;
}
.post-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
.post-preview {
  font-size: 24rpx;
  color: #86909c;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-cover {
  width: 200rpx;
  height: 140rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f2f5;
}

/* 底部操作栏 */
.post-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
}
.pstat {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #86909c;
}
.pstat.active {
  color: #1890ff;
}
.post-time {
  font-size: 22rpx;
  color: #c9cdd4;
  margin-left: auto;
}

.tip { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }
</style>
