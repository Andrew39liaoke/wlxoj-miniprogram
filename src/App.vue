<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { checkLogin } from "./store/user";

onLaunch(async () => {
  // 启动时检查登录状态
  const loggedIn = await checkLogin();
  if (!loggedIn) {
    // 未登录，跳转登录页
    uni.reLaunch({ url: "/pages/auth/login" });
  }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 28rpx;
  color: #333;
}

/* 安全区域 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
