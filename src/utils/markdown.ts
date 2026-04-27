/**
 * 轻量 Markdown → HTML 转换器
 * 专为微信小程序 rich-text 组件设计，支持常用语法
 */

/** 转义 HTML 特殊字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 将 Markdown 文本转换为 HTML 字符串
 * 支持：标题、粗体、斜体、行内代码、代码块、列表、分割线、换行
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';

  // 按行处理
  const lines = md.split('\n');
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let inList = false;
  let listType = ''; // 'ul' | 'ol'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块 ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        htmlLines.push(
          `<pre style="background:#f6f8fa;padding:16rpx 20rpx;border-radius:8rpx;overflow-x:auto;font-size:24rpx;line-height:1.6;color:#333;font-family:monospace;">${escapeHtml(codeContent.trimEnd())}</pre>`
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        // 关闭列表
        if (inList) {
          htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
          inList = false;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    const trimmed = line.trim();

    // 空行：关闭列表
    if (!trimmed) {
      if (inList) {
        htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
      }
      htmlLines.push('<br/>');
      continue;
    }

    // 分割线
    if (/^[-*_]{3,}$/.test(trimmed)) {
      if (inList) {
        htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
      }
      htmlLines.push('<hr style="border:none;border-top:1rpx solid #e8e8e8;margin:16rpx 0;"/>');
      continue;
    }

    // 标题 h1-h6
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) {
        htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
      }
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = { 1: '40rpx', 2: '36rpx', 3: '32rpx', 4: '30rpx', 5: '28rpx', 6: '26rpx' };
      const content = inlineFormat(headingMatch[2]);
      htmlLines.push(
        `<div style="font-size:${sizes[level]};font-weight:bold;color:#333;margin:20rpx 0 12rpx;">${content}</div>`
      );
      continue;
    }

    // 无序列表
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        htmlLines.push('<ul style="padding-left:40rpx;margin:8rpx 0;">');
        inList = true;
        listType = 'ul';
      }
      htmlLines.push(`<li style="font-size:28rpx;color:#555;line-height:1.8;">${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // 有序列表
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        htmlLines.push('<ol style="padding-left:40rpx;margin:8rpx 0;">');
        inList = true;
        listType = 'ol';
      }
      htmlLines.push(`<li style="font-size:28rpx;color:#555;line-height:1.8;">${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // 普通段落
    if (inList) {
      htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
      inList = false;
    }
    htmlLines.push(`<p style="font-size:28rpx;color:#555;line-height:1.8;margin:8rpx 0;">${inlineFormat(trimmed)}</p>`);
  }

  // 收尾
  if (inCodeBlock && codeContent) {
    htmlLines.push(
      `<pre style="background:#f6f8fa;padding:16rpx 20rpx;border-radius:8rpx;overflow-x:auto;font-size:24rpx;line-height:1.6;color:#333;font-family:monospace;">${escapeHtml(codeContent.trimEnd())}</pre>`
    );
  }
  if (inList) {
    htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
  }

  return htmlLines.join('');
}

/**
 * 行内格式化：粗体、斜体、行内代码、链接
 */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);

  // 行内代码 `code`
  result = result.replace(
    /`([^`]+)`/g,
    '<span style="background:#f0f0f0;padding:2rpx 10rpx;border-radius:6rpx;font-size:24rpx;font-family:monospace;color:#c7254e;">$1</span>'
  );

  // 粗斜体 ***text*** 或 ___text___
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // 粗体 **text** 或 __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 斜体 *text* 或 _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');

  return result;
}
