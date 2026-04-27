<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <text class="top-title">AI 智能助手</text>
      <text class="new-chat-btn" @tap="createNewChat">+ 新对话</text>
    </view>

    <!-- 历史会话列表（可折叠） -->
    <view v-if="showHistory" class="history-panel">
      <view class="history-header">
        <text class="history-title">历史对话</text>
        <text class="history-close" @tap="showHistory = false">收起</text>
      </view>
      <scroll-view scroll-y class="history-scroll">
        <view
          v-for="chat in chatList"
          :key="chat.id"
          class="history-item"
          :class="{ active: currentChatId === chat.id }"
          @tap="switchChat(chat.id)"
        >
          <text class="history-item-text">{{ chat.title || '对话 ' + chat.id.substring(0, 8) }}</text>
        </view>
        <view v-if="chatList.length === 0" class="history-empty">暂无历史对话</view>
      </scroll-view>
    </view>

    <!-- 消息区域 -->
    <scroll-view
      scroll-y
      class="messages-area"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoId"
    >
      <!-- 欢迎界面 -->
      <view v-if="messages.length === 0" class="welcome">
        <view class="welcome-icon">🤖</view>
        <text class="welcome-title">有什么我可以帮你的吗？</text>
        <text class="welcome-sub">推荐题目、分析代码或解答疑惑</text>
        <view class="suggestions">
          <text class="suggest-item" @tap="inputText = '请推荐几道适合我的算法题！'">🎯 推荐题目</text>
          <text class="suggest-item" @tap="inputText = '如何优化代码的时间复杂度？'">⚡ 优化代码</text>
          <text class="suggest-item" @tap="inputText = '请解释一下动态规划的思路'">💡 算法讲解</text>
        </view>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="(msg, idx) in messages"
        :key="idx"
        :id="'msg-' + idx"
        class="msg-row"
        :class="msg.role === 'user' ? 'msg-user' : 'msg-ai'"
      >
        <view v-if="msg.role === 'ai'" class="ai-avatar">🤖</view>
        <view class="msg-bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <text class="msg-text">{{ msg.content }}</text>
          <view v-if="msg.loading" class="typing">
            <text class="dot">·</text><text class="dot">·</text><text class="dot">·</text>
          </view>
        </view>
      </view>

      <!-- 滚动锚点 -->
      <view id="scroll-bottom" style="height: 20rpx;" />
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="input-area">
      <view class="input-row">
        <text class="history-toggle" @tap="showHistory = !showHistory">💬</text>
        <input
          v-model="inputText"
          class="text-input"
          placeholder="输入你的问题..."
          confirm-type="send"
          @confirm="sendMessage"
        />
        <text
          class="send-btn"
          :class="{ disabled: !inputText.trim() || aiLoading }"
          @tap="sendMessage"
        >发送</text>
      </view>
      <text class="disclaimer">AI 生成的内容可能不准确，请仔细核对</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getLoginUser, isLoggedIn } from '../../store/user';
import { AI_BASE } from '../../utils/config';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  loading?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
}

const chatList = ref<ChatSession[]>([]);
const currentChatId = ref('');
const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const aiLoading = ref(false);
const showHistory = ref(false);
const scrollTop = ref(0);
const scrollIntoId = ref('');

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  loadChatList();
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function scrollToBottom() {
  nextTick(() => {
    scrollIntoId.value = '';
    nextTick(() => {
      scrollIntoId.value = 'scroll-bottom';
    });
  });
}

function createNewChat() {
  currentChatId.value = generateUUID();
  messages.value = [];
  showHistory.value = false;
  if (!chatList.value.find((c) => c.id === currentChatId.value)) {
    chatList.value.unshift({ id: currentChatId.value, title: '' });
  }
}

async function loadChatList() {
  const user = getLoginUser();
  if (!user?.id) return;
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `${AI_BASE}/ai/history/CHAT?userId=${user.id}`,
        method: 'GET',
        success: (r) => resolve(r.data),
        fail: reject,
      });
    });
    if (res?.code === 0 && Array.isArray(res.data)) {
      chatList.value = res.data.map((id: string) => ({ id, title: '' }));
      if (chatList.value.length > 0 && !currentChatId.value) {
        switchChat(chatList.value[0].id);
      } else if (!currentChatId.value) {
        createNewChat();
      }
    } else {
      if (!currentChatId.value) createNewChat();
    }
  } catch {
    if (!currentChatId.value) createNewChat();
  }
}

async function switchChat(chatId: string) {
  currentChatId.value = chatId;
  showHistory.value = false;
  const user = getLoginUser();
  if (!user?.id) return;
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `${AI_BASE}/ai/history/CHAT/${chatId}?userId=${user.id}`,
        method: 'GET',
        success: (r) => resolve(r.data),
        fail: reject,
      });
    });
    if (res?.code === 0 && Array.isArray(res.data)) {
      messages.value = res.data.map((msg: any) => ({
        role: msg.messageType === 'USER' ? 'user' : 'ai',
        content: msg.textContent || '',
      }));
      scrollToBottom();
    } else {
      messages.value = [];
    }
  } catch {
    messages.value = [];
  }
}

async function sendMessage() {
  const prompt = inputText.value.trim();
  if (!prompt || aiLoading.value) return;

  const user = getLoginUser();
  if (!user?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  // 添加用户消息
  messages.value.push({ role: 'user', content: prompt });
  inputText.value = '';
  scrollToBottom();

  // 添加 AI 占位消息
  messages.value.push({ role: 'ai', content: '', loading: true });
  const aiIdx = messages.value.length - 1;
  aiLoading.value = true;
  scrollToBottom();

  try {
    const token = uni.getStorageSync('token') || '';

    // 微信小程序使用 uni.request 发送请求
    // 由于不支持 SSE 流式，使用 requestTask + enableChunkedTransfer 尝试分块接收
    // 如果不支持，则等待完整响应
    const requestTask = uni.request({
      url: `${AI_BASE}/ai/chat`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      data: {
        userId: user.id,
        chatId: currentChatId.value,
        prompt: prompt,
        type: 'CHAT',
      },
      // @ts-ignore - enableChunkedTransfer 在新版本支持
      enableChunkedTransfer: true,
      success: (res: any) => {
        // 完整响应返回时解析 SSE 格式
        const rawData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const content = parseSSEResponse(rawData);
        if (content) {
          messages.value[aiIdx].content = content;
        } else if (!messages.value[aiIdx].content) {
          // 尝试直接解析为普通响应
          try {
            const parsed = typeof res.data === 'object' ? res.data : JSON.parse(res.data);
            if (parsed?.data) {
              messages.value[aiIdx].content = typeof parsed.data === 'string'
                ? parsed.data
                : JSON.stringify(parsed.data);
            }
          } catch {
            messages.value[aiIdx].content = rawData || '收到空响应';
          }
        }
        messages.value[aiIdx].loading = false;
        aiLoading.value = false;
        scrollToBottom();

        // 更新会话标题
        const chat = chatList.value.find(c => c.id === currentChatId.value);
        if (chat && !chat.title) {
          chat.title = prompt.substring(0, 20);
        }
      },
      fail: () => {
        if (!messages.value[aiIdx].content) {
          messages.value[aiIdx].content = '网络请求失败，请稍后重试';
        }
        messages.value[aiIdx].loading = false;
        aiLoading.value = false;
        scrollToBottom();
      },
    });

    // 尝试使用 onChunkReceived 进行流式接收（微信基础库 2.20.1+）
    if (requestTask && typeof (requestTask as any).onChunkReceived === 'function') {
      let buffer = '';
      (requestTask as any).onChunkReceived((res: any) => {
        try {
          // 将 ArrayBuffer 转为字符串
          const bytes = new Uint8Array(res.data);
          let chunk = '';
          for (let i = 0; i < bytes.length; i++) {
            chunk += String.fromCharCode(bytes[i]);
          }
          buffer += chunk;

          // 解析 SSE 行
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          let currentEvent = '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const data = trimmed.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.data !== undefined && parsed.data !== null && currentEvent !== 'title') {
                    messages.value[aiIdx].content += parsed.data;
                    scrollToBottom();
                  }
                } catch {}
              }
              currentEvent = '';
            }
          }
        } catch {}
      });
    }
  } catch (err: any) {
    if (!messages.value[aiIdx].content) {
      messages.value[aiIdx].content = '请求失败，请稍后重试';
    }
    messages.value[aiIdx].loading = false;
    aiLoading.value = false;
    scrollToBottom();
  }
}

/**
 * 解析 SSE 格式的完整响应文本
 */
function parseSSEResponse(text: string): string {
  if (!text) return '';
  let result = '';
  const lines = text.split('\n');
  let currentEvent = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('event:')) {
      currentEvent = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('data:')) {
      const data = trimmed.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data !== undefined && parsed.data !== null && currentEvent !== 'title') {
            result += parsed.data;
          }
        } catch {}
      }
      currentEvent = '';
    }
  }
  return result;
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 2rpx solid #eee;
}

.top-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.new-chat-btn {
  font-size: 26rpx;
  color: #1890ff;
  padding: 8rpx 20rpx;
  border: 2rpx solid #1890ff;
  border-radius: 20rpx;
}

/* 历史会话面板 */
.history-panel {
  background: #fff;
  border-bottom: 2rpx solid #eee;
  max-height: 400rpx;
}

.history-header {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 30rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.history-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.history-close {
  font-size: 24rpx;
  color: #1890ff;
}

.history-scroll {
  max-height: 300rpx;
}

.history-item {
  padding: 20rpx 30rpx;
  border-bottom: 2rpx solid #fafafa;
}

.history-item.active {
  background: #e6f7ff;
}

.history-item-text {
  font-size: 26rpx;
  color: #333;
}

.history-empty {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 26rpx;
}

/* 消息区域 */
.messages-area {
  flex: 1;
  padding: 20rpx 30rpx;
}

/* 欢迎界面 */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}

.welcome-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.welcome-sub {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
}

.suggest-item {
  background: #fff;
  padding: 16rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #333;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

/* 消息行 */
.msg-row {
  display: flex;
  margin-bottom: 24rpx;
  align-items: flex-start;
}

.msg-user {
  flex-direction: row-reverse;
}

.msg-ai {
  flex-direction: row;
}

.ai-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 16rpx;
  text-align: center;
  line-height: 64rpx;
}

.msg-bubble {
  max-width: 75%;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
  word-break: break-all;
}

.bubble-user {
  background: #1890ff;
  color: #fff;
  border-bottom-right-radius: 4rpx;
}

.bubble-ai {
  background: #fff;
  color: #333;
  border-bottom-left-radius: 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.msg-text {
  white-space: pre-wrap;
}

.typing {
  display: flex;
  gap: 4rpx;
}

.dot {
  font-size: 40rpx;
  color: #999;
  animation: blink 1.4s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* 底部输入区域 */
.input-area {
  background: #fff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.history-toggle {
  font-size: 40rpx;
  padding: 8rpx;
}

.text-input {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.send-btn {
  background: #1890ff;
  color: #fff;
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
}

.send-btn.disabled {
  background: #ccc;
  color: #999;
}

.disclaimer {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #bbb;
  margin-top: 10rpx;
}
</style>
