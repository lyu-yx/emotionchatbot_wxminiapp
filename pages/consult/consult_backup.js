Page({
  data: {
    questions: [
      "请问您哪里不舒服？",
      "症状持续了多久？",
      "是否伴随发热？",
      "是否咳嗽或头痛？",
      "您的性别和年龄？"
    ],
    messageList: [],               // 对话消息列表
    inputText: "",                 // 当前输入文本
    inputMode: wx.getStorageSync("inputMode") || "语音输入",
    showVoiceInput: false,         // 控制语音输入组件显示
    currentQuestionIndex: 0,       // 当前问题索引
    isWaitingResponse: false,      // 是否等待系统回复
    isConsultFinished: false,      // 问诊是否完成
    scrollIntoView: "",            // 滚动到指定消息
    isInputDisabled: false,        // 输入是否禁用
    isRecording: false,            // 是否正在录音
    voiceRecognitionResult: "",    // 语音识别结果缓存
    isTTSPlaying: false,           // TTS是否正在播放
    silenceTimer: null,            // 静音检测定时器
    silenceThreshold: 1500,        // 静音阈值1.5秒
    autoVoiceMode: false           // 自动语音模式
  },questions: [
      "请问您哪里不舒服？",
      "症状持续了多久？",
      "是否伴随发热？",
      "是否咳嗽或头痛？",
      "您的性别和年龄？"
    ],
    messageList: [],               // 对话消息列表
    inputText: "",                 // 当前输入文本
    inputMode: "语音输入",         // 默认输入模式
    showVoiceInput: false,         // 控制语音输入组件显示
    currentQuestionIndex: 0,       // 当前问题索引
    isWaitingResponse: false,      // 是否等待系统回复
    isConsultFinished: false,      // 问诊是否完成
    scrollIntoView: "",            // 滚动到指定消息
    isInputDisabled: false,        // 输入是否禁用
    isRecording: false,            // 是否正在录音
    voiceRecognitionResult: ""     // 语音识别结果缓存
  },

  onLoad() {
    console.log('问诊页面开始加载');
    
    try {
      // 确保基本数据存在
      if (!this.data.questions || this.data.questions.length === 0) {
        console.error('问题列表为空');
        wx.showToast({
          title: '问题加载失败',
          icon: 'none'
        });
        return;
      }
      
      // 从缓存读取输入模式
      const savedInputMode = wx.getStorageSync("inputMode");
      if (savedInputMode) {
        this.setData({ inputMode: savedInputMode });
        console.log('读取到保存的输入模式:', savedInputMode);
      }
      
      // 强制设置一些基本状态，确保页面能正常显示
      this.setData({
        isWaitingResponse: false,
        isConsultFinished: false,
        isInputDisabled: false,
        isRecording: false,
        currentQuestionIndex: 0,
        messageList: [],
        inputText: "",
        scrollIntoView: ""
      });
      
      console.log('基本状态已重置');
      
      // 初始化对话，添加第一条系统消息
      setTimeout(() => {
        this.initializeChat();
      }, 100);
      
      console.log('问诊页面加载完成');
    } catch (error) {
      console.error('问诊页面加载出错:', error);
      wx.showToast({
        title: '页面初始化失败',
        icon: 'none'
      });
      
      // 即使出错也要确保页面有基本内容
      this.setData({
        messageList: [{
          id: 'error_msg',
          role: 'system',
          text: '抱歉，页面初始化遇到问题，请重新进入。',
          timestamp: new Date().toISOString(),
          formattedTime: '刚刚',
          typing: false
        }]
      });
    }
  },

  /**
   * 初始化聊天对话
   */
  initializeChat() {
    console.log('开始初始化聊天对话');
    
    try {
      const firstQuestion = this.data.questions[0];
      const timestamp = new Date().toISOString();
      
      console.log('第一个问题:', firstQuestion);
      
      const welcomeMessage = {
        id: this.generateMessageId(),
        role: "system",
        text: "您好！我是您的医疗助手，接下来我会问您几个问题来了解您的症状。",
        timestamp: timestamp,
        formattedTime: this.formatTime(timestamp),
        typing: false
      };
      
      const firstQuestionMessage = {
        id: this.generateMessageId(),
        role: "system", 
        text: firstQuestion,
        timestamp: timestamp,
        formattedTime: this.formatTime(timestamp),
        typing: false
      };

      const initialMessages = [welcomeMessage, firstQuestionMessage];
      
      this.setData({
        messageList: initialMessages,
        currentQuestionIndex: 0
      });

      console.log('消息列表已设置:', initialMessages);

      // 滚动到最新消息
      this.scrollToBottom();
      
      console.log('聊天对话初始化完成');
    } catch (error) {
      console.error('初始化聊天对话出错:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * 文字输入处理
   */
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({
        title: '请输入回答内容',
        icon: 'none'
      });
      return;
    }

    if (this.data.isWaitingResponse || this.data.isConsultFinished) {
      return;
    }

    // 添加用户消息
    const timestamp = new Date().toISOString();
    const userMessage = {
      id: this.generateMessageId(),
      role: "user",
      text: text,
      timestamp: timestamp,
      formattedTime: this.formatTime(timestamp),
      typing: false
    };

    this.setData({
      messageList: [...this.data.messageList, userMessage],
      inputText: "",
      isWaitingResponse: true,
      isInputDisabled: true
    });

    this.scrollToBottom();

    try {
      // 检查回答相关性（可选）
      const isRelevant = await this.checkAnswerRelevance(text);
      
      if (!isRelevant) {
        // 如果回答不相关，给出提示
        await this.addSystemMessage(
          "您的回答似乎与问题不太相关，能否请您重新回答一下？",
          true
        );
        this.setData({ 
          isWaitingResponse: false,
          isInputDisabled: false 
        });
        return;
      }

      // 处理下一个问题
      await this.processNextQuestion();
      
    } catch (error) {
      console.error('发送消息错误:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
      this.setData({ 
        isWaitingResponse: false,
        isInputDisabled: false 
      });
    }
  },

  /**
   * 检查回答相关性
   * @param {string} answer - 用户回答
   */
  async checkAnswerRelevance(answer) {
    try {
      // 如果不需要相关性检查，直接返回 true
      return true;
      
      // TODO: 调用云函数进行相关性检查
      /*
      const result = await wx.cloud.callFunction({
        name: 'check_relevance',
        data: {
          question: this.data.questions[this.data.currentQuestionIndex],
          answer: answer,
          questionIndex: this.data.currentQuestionIndex
        }
      });
      
      return result.result && result.result.isRelevant;
      */
    } catch (error) {
      console.error('相关性检查失败:', error);
      // 检查失败时默认认为相关
      return true;
    }
  },

  /**
   * 处理下一个问题
   */
  async processNextQuestion() {
    const nextIndex = this.data.currentQuestionIndex + 1;
    
    if (nextIndex < this.data.questions.length) {
      // 还有更多问题
      const nextQuestion = this.data.questions[nextIndex];
      
      // 添加系统消息（下一个问题）
      await this.addSystemMessage(nextQuestion, true);
      
      this.setData({
        currentQuestionIndex: nextIndex,
        isWaitingResponse: false,
        isInputDisabled: false
      });
      
    } else {
      // 所有问题完成
      await this.addSystemMessage(
        "感谢您的配合！所有问题已经回答完毕，正在为您生成健康建议...",
        true
      );
      
      this.setData({
        isConsultFinished: true,
        isWaitingResponse: false,
        isInputDisabled: true
      });

      // 保存问答记录并跳转
      this.saveRecordsAndNavigate();
    }
  },

  /**
   * 添加系统消息（带打字效果）
   * @param {string} text - 消息内容
   * @param {boolean} withTyping - 是否显示打字效果
   */
  async addSystemMessage(text, withTyping = false) {
    const messageId = this.generateMessageId();
    const timestamp = new Date().toISOString();
    
    if (withTyping) {
      // 先添加打字中的消息
      const typingMessage = {
        id: messageId,
        role: "system",
        text: "",
        timestamp: timestamp,
        formattedTime: this.formatTime(timestamp),
        typing: true
      };
      
      this.setData({
        messageList: [...this.data.messageList, typingMessage]
      });
      
      this.scrollToBottom();
      
      // 模拟打字延迟
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }
    
    // 更新为实际消息内容
    const actualMessage = {
      id: messageId,
      role: "system",
      text: text,
      timestamp: timestamp,
      formattedTime: this.formatTime(timestamp),
      typing: false
    };
    
    if (withTyping) {
      // 替换打字中的消息
      const messageList = [...this.data.messageList];
      const lastIndex = messageList.length - 1;
      messageList[lastIndex] = actualMessage;
      
      this.setData({ messageList });
    } else {
      // 直接添加消息
      this.setData({
        messageList: [...this.data.messageList, actualMessage]
      });
    }
    
    this.scrollToBottom();
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    const messageList = this.data.messageList;
    if (messageList.length > 0) {
      const lastMessage = messageList[messageList.length - 1];
      this.setData({
        scrollIntoView: `msg_${lastMessage.id}`
      });
    }
  },

  /**
   * 保存记录并跳转到总结页
   */
  saveRecordsAndNavigate() {
    // 提取问答记录
    const qaRecords = [];
    let currentQuestionIndex = 0;
    
    for (let i = 0; i < this.data.messageList.length; i++) {
      const message = this.data.messageList[i];
      
      if (message.role === "system" && this.data.questions.includes(message.text)) {
        // 这是一个问题消息
        const questionText = message.text;
        
        // 查找下一个用户消息作为答案
        for (let j = i + 1; j < this.data.messageList.length; j++) {
          const nextMessage = this.data.messageList[j];
          if (nextMessage.role === "user") {
            qaRecords.push({
              question: questionText,
              answer: nextMessage.text,
              questionIndex: currentQuestionIndex,
              timestamp: nextMessage.timestamp
            });
            currentQuestionIndex++;
            break;
          }
        }
      }
    }
    
    // 保存到本地存储
    wx.setStorageSync("qaRecords", qaRecords);
    wx.setStorageSync("chatHistory", this.data.messageList);
    
    // 延迟跳转，让用户看到完成消息
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/summary/summary'
      });
    }, 2000);
  },

  /**
   * 开始语音输入 - 直接录音，不弹出组件
   */
  startVoiceInput() {
    if (this.data.isInputDisabled || this.data.isConsultFinished || this.data.isRecording) {
      return;
    }

    // 检查麦克风权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.doStartDirectRecording();
      },
      fail: () => {
        wx.showModal({
          title: '权限申请',
          content: '需要获取麦克风权限进行语音输入',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  /**
   * 直接开始录音
   */
  doStartDirectRecording() {
    // 初始化录音管理器
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager();
      this.initDirectRecorderEvents();
    }

    // 设置录音状态
    this.setData({ isRecording: true });

    // 显示录音状态
    wx.showLoading({
      title: '长按录音，松开结束',
      mask: true
    });

    // 开始录音
    this.recorderManager.start({
      duration: 60000, // 60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });

    // 5秒后自动停止录音（如果用户还在录音）
    this.recordingTimer = setTimeout(() => {
      if (this.data.isRecording) {
        this.stopVoiceInput();
      }
    }, 5000);
  },

  /**
   * 停止语音输入
   */
  stopVoiceInput() {
    if (!this.data.isRecording) {
      return;
    }

    // 清除定时器
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    // 停止录音
    this.recorderManager.stop();
    this.setData({ isRecording: false });
  },

  /**
   * 初始化直接录音事件
   */
  initDirectRecorderEvents() {
    const that = this;

    // 录音开始事件
    this.recorderManager.onStart(() => {
      console.log('录音开始');
    });

    // 录音结束事件
    this.recorderManager.onStop((res) => {
      console.log('录音结束', res);
      wx.hideLoading();
      
      if (res.tempFilePath) {
        // 显示语音识别状态
        wx.showLoading({
          title: '语音识别中...',
          mask: true
        });
        
        that.processDirectVoiceRecognition(res.tempFilePath);
      }
    });

    // 录音错误事件
    this.recorderManager.onError((err) => {
      console.error('录音错误:', err);
      wx.hideLoading();
      
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 处理直接语音识别
   */
  async processDirectVoiceRecognition(audioPath) {
    try {
      // 调用云函数进行语音识别
      const result = await this.callASRCloudFunction(audioPath);
      
      wx.hideLoading();
      
      if (result.success) {
        // 识别成功，设置到输入框
        this.setData({ 
          inputText: result.text
        });
        
        wx.showToast({
          title: '识别成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message || '语音识别失败');
      }
      
    } catch (error) {
      console.error('语音识别错误:', error);
      wx.hideLoading();
      
      wx.showToast({
        title: error.message || '识别失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 调用ASR云函数
   */
  async callASRCloudFunction(audioPath) {
    return new Promise((resolve, reject) => {
      // 读取音频文件
      wx.getFileSystemManager().readFile({
        filePath: audioPath,
        success: (fileRes) => {
          // 调用云函数
          wx.cloud.callFunction({
            name: 'asr',
            data: {
              audioBuffer: fileRes.data,
              format: 'mp3',
              sampleRate: 16000
            },
            success: (res) => {
              console.log('ASR云函数调用成功:', res);
              if (res.result && res.result.success) {
                resolve({
                  success: true,
                  text: res.result.text || ''
                });
              } else {
                resolve({
                  success: false,
                  message: res.result?.message || '语音识别失败'
                });
              }
            },
            fail: (err) => {
              console.error('ASR云函数调用失败:', err);
              reject(new Error('网络请求失败'));
            }
          });
        },
        fail: (err) => {
          console.error('读取音频文件失败:', err);
          reject(new Error('读取音频文件失败'));
        }
      });
    });
  },

  /**
   * 语音识别成功回调
   * @param {Object} e - 事件对象
   */
  onVoiceSuccess(e) {
    const { text, audioPath, duration } = e.detail;
    console.log('语音识别成功:', { text, audioPath, duration });
    
    // 设置识别结果到输入框
    this.setData({ 
      inputText: text,
      showVoiceInput: false 
    });
    
    wx.showToast({
      title: '语音识别成功',
      icon: 'success'
    });
  },

  /**
   * 语音识别错误回调
   * @param {Object} e - 事件对象
   */
  onVoiceError(e) {
    const { error } = e.detail;
    console.error('语音识别失败:', error);
    
    this.setData({ showVoiceInput: false });
    
    wx.showToast({
      title: '语音识别失败，请重试',
      icon: 'none'
    });
  },

  /**
   * 取消语音输入
   */
  onVoiceCancel() {
    this.setData({ showVoiceInput: false });
  },

  /**
   * 关闭语音输入组件
   */
  onVoiceClose() {
    this.setData({ showVoiceInput: false });
  },

  /**
   * 切换输入模式
   */
  switchInputMode(e) {
    // 从按钮的 data-mode 属性获取目标模式
    const newMode = e.currentTarget.dataset.mode;
    
    // 如果已经是当前模式，则不执行任何操作
    if (newMode === this.data.inputMode) {
      return;
    }

    // 更新输入模式
    this.setData({ inputMode: newMode });
    wx.setStorageSync("inputMode", newMode);

    // 如果切换到语音输入模式，不自动开始录音，等待用户手动点击录音按钮
    if (newMode === '语音输入') {
      // 检查是否可以进行语音输入
      if (this.data.isInputDisabled || this.data.isConsultFinished) {
        return;
      }
      
      // 清空之前的输入内容，准备语音输入
      this.setData({
        inputText: "",
        voiceRecognitionResult: ""
      });
      
      wx.showToast({
        title: '语音模式已激活',
        icon: 'success',
        duration: 1500
      });
    }
  },

  /**
   * 重新开始问诊
   */
  restartConsult() {
    wx.showModal({
      title: '确认重新开始',
      content: '重新开始将清空当前所有对话记录',
      success: (res) => {
        if (res.confirm) {
          // 停止录音（如果正在录音）
          if (this.data.isRecording && this.recorderManager) {
            this.recorderManager.stop();
          }
          
          // 清除录音定时器
          if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
          }
          
          this.setData({
            messageList: [],
            inputText: "",
            currentQuestionIndex: 0,
            isWaitingResponse: false,
            isConsultFinished: false,
            isInputDisabled: false,
            isRecording: false,
            voiceRecognitionResult: ""
          });
          
          wx.removeStorageSync("qaRecords");
          wx.removeStorageSync("chatHistory");
          
          // 重新初始化对话
          this.initializeChat();
        }
      }
    });
  },

  /**
   * 格式化时间显示
   * @param {string} timestamp - ISO时间戳
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 如果是今天
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 如果是更早的日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
});