<template>
  <view class="post-detail" v-if="postData">
    <view class="header">
      <image class="avatar" :src="postData.user?.userAvatar || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="user-info">
        <text class="nick">{{ postData.user?.nickName || postData.user?.userName || '匿名' }}</text>
        <text class="time">{{ formatTime(postData.createTime) }}</text>
      </view>
      <text class="zone-tag" v-if="postData.zoneName">{{ postData.zoneName }}</text>
    </view>

    <view class="title">{{ postData.title }}</view>

    <view class="tags" v-if="postData.tagList?.length">
      <text v-for="t in postData.tagList" :key="t" class="tag">{{ t }}</text>
    </view>

    <image v-if="postData.cover" class="cover-img" :src="postData.cover" mode="widthFix" />

    <view class="content-area">
      <rich-text :nodes="renderedContent"></rich-text>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <view class="action-item" @click="toggleThumb">
        <text :class="{ active: hasThumb }">👍</text>
        <text class="act-num">{{ postData.thumbNum || 0 }}</text>
      </view>
      <view class="action-item" @click="toggleFavour">
        <text :class="{ active: hasFavour }">⭐</text>
        <text class="act-num">{{ postData.favourNum || 0 }}</text>
      </view>
      <view class="action-item">
        <text>👁</text>
        <text class="act-num">{{ postData.viewNum || 0 }}</text>
      </view>
    </view>

    <!-- 评论区 -->
    <view class="comment-section">
      <view class="section-title">评论 ({{ comments.length }})</view>
      <view v-for="c in comments" :key="c.id" class="comment-item">
        <image class="cm-avatar" :src="c.userVO?.userAvatar || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="cm-body">
          <text class="cm-nick">{{ c.userVO?.nickName || c.userVO?.userName || '匿名' }}</text>
          <text class="cm-content">{{ c.content }}</text>
          <view class="cm-footer">
            <text class="cm-time">{{ formatTime(c.createTime) }}</text>
            <text class="cm-reply" @click="replyTo(c)">回复</text>
          </view>
          <!-- 子评论 -->
          <view v-for="sub in c.children" :key="sub.id" class="sub-comment">
            <text class="cm-nick">{{ sub.userVO?.nickName || '匿名' }}</text>
            <text class="cm-content">{{ sub.content }}</text>
            <text class="cm-time">{{ formatTime(sub.createTime) }}</text>
          </view>
        </view>
      </view>
      <view class="tip" v-if="!comments.length">暂无评论</view>
    </view>

    <!-- 评论输入 -->
    <view class="comment-input-bar safe-area-bottom">
      <input class="comment-input" v-model="commentText" :placeholder="replyPlaceholder" />
      <text class="send-btn" @click="sendComment">发送</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { get, post } from "../../utils/request";
import { markdownToHtml } from "../../utils/markdown";

interface PostVO {
  id?: number; title?: string; content?: string; thumbNum?: number; favourNum?: number;
  viewNum?: number; zoneName?: string; createTime?: string; tagList?: string[];
  cover?: string; user?: { userName?: string; nickName?: string; userAvatar?: string };
}

interface CommentVO {
  id?: number; parentId?: number; postId?: number; content?: string;
  userVO?: { userName?: string; nickName?: string; userAvatar?: string };
  createTime?: string; children?: CommentVO[];
}

const postData = ref<PostVO | null>(null);
const hasThumb = ref(false);
const hasFavour = ref(false);
const comments = ref<CommentVO[]>([]);
const commentText = ref("");
const replyPlaceholder = ref("写评论...");
let postId = ''; // 保持字符串，避免雪花ID精度丢失
let replyParentId: number | null = null;

onLoad((options: any) => {
  postId = String(options?.id || '');
  console.log('[post detail] postId:', postId);
  if (postId) { loadPost(); loadComments(); }
  else { uni.showToast({ title: '参数错误', icon: 'none' }); }
});

async function loadPost() {
  try {
    const res = await get<PostVO>(`/api/post/getInfo/${postId}`);
    postData.value = res.data;
    hasThumb.value = !!(res.data as any)?.hasThumb;
    hasFavour.value = !!(res.data as any)?.hasFavour;
    console.log('[post detail] loaded:', res.data?.title);
  } catch (e: any) {
    console.error('[post detail] loadPost error:', e);
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  }
}

async function loadComments() {
  try {
    const res = await get<CommentVO[]>(`/api/post/comment/post/${postId}`);
    // 构建评论树
    const all = res.data || [];
    const map = new Map<number, CommentVO>();
    const roots: CommentVO[] = [];
    all.forEach((c: CommentVO) => { (c as any).children = []; if (c.id) map.set(c.id, c); });
    all.forEach((c: CommentVO) => {
      if (c.parentId && map.has(c.parentId)) {
        (map.get(c.parentId) as any).children.push(c);
      } else {
        roots.push(c);
      }
    });
    comments.value = roots;
  } catch (e: any) {
    console.error('[post detail] loadComments error:', e);
  }
}

async function toggleThumb() {
  try {
    if (hasThumb.value) {
      await post("/api/post_thumb/remove", { id: postId });
      hasThumb.value = false;
      if (postData.value) postData.value.thumbNum = (postData.value.thumbNum || 1) - 1;
    } else {
      await post("/api/post_thumb/save", { id: postId });
      hasThumb.value = true;
      if (postData.value) postData.value.thumbNum = (postData.value.thumbNum || 0) + 1;
    }
  } catch { uni.showToast({ title: "操作失败", icon: "none" }); }
}

async function toggleFavour() {
  try {
    if (hasFavour.value) {
      await post("/api/post_favour/remove", { id: postId });
      hasFavour.value = false;
      if (postData.value) postData.value.favourNum = (postData.value.favourNum || 1) - 1;
    } else {
      await post("/api/post_favour/save", { id: postId });
      hasFavour.value = true;
      if (postData.value) postData.value.favourNum = (postData.value.favourNum || 0) + 1;
    }
  } catch { uni.showToast({ title: "操作失败", icon: "none" }); }
}

function replyTo(c: CommentVO) {
  replyParentId = c.id || null;
  replyPlaceholder.value = `回复 ${c.userVO?.nickName || '匿名'}...`;
}

async function sendComment() {
  if (!commentText.value.trim()) { uni.showToast({ title: "请输入评论内容", icon: "none" }); return; }
  try {
    await post("/api/post/comment/save", {
      postId, content: commentText.value.trim(), parentId: replyParentId || undefined,
    });
    commentText.value = "";
    replyParentId = null;
    replyPlaceholder.value = "写评论...";
    uni.showToast({ title: "评论成功", icon: "success" });
    loadComments();
  } catch { uni.showToast({ title: "评论失败", icon: "none" }); }
}

function formatTime(t?: string) { return t ? t.substring(0, 10) : ""; }

/** 处理帖子内容：限制图片尺寸、缩小标题、自适应手机 */
function processContent(html: string): string {
  if (!html) return '';
  let result = html;
  // 给所有 img 添加自适应样式
  result = result.replace(
    /<img([^>]*)>/gi,
    '<img$1 style="max-width:100%;height:auto;border-radius:8px;margin:10px 0;display:block;"'
    + '>'
  );
  // 缩小 h1-h6 字号
  result = result.replace(/<h1([^>]*)>/gi, '<h1$1 style="font-size:18px;font-weight:bold;margin:12px 0 8px;">');
  result = result.replace(/<h2([^>]*)>/gi, '<h2$1 style="font-size:16px;font-weight:bold;margin:10px 0 6px;">');
  result = result.replace(/<h3([^>]*)>/gi, '<h3$1 style="font-size:15px;font-weight:bold;margin:8px 0 4px;">');
  result = result.replace(/<h[456]([^>]*)>/gi, '<h4$1 style="font-size:14px;font-weight:bold;margin:6px 0 4px;">');
  // 给 p 标签加行距
  result = result.replace(/<p([^>]*)>/gi, '<p$1 style="margin:6px 0;line-height:1.8;font-size:14px;">');
  // 限制 pre/code 框宽度
  result = result.replace(
    /<pre([^>]*)>/gi,
    '<pre$1 style="max-width:100%;overflow-x:auto;background:#f5f5f5;padding:10px;border-radius:6px;font-size:12px;margin:8px 0;">'
  );
  // 移除固定宽高度属性（破坏自适应）
  result = result.replace(/width\s*=\s*["']\d+["']/gi, '');
  result = result.replace(/height\s*=\s*["']\d+["']/gi, '');
  return result;
}

/** 渲染后的内容 */
const renderedContent = computed(() => {
  const raw = postData.value?.content || '';
  // 判断是否包含 HTML 标签
  const isHtml = /<[a-z][\s\S]*>/i.test(raw);
  if (isHtml) {
    return processContent(raw);
  } else {
    // Markdown 内容转 HTML 后再处理
    return processContent(markdownToHtml(raw));
  }
});
</script>

<style scoped>
.post-detail { background: #fff; min-height: 100vh; padding-bottom: 120rpx; }
.header { display: flex; align-items: center; padding: 24rpx 32rpx; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; margin-right: 16rpx; background: #e8e8e8; }
.user-info { flex: 1; }
.nick { display: block; font-size: 28rpx; font-weight: 600; color: #333; }
.time { font-size: 22rpx; color: #999; }
.zone-tag { font-size: 22rpx; color: #1890ff; background: #e6f7ff; padding: 4rpx 12rpx; border-radius: 6rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; padding: 0 32rpx 16rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 8rpx; padding: 0 32rpx 16rpx; }
.tag { font-size: 22rpx; color: #1890ff; background: #e6f7ff; padding: 4rpx 12rpx; border-radius: 6rpx; }
.cover-img { width: calc(100% - 64rpx); margin: 0 32rpx 24rpx; border-radius: 12rpx; }
.content-area { padding: 0 32rpx 32rpx; font-size: 28rpx; line-height: 1.8; color: #555; }

.action-bar { display: flex; gap: 48rpx; padding: 20rpx 32rpx; border-top: 1rpx solid #f0f0f0; border-bottom: 1rpx solid #f0f0f0; }
.action-item { display: flex; align-items: center; gap: 8rpx; font-size: 28rpx; }
.action-item .active { opacity: 1; }
.act-num { font-size: 24rpx; color: #666; }

.comment-section { padding: 24rpx 32rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.comment-item { display: flex; margin-bottom: 24rpx; }
.cm-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; margin-right: 16rpx; background: #e8e8e8; flex-shrink: 0; }
.cm-body { flex: 1; }
.cm-nick { font-size: 24rpx; color: #1890ff; font-weight: 600; display: block; }
.cm-content { font-size: 28rpx; color: #333; margin: 8rpx 0; display: block; }
.cm-footer { display: flex; gap: 24rpx; }
.cm-time { font-size: 22rpx; color: #999; }
.cm-reply { font-size: 22rpx; color: #1890ff; }
.sub-comment { margin-top: 16rpx; padding: 16rpx; background: #f7f8fa; border-radius: 8rpx; }

.comment-input-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #f0f0f0; }
.comment-input { flex: 1; height: 72rpx; background: #f5f5f5; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.send-btn { margin-left: 16rpx; color: #1890ff; font-size: 28rpx; font-weight: 600; }
.tip { text-align: center; padding: 40rpx; color: #999; font-size: 26rpx; }
</style>
