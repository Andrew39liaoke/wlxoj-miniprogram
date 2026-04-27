/**
 * 文件上传封装
 * 基于 uni.uploadFile，自动带 Authorization
 */
import { API_BASE } from './config';

export interface UploadOptions {
  /** 文件路径（本地临时路径） */
  filePath: string;
  /** 业务类型，如 avatar、post_content、post_cover、chat_image */
  biz: string;
  /** 表单字段名，默认 file */
  name?: string;
}

export interface UploadResult {
  url: string;
}

/**
 * 上传文件到后端
 * 接口：POST /api/file/upload?biz=xxx
 */
export function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const token = uni.getStorageSync('token') || '';

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE}/api/file/upload?biz=${encodeURIComponent(options.biz)}`,
      filePath: options.filePath,
      name: options.name || 'file',
      header: {
        Authorization: token,
      },
      success: (res) => {
        try {
          const body = JSON.parse(res.data);
          if (body?.code === 0) {
            resolve(body.data);
          } else {
            uni.showToast({ title: body?.message || '上传失败', icon: 'none' });
            reject(body);
          }
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

/**
 * 选择图片并上传
 */
export function chooseAndUpload(biz: string, count = 1): Promise<UploadResult[]> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      success: async (res) => {
        try {
          const results: UploadResult[] = [];
          for (const filePath of res.tempFilePaths) {
            const result = await uploadFile({ filePath, biz });
            results.push(result);
          }
          resolve(results);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}
