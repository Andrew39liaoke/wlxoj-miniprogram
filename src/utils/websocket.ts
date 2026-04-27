/**
 * WebSocket 封装
 * 基于 uni.connectSocket，支持断线重连
 * 用于班级聊天（阶段六实现，此处先搭好骨架）
 */

export interface WsOptions {
  /** WebSocket 完整 URL（含 token 和 classId） */
  url: string;
  /** 收到消息回调 */
  onMessage: (data: any) => void;
  /** 连接打开回调 */
  onOpen?: () => void;
  /** 连接关闭回调 */
  onClose?: () => void;
  /** 连接错误回调 */
  onError?: (err: any) => void;
  /** 最大重连次数，默认 5 */
  maxRetry?: number;
  /** 重连间隔(ms)，默认 3000 */
  retryInterval?: number;
}

export class WsClient {
  private socketTask: UniApp.SocketTask | null = null;
  private options: WsOptions;
  private retryCount = 0;
  private closed = false;

  constructor(options: WsOptions) {
    this.options = options;
  }

  /** 建立连接 */
  connect() {
    this.closed = false;
    this.retryCount = 0;
    this._doConnect();
  }

  private _doConnect() {
    if (this.closed) return;

    this.socketTask = uni.connectSocket({
      url: this.options.url,
      success: () => {},
    });

    this.socketTask.onOpen(() => {
      this.retryCount = 0;
      this.options.onOpen?.();
    });

    this.socketTask.onMessage((res) => {
      try {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        this.options.onMessage(data);
      } catch {
        this.options.onMessage(res.data);
      }
    });

    this.socketTask.onClose(() => {
      this.options.onClose?.();
      this._tryReconnect();
    });

    this.socketTask.onError((err) => {
      this.options.onError?.(err);
      this._tryReconnect();
    });
  }

  private _tryReconnect() {
    if (this.closed) return;
    const maxRetry = this.options.maxRetry ?? 5;
    const interval = this.options.retryInterval ?? 3000;

    if (this.retryCount < maxRetry) {
      this.retryCount++;
      console.log(`[WS] 第 ${this.retryCount} 次重连...`);
      setTimeout(() => this._doConnect(), interval);
    } else {
      console.warn('[WS] 达到最大重连次数，停止重连');
    }
  }

  /** 发送消息 */
  send(data: any) {
    if (!this.socketTask) return;
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    this.socketTask.send({ data: msg });
  }

  /** 主动关闭连接 */
  close() {
    this.closed = true;
    this.socketTask?.close({});
    this.socketTask = null;
  }
}
