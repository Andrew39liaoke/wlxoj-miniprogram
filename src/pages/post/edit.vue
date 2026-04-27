<template>
  <view class="edit-page">
    <view class="form-group">
      <text class="label">标题</text>
      <input class="form-input" v-model="form.title" placeholder="请输入帖子标题" maxlength="100" />
    </view>

    <view class="form-group">
      <text class="label">分区</text>
      <picker :range="zones" @change="onZoneChange">
        <view class="picker-value">{{ form.zone || '请选择分区' }}</view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">标签（逗号分隔）</text>
      <input class="form-input" v-model="tagsInput" placeholder="如: Java,算法,动态规划" />
    </view>

    <view class="form-group">
      <text class="label">封面图（可选）</text>
      <view class="cover-area" @click="chooseCover">
        <image v-if="form.cover" class="cover-preview" :src="form.cover" mode="aspectFill" />
        <text v-else class="cover-placeholder">+ 选择封面</text>
      </view>
    </view>

    <view class="form-group">
      <text class="label">正文</text>
      <textarea class="form-textarea" v-model="form.content" placeholder="请输入帖子内容" maxlength="10000" />
    </view>

    <button class="submit-btn" :loading="submitting" :disabled="submitting" @click="handleSubmit">发 布</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { post } from "../../utils/request";
import { chooseAndUpload } from "../../utils/upload";

const zones = ["学习交流", "题目讨论", "经验分享", "求助", "其他"];
const form = reactive({ title: "", zone: "", content: "", cover: "" });
const tagsInput = ref("");
const submitting = ref(false);

function onZoneChange(e: any) {
  form.zone = zones[e.detail.value];
}

async function chooseCover() {
  try {
    const results = await chooseAndUpload("post_cover", 1);
    if (results.length) form.cover = results[0].url;
  } catch { /* cancel */ }
}

async function handleSubmit() {
  if (!form.title.trim()) { uni.showToast({ title: "请输入标题", icon: "none" }); return; }
  if (!form.zone) { uni.showToast({ title: "请选择分区", icon: "none" }); return; }
  if (!form.content.trim()) { uni.showToast({ title: "请输入内容", icon: "none" }); return; }

  submitting.value = true;
  try {
    const tags = tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    await post("/api/post/save", {
      title: form.title.trim(),
      zone: form.zone,
      content: form.content.trim(),
      tags,
      cover: form.cover || undefined,
    });
    uni.showToast({ title: "发布成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (err: any) {
    uni.showToast({ title: err?.message || "发布失败", icon: "none" });
  } finally { submitting.value = false; }
}
</script>

<style scoped>
.edit-page { background: #fff; min-height: 100vh; padding: 24rpx 32rpx; }
.form-group { margin-bottom: 32rpx; }
.label { display: block; font-size: 28rpx; color: #333; font-weight: 600; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 80rpx; background: #f7f8fa; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-value { height: 80rpx; line-height: 80rpx; background: #f7f8fa; border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; color: #666; }
.cover-area { width: 240rpx; height: 180rpx; background: #f7f8fa; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.cover-preview { width: 100%; height: 100%; }
.cover-placeholder { color: #999; font-size: 28rpx; }
.form-textarea { width: 100%; height: 400rpx; background: #f7f8fa; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; box-sizing: border-box; }
.submit-btn { margin-top: 40rpx; height: 88rpx; background: #1890ff; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; }
.submit-btn[disabled] { opacity: 0.6; }
</style>
