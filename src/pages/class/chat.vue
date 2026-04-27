<template>
  <view class="page">
    <!-- 顶部信息 -->
    <view class="top-bar">
      <text class="class-name">{{ className || '班级聊天' }}</text>
      <text class="member-count" v-if="onlineCount > 0">在线 {{ onlineCount }}</text>
    </view>

    <!-- 消息区域 -->
    <scroll-view
      scroll-y
      class="messages-area"
      :scroll-into-view="scrollAnchor"
    >
      <view v-if="messages.length === 0 && !loading" class="empty-msg">
        <text class="empty-text">暂无消息，发送第一条消息吧</text>
      </view>

      <view
        v-for="(msg, idx) in messages"
        :key="idx"
        :id="'msg-' + idx"
        class="msg-row"
        :class="msg.userId === myUserId ? 'msg-self' : 'msg-other'"
      >
        <!-- 他人消息 -->
        <view v-if="msg.userId !== myUserId" class="msg-left">
          <image
            class="msg-avatar"
            :src="msg.userAvatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
          <view class="msg-body">
            <text class="msg-name">{{ msg.userName || '同学' }}</text>
            <view class="msg-bubble bubble-other">
              <image v-if="msg.type === 'image'" class="msg-image" :src="msg.content" mode="widthFix" @tap="previewImage(msg.content)" />
              <text v-else class="msg-text">{{ msg.content }}</text>
            </view>
            <text class="msg-time">{{ formatTime(msg.createTime) }}</text>
          </view>
        </view>

        <!-- 自己的消息 -->
        <view v-else class="msg-right">
          <view class="msg-body">
            <view class="msg-bubble bubble-self">
              <image v-if="msg.type === 'image'" class="msg-image" :src="msg.content" mode="widthFix" @tap="previewImage(msg.content)" />
              <text v-else class="msg-text">{{ msg.content }}</text>
            </view>
            <text class="msg-time">{{ formatTime(msg.createTime) }}</text>
          </view>
          <image
            class="msg-avatar"
            :src="msg.userAvatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
        </view>
      </view>

      <view id="scroll-bottom" style="height: 20rpx;" />
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-area">
      <view class="input-row">
        <text class="img-btn" @tap="sendImage">📷</text>
        <input
          v-model="inputText"
          class="text-input"
          placeholder="输入消息..."
          confirm-type="send"
          @confirm="sendTextMsg"
        />
        <text class="send-btn" :class="{ disabled: !inputText.trim() }" @tap="sendTextMsg">发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { onLoad, onHide } from '@dcloudio/uni-app';
import { getLoginUser } from '../../store/user';
import { API_BASE } from '../../utils/config';
import { chooseAndUpload } from '../../utils/upload';
import { WsClient } from '../../utils/websocket';

interface ChatMsg {
  userId: number;
  userName?: string;
  userAvatar?: string;
  content: string;
  type?: 'text' | 'image';
  createTime?: string;
}

const classId = ref(0);
const className = ref('');
const messages = ref<ChatMsg[]>([]);
const inputText = ref('');
const loading = ref(false);
const onlineCount = ref(0);
const scrollAnchor = ref('');
const myUserId = ref(0);

let wsClient: WsClient | null = null;

onLoad((query: any) => {
  classId.value = Number(query?.id) || 0;
  className.value = query?.name || '班级聊天';
  const user = getLoginUser();
  myUserId.value = user?.id || 0;

  if (classId.value && myUserId.value) {
    connectWs();
  }
});

onHide(() => {
  wsClient?.close();
});

onUnmounted(() => {
  wsClient?.close();
});

function connectWs() {
  const token = uni.getStorageSync('token') || '';
  // WebSocket URL 构造：将 http 替换为 ws
  const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
  const wsUrl = `${wsBase}/api/auth/class/chat?classId=${classId.value}&token=${encodeURIComponent(token)}`;

  wsClient = new WsClient({
    url: wsUrl,
    onMessage: (data: any) => {
      handleWsMessage(data);
    },
    onOpen: () => {
      console.log('[ClassChat] WebSocket 已连接');
    },
    onClose: () => {
      console.log('[ClassChat] WebSocket 已断开');
    },
    onError: (err) => {
      console.warn('[ClassChat] WebSocket 错误:', err);
    },
  });
  wsClient.connect();
}

function handleWsMessage(data: any) {
  if (!data) return;

  // 处理不同消息类型
  if (data.type === 'online_count' || data.type === 'ONLINE_COUNT') {
    onlineCount.value = data.count || data.data || 0;
    return;
  }

  if (data.type === 'history' || data.type === 'HISTORY') {
    // 历史消息
    const historyList = data.messages || data.data || [];
    messages.value = historyList.map((m: any) => ({
      userId: m.userId || m.senderId,
      userName: m.userName || m.senderName,
      userAvatar: m.userAvatar || m.senderAvatar,
      content: m.content || m.message,
      type: m.messageType === 'IMAGE' ? 'image' : 'text',
      createTime: m.createTime,
    }));
    scrollToBottom();
    return;
  }

  // 普通聊天消息
  const msg: ChatMsg = {
    userId: data.userId || data.senderId,
    userName: data.userName || data.senderName,
    userAvatar: data.userAvatar || data.senderAvatar,
    content: data.content || data.message,
    type: data.messageType === 'IMAGE' ? 'image' : 'text',
    createTime: data.createTime || new Date().toISOString(),
  };
  messages.value.push(msg);
  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    scrollAnchor.value = '';
    nextTick(() => {
      scrollAnchor.value = 'scroll-bottom';
    });
  });
}

function sendTextMsg() {
  const text = inputText.value.trim();
  if (!text) return;

  const user = getLoginUser();
  wsClient?.send({
    type: 'CHAT',
    messageType: 'TEXT',
    classId: classId.value,
    userId: user?.id,
    content: text,
  });

  // 本地先显示
  messages.value.push({
    userId: myUserId.value,
    userName: user?.nickName || user?.userName,
    userAvatar: user?.userAvatar,
    content: text,
    type: 'text',
    createTime: new Date().toISOString(),
  });
  inputText.value = '';
  scrollToBottom();
}

async function sendImage() {
  try {
    const results = await chooseAndUpload('chat_image', 1);
    if (results.length > 0) {
      const user = getLoginUser();
      const url = results[0].url;

      wsClient?.send({
        type: 'CHAT',
        messageType: 'IMAGE',
        classId: classId.value,
        userId: user?.id,
        content: url,
      });

      messages.value.push({
        userId: myUserId.value,
        userName: user?.nickName || user?.userName,
        userAvatar: user?.userAvatar,
        content: url,
        type: 'image',
        createTime: new Date().toISOString(),
      });
      scrollToBottom();
    }
  } catch {}
}

function previewImage(url: string) {
  uni.previewImage({ current: url, urls: [url] });
}

function formatTime(t?: string) {
  if (!t) return '';
  const d = new Date(t);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 2rpx solid #eee;
}

.class-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.member-count {
  font-size: 24rpx;
  color: #52c41a;
  background: #f6ffed;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
}

/* 消息区域 */
.messages-area {
  flex: 1;
  padding: 20rpx 24rpx;
}

.empty-msg {
  text-align: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 消息行 */
.msg-row {
  margin-bottom: 24rpx;
}

.msg-left {
  display: flex;
  align-items: flex-start;
}

.msg-right {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}

.msg-body {
  margin: 0 16rpx;
  max-width: 65%;
}

.msg-name {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.msg-bubble {
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  word-break: break-all;
}

.bubble-other {
  background: #fff;
  border-top-left-radius: 4rpx;
}

.bubble-self {
  background: #1890ff;
  border-top-right-radius: 4rpx;
}

.bubble-self .msg-text {
  color: #fff;
}

.msg-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg-image {
  max-width: 400rpx;
  border-radius: 8rpx;
}

.msg-time {
  display: block;
  font-size: 20rpx;
  color: #bbb;
  margin-top: 6rpx;
}

.msg-right .msg-time {
  text-align: right;
}

/* 底部输入 */
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

.img-btn {
  font-size: 44rpx;
  padding: 4rpx;
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
</style>
