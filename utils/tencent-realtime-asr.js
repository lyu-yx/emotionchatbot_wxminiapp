/**
 * 腾讯云实时语音识别工具类
 * 基于WebSocket实现实时语音识别
 */

class TencentRealtimeASR {
  constructor(config) {
    this.config = config;
    this.websocket = null;
    this.voiceId = null;
    this.isConnected = false;
    this.isRecording = false;
    this.recorderManager = null;
    this.audioBuffer = [];
    
    // 回调函数
    this.onResult = null;           // 识别结果回调
    this.onError = null;            // 错误回调
    this.onStart = null;            // 开始回调
    this.onEnd = null;              // 结束回调
    this.onConnect = null;          // 连接成功回调
    this.onDisconnect = null;       // 断开连接回调
    
    console.log('TencentRealtimeASR 初始化完成');
  }
  
  /**
   * 开始实时语音识别
   */
  async start() {
    try {
      console.log('开始启动实时语音识别...');
      
      // 1. 获取WebSocket连接参数
      const sessionResult = await this.startASRSession();
      if (!sessionResult.success) {
        throw new Error(sessionResult.message);
      }
      
      this.voiceId = sessionResult.voice_id;
      console.log('获取到voice_id:', this.voiceId);
      
      // 2. 建立WebSocket连接
      await this.connectWebSocket(sessionResult.ws_url);
      
      // 3. 开始录音
      await this.startRecording();
      
      console.log('实时语音识别启动成功');
      
      if (this.onStart) {
        this.onStart();
      }
      
    } catch (error) {
      console.error('启动实时语音识别失败:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }
    /**
   * 停止实时语音识别
   */
  async stop() {
    console.log('停止实时语音识别...');
    
    try {
      // 1. 停止录音
      await this.stopRecording();
      
      // 2. 发送结束信号
      if (this.isConnected) {
        wx.sendSocketMessage({
          data: JSON.stringify({ type: 'end' }),
          success: () => {
            console.log('发送结束信号成功');
          },
          fail: (err) => {
            console.error('发送结束信号失败:', err);
          }
        });
      }
      
      // 3. 关闭WebSocket连接
      if (this.isConnected) {
        wx.closeSocket();
      }
      
      this.isConnected = false;
      this.isRecording = false;
      
      console.log('实时语音识别已停止');
      
      if (this.onEnd) {
        this.onEnd();
      }
      
    } catch (error) {
      console.error('停止实时语音识别失败:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }
  
  /**
   * 获取ASR会话参数
   */
  async startASRSession() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'realtime-asr',
        data: {
          action: 'start',
          config: this.config
        },
        success: (res) => {
          console.log('获取ASR会话参数成功:', res);
          if (res.result && res.result.success) {
            resolve(res.result);
          } else {
            reject(new Error(res.result?.message || '获取会话参数失败'));
          }
        },
        fail: (err) => {
          console.error('获取ASR会话参数失败:', err);
          reject(new Error(`云函数调用失败: ${err.errMsg}`));
        }
      });
    });
  }
  /**
   * 建立WebSocket连接
   */
  async connectWebSocket(wsUrl) {
    return new Promise((resolve, reject) => {
      console.log('正在连接WebSocket...');
      console.log('URL长度:', wsUrl.length);
      console.log('URL前200字符:', wsUrl.substring(0, 200));
      
      // 微信小程序WebSocket连接
      this.websocket = wx.connectSocket({
        url: wsUrl,
        header: {
          'Content-Type': 'application/json'
        },
        protocols: [], // 实时语音识别不需要特殊协议
        success: () => {
          console.log('WebSocket连接请求发送成功');
        },
        fail: (err) => {
          console.error('WebSocket连接请求失败:', err);
          reject(new Error(`WebSocket连接请求失败: ${JSON.stringify(err)}`));
        }
      });
      
      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        console.error('WebSocket连接超时');
        reject(new Error('WebSocket连接超时'));
      }, 10000);
      
      // 连接打开事件
      wx.onSocketOpen(() => {
        console.log('WebSocket连接已建立');
        clearTimeout(connectTimeout);
        this.isConnected = true;
        
        if (this.onConnect) {
          this.onConnect();
        }
        
        resolve();
      });
      
      // 接收消息事件
      wx.onSocketMessage((res) => {
        this.handleWebSocketMessage(res.data);
      });
      
      // 连接错误事件
      wx.onSocketError((err) => {
        console.error('WebSocket连接错误:', err);
        clearTimeout(connectTimeout);
        this.isConnected = false;
        
        if (this.onError) {
          this.onError(new Error(`WebSocket连接失败: ${JSON.stringify(err)}`));
        }
        
        reject(new Error(`WebSocket连接失败: ${JSON.stringify(err)}`));
      });
      
      // 连接关闭事件
      wx.onSocketClose((res) => {
        console.log('WebSocket连接已关闭:', res);
        clearTimeout(connectTimeout);
        this.isConnected = false;
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
      });
    });
  }
    /**
   * 处理WebSocket消息
   */
  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('收到WebSocket消息:', message);
      
      if (message.code === 0) {
        // 成功消息
        if (message.result) {
          // 识别结果
          this.handleRecognitionResult(message.result);
        } else if (message.final === 1) {
          // 识别完成
          console.log('语音识别完成');
          this.stop();
        } else if (message.message === 'success' && message.voice_id) {
          // 握手成功消息
          console.log('WebSocket握手成功，voice_id:', message.voice_id);
        }
      } else {
        // 错误消息
        console.error('ASR服务返回错误:', message);
        
        // 针对不同错误码提供具体的错误处理
        let errorMessage = '';
        switch (message.code) {
          case 4001:
            errorMessage = '参数不合法，请检查配置参数';
            break;
          case 4002:
            errorMessage = '鉴权失败，请检查AppId、SecretId和SecretKey配置';
            break;
          case 4003:
            errorMessage = 'AppID服务未开通，请在控制台开通语音识别服务';
            break;
          case 4004:
            errorMessage = '资源包耗尽，请开通后付费或购买资源包';
            break;
          case 4005:
            errorMessage = '账户欠费停止服务，请及时充值';
            break;
          case 4006:
            errorMessage = '账号当前调用并发超限';
            break;
          case 4007:
            errorMessage = '音频解码失败，请检查音频格式';
            break;
          case 4008:
            errorMessage = '客户端超过15秒未发送音频数据';
            break;
          default:
            errorMessage = message.message || '语音识别服务错误';
        }
        
        if (this.onError) {
          this.onError(new Error(`[${message.code}] ${errorMessage}`));
        }
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
      console.error('原始消息数据:', data);
    }
  }
  
  /**
   * 处理识别结果
   */
  handleRecognitionResult(result) {
    console.log('识别结果:', result);
    
    if (this.onResult) {
      this.onResult({
        text: result.voice_text_str || '',
        slice_type: result.slice_type,
        index: result.index,
        start_time: result.start_time,
        end_time: result.end_time,
        is_final: result.slice_type === 2 // slice_type=2表示稳态结果
      });
    }
  }
    /**
   * 开始录音
   */
  async startRecording() {
    return new Promise((resolve, reject) => {
      if (!this.recorderManager) {
        this.recorderManager = wx.getRecorderManager();
        this.initRecorderEvents();
      }
      
      console.log('开始录音（PCM格式，适配实时语音识别）...');
      
      // 腾讯云实时语音识别要求PCM格式
      this.recorderManager.start({
        duration: 300000, // 5分钟最大时长
        sampleRate: 16000, // 16kHz采样率
        numberOfChannels: 1, // 单声道
        encodeBitRate: 48000, // PCM位率
        format: 'pcm', // PCM格式（实时语音识别要求）
        frameSize: 20 // 20ms一帧（实时识别建议）
      });
      
      this.isRecording = true;
      resolve();
    });
  }
  
  /**
   * 停止录音
   */
  async stopRecording() {
    if (this.recorderManager && this.isRecording) {
      console.log('停止录音...');
      this.recorderManager.stop();
      this.isRecording = false;
    }
  }
  
  /**
   * 初始化录音事件
   */
  initRecorderEvents() {
    const that = this;
    
    this.recorderManager.onStart(() => {
      console.log('录音开始');
    });
    
    this.recorderManager.onStop((res) => {
      console.log('录音结束:', res);
      this.isRecording = false;
    });
    
    this.recorderManager.onFrameRecorded((res) => {
      // 接收到音频帧数据
      if (that.isConnected && res.frameBuffer) {
        // 将音频帧发送给WebSocket
        that.sendAudioFrame(res.frameBuffer);
      }
    });
    
    this.recorderManager.onError((err) => {
      console.error('录音错误:', err);
      this.isRecording = false;
      
      if (that.onError) {
        that.onError(new Error('录音失败'));
      }
    });
  }
  /**
   * 发送音频帧到WebSocket
   */
  sendAudioFrame(frameBuffer) {
    if (this.isConnected) {
      try {
        // 使用微信小程序的发送二进制数据方法
        wx.sendSocketMessage({
          data: frameBuffer,
          success: () => {
            // console.log('音频帧发送成功');
          },
          fail: (err) => {
            console.error('音频帧发送失败:', err);
          }
        });
      } catch (error) {
        console.error('发送音频帧异常:', error);
      }
    }
  }

  /**
   * 检查录音权限
   */
  async checkPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record'] === true) {
            // 已授权
            resolve(true);
          } else if (res.authSetting['scope.record'] === false) {
            // 权限被拒绝
            reject(new Error('录音权限被拒绝，请到设置中开启'));
          } else {
            // 未申请过权限，申请权限
            wx.authorize({
              scope: 'scope.record',
              success: () => resolve(true),
              fail: () => reject(new Error('录音权限申请失败'))
            });
          }
        },
        fail: () => {
          // 获取设置失败，尝试直接申请权限
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(true),
            fail: () => reject(new Error('录音权限申请失败'))
          });
        }
      });
    });
  }
}

module.exports = TencentRealtimeASR;
