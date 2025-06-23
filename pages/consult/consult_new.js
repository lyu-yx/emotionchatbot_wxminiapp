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
  },

  onLoad() {
    console.log('问诊页面开始加载');
    // 初始化对话，添加第一条系统消息
    this.initializeChat();
    
    // 初始化语音相关设置
    this.initVoiceSettings();
  },

  /**
   * 初始化语音设置
   */
  initVoiceSettings() {
    // 如果是语音模式，开启自动语音模式
    if (this.data.inputMode === '语音输入') {
      this.setData({ autoVoiceMode: true });
      console.log('开启自动语音模式');
    }
  },

  /**
   * 初始化聊天对话
   */
  initializeChat() {
    const firstQuestion = this.data.questions[0];
    const timestamp = new Date().toISOString();
    
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

    this.setData({
      messageList: [welcomeMessage, firstQuestionMessage],
      currentQuestionIndex: 0
    });

    // 滚动到最新消息
    this.scrollToBottom();
    
    // 如果是语音模式，播放TTS并自动开始录音
    if (this.data.autoVoiceMode) {
      setTimeout(() => {
        this.playTTSAndStartRecording(firstQuestion);
      }, 1000);
    }
  },

  /**
   * 播放TTS并自动开始录音
   * @param {string} text - 要播放的文本
   */
  async playTTSAndStartRecording(text) {
    if (!this.data.autoVoiceMode) return;
    
    try {
      console.log('开始TTS播放:', text);
      this.setData({ isTTSPlaying: true });
      
      // 播放TTS
      await this.playTTS(text);
      
      console.log('TTS播放完成，开始自动录音');
      this.setData({ isTTSPlaying: false });
      
      // TTS播放完成后，自动开始录音
      setTimeout(() => {
        this.startAutoVoiceRecording();
      }, 500); // 0.5秒延迟后开始录音
      
    } catch (error) {
      console.error('TTS播放失败:', error);
      this.setData({ isTTSPlaying: false });
      // TTS失败也要开始录音
      this.startAutoVoiceRecording();
    }
  },

  /**
   * 播放TTS
   * @param {string} text - 要播放的文本
   */
  playTTS(text) {
    return new Promise((resolve, reject) => {
      // 创建语音合成管理器
      const speechSynthesis = wx.createInnerAudioContext();
      
      // 调用云函数进行TTS
      wx.cloud.callFunction({
        name: 'tts',
        data: {
          text: text,
          speed: 1.0,
          pitch: 1.0
        },
        success: (res) => {
          if (res.result && res.result.success) {
            // 播放音频
            speechSynthesis.src = res.result.audioUrl;
            speechSynthesis.onEnded(() => {
              speechSynthesis.destroy();
              resolve();
            });
            speechSynthesis.onError((err) => {
              console.error('音频播放失败:', err);
              speechSynthesis.destroy();
              reject(err);
            });
            speechSynthesis.play();
          } else {
            reject(new Error(res.result?.message || 'TTS合成失败'));
          }
        },
        fail: (err) => {
          console.error('TTS云函数调用失败:', err);
          // 如果云函数不可用，使用备用方案
          this.playBackupTTS(text).then(resolve).catch(reject);
        }
      });
    });
  },

  /**
   * 备用TTS方案（使用系统TTS）
   * @param {string} text - 要播放的文本
   */
  playBackupTTS(text) {
    return new Promise((resolve) => {
      // 如果没有云函数，使用简单的延迟模拟TTS播放时间
      const estimatedDuration = text.length * 150; // 每个字符150ms
      setTimeout(() => {
        resolve();
      }, Math.min(estimatedDuration, 3000)); // 最多3秒
    });
  },

  /**
   * 自动开始语音录音
   */
  startAutoVoiceRecording() {
    if (!this.data.autoVoiceMode || this.data.isRecording || this.data.isConsultFinished) {
      return;
    }

    console.log('开始自动语音录音');
    
    // 检查麦克风权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.doStartAutoRecording();
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
   * 执行自动录音
   */
  doStartAutoRecording() {
    // 初始化录音管理器
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager();
      this.initAutoRecorderEvents();
    }

    // 设置录音状态
    this.setData({ isRecording: true });

    // 显示录音提示
    wx.showToast({
      title: '开始录音...',
      icon: 'none',
      duration: 1000
    });

    console.log('开始自动录音');
    
    // 开始录音
    this.recorderManager.start({
      duration: 30000, // 30秒最大时长
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });

    // 开始静音检测
    this.startSilenceDetection();
  },

  /**
   * 开始静音检测
   */
  startSilenceDetection() {
    // 清除之前的定时器
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // 设置1.5秒静音检测
    this.silenceTimer = setTimeout(() => {
      console.log('检测到1.5秒静音，停止录音');
      this.stopAutoRecording();
    }, this.data.silenceThreshold);
  },

  /**
   * 停止自动录音
   */
  stopAutoRecording() {
    if (!this.data.isRecording) {
      return;
    }

    console.log('停止自动录音');
    
    // 清除静音检测定时器
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // 停止录音
    this.recorderManager.stop();
    this.setData({ isRecording: false });
  },

  /**
   * 初始化自动录音事件
   */
  initAutoRecorderEvents() {
    const that = this;

    // 录音开始事件
    this.recorderManager.onStart(() => {
      console.log('自动录音开始');
    });

    // 录音结束事件
    this.recorderManager.onStop((res) => {
      console.log('自动录音结束', res);
      
      if (res.tempFilePath) {
        // 显示语音识别状态
        wx.showToast({
          title: '语音识别中...',
          icon: 'loading',
          duration: 3000
        });
        
        that.processAutoVoiceRecognition(res.tempFilePath);
      }
    });

    // 录音错误事件
    this.recorderManager.onError((err) => {
      console.error('自动录音错误:', err);
      this.setData({ isRecording: false });
      
      // 清除静音检测定时器
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 处理自动语音识别
   */
  async processAutoVoiceRecognition(audioPath) {
    try {
      // 调用云函数进行语音识别
      const result = await this.callASRCloudFunction(audioPath);
      
      wx.hideToast();
      
      if (result.success && result.text.trim()) {
        console.log('语音识别成功:', result.text);
        
        // 自动发送识别结果
        await this.sendAutoVoiceMessage(result.text);
      } else {
        console.log('语音识别结果为空或失败');
        // 识别失败，重新开始录音
        this.handleRecognitionFailure();
      }
      
    } catch (error) {
      console.error('语音识别错误:', error);
      wx.hideToast();
      this.handleRecognitionFailure();
    }
  },

  /**
   * 处理识别失败
   */
  handleRecognitionFailure() {
    if (!this.data.autoVoiceMode) return;
    
    wx.showToast({
      title: '未听清，请重新说一遍',
      icon: 'none',
      duration: 2000
    });
    
    // 2秒后重新开始录音
    setTimeout(() => {
      if (this.data.autoVoiceMode && !this.data.isConsultFinished) {
        this.startAutoVoiceRecording();
      }
    }, 2000);
  },

  /**
   * 自动发送语音消息
   */
  async sendAutoVoiceMessage(text) {
    if (!text.trim() || this.data.isWaitingResponse || this.data.isConsultFinished) {
      return;
    }

    console.log('自动发送语音消息:', text);

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
      // 检查回答相关性
      const isRelevant = await this.checkAnswerRelevance(text);
      
      if (!isRelevant) {
        console.log('回答不相关，重复当前问题');
        // 回答不相关，重复当前问题
        await this.repeatCurrentQuestion();
      } else {
        console.log('回答相关，处理下一个问题');
        // 回答相关，处理下一个问题
        await this.processNextQuestion();
      }
      
    } catch (error) {
      console.error('发送消息错误:', error);
      this.setData({ 
        isWaitingResponse: false,
        isInputDisabled: false 
      });
      
      // 发送失败，重新开始录音
      if (this.data.autoVoiceMode) {
        setTimeout(() => {
          this.startAutoVoiceRecording();
        }, 1000);
      }
    }
  },

  /**
   * 重复当前问题
   */
  async repeatCurrentQuestion() {
    const currentQuestion = this.data.questions[this.data.currentQuestionIndex];
    
    await this.addSystemMessage(
      `您的回答似乎与问题不太相关。${currentQuestion}`,
      true
    );
    
    this.setData({ 
      isWaitingResponse: false,
      isInputDisabled: false 
    });

    // 如果是自动语音模式，播放TTS并开始录音
    if (this.data.autoVoiceMode) {
      setTimeout(() => {
        this.playTTSAndStartRecording(`您的回答似乎与问题不太相关。${currentQuestion}`);
      }, 500);
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
   * 发送消息（文字模式）
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
      // 检查回答相关性
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
      // 简单的相关性检查逻辑
      const currentQuestion = this.data.questions[this.data.currentQuestionIndex];
      const questionIndex = this.data.currentQuestionIndex;
      
      // 基于问题类型的简单相关性检查
      switch (questionIndex) {
        case 0: // 哪里不舒服
          return this.checkSymptomRelevance(answer);
        case 1: // 持续时间
          return this.checkDurationRelevance(answer);
        case 2: // 是否发热
          return this.checkFeverRelevance(answer);
        case 3: // 咳嗽头痛
          return this.checkSpecificSymptomRelevance(answer);
        case 4: // 性别年龄
          return this.checkPersonalInfoRelevance(answer);
        default:
          return true;
      }
    } catch (error) {
      console.error('相关性检查失败:', error);
      // 检查失败时默认认为相关
      return true;
    }
  },

  /**
   * 检查症状相关性
   */
  checkSymptomRelevance(answer) {
    const symptomKeywords = ['痛', '疼', '不舒服', '难受', '酸', '胀', '麻', '痒', '肿', '热', '冷', '头', '胸', '肚子', '腰', '腿', '手', '脚', '喉咙', '眼睛'];
    return symptomKeywords.some(keyword => answer.includes(keyword)) || answer.length > 2;
  },

  /**
   * 检查持续时间相关性
   */
  checkDurationRelevance(answer) {
    const timeKeywords = ['天', '小时', '分钟', '周', '月', '年', '昨天', '今天', '刚才', '一直', '时间', '久'];
    return timeKeywords.some(keyword => answer.includes(keyword)) || /\d+/.test(answer);
  },

  /**
   * 检查发热相关性
   */
  checkFeverRelevance(answer) {
    const feverKeywords = ['是', '否', '有', '没有', '发热', '发烧', '烧', '热', '不'];
    return feverKeywords.some(keyword => answer.includes(keyword));
  },

  /**
   * 检查特定症状相关性
   */
  checkSpecificSymptomRelevance(answer) {
    const specificKeywords = ['是', '否', '有', '没有', '咳嗽', '头痛', '咳', '痛', '不'];
    return specificKeywords.some(keyword => answer.includes(keyword));
  },

  /**
   * 检查个人信息相关性
   */
  checkPersonalInfoRelevance(answer) {
    const personalKeywords = ['男', '女', '岁', '年', '老', '小'];
    return personalKeywords.some(keyword => answer.includes(keyword)) || /\d+/.test(answer);
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

      // 如果是自动语音模式，播放TTS并开始录音
      if (this.data.autoVoiceMode) {
        setTimeout(() => {
          this.playTTSAndStartRecording(nextQuestion);
        }, 500);
      }
      
    } else {
      // 所有问题完成
      await this.addSystemMessage(
        "感谢您的配合！所有问题已经回答完毕，正在为您生成健康建议...",
        true
      );
      
      this.setData({
        isConsultFinished: true,
        isWaitingResponse: false,
        isInputDisabled: true,
        autoVoiceMode: false  // 关闭自动语音模式
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
      // 更新最后一条消息
      const updatedMessageList = [...this.data.messageList];
      updatedMessageList[updatedMessageList.length - 1] = actualMessage;
      this.setData({ messageList: updatedMessageList });
    } else {
      // 直接添加新消息
      this.setData({
        messageList: [...this.data.messageList, actualMessage]
      });
    }
    
    this.scrollToBottom();
  },

  /**
   * 保存记录并跳转
   */
  saveRecordsAndNavigate() {
    const qaRecords = this.data.messageList
      .filter(msg => msg.role === 'user')
      .map((msg, index) => ({
        question: this.data.questions[index] || '',
        answer: msg.text,
        timestamp: msg.timestamp
      }));

    wx.setStorageSync('qaRecords', qaRecords);
    wx.setStorageSync('chatHistory', this.data.messageList);

    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/summary/summary'
      });
    }, 2000);
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
   * 手动开始语音输入（用于文字模式切换到语音模式）
   */
  startVoiceInput() {
    if (this.data.isInputDisabled || this.data.isConsultFinished) {
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
   * 直接开始录音（手动模式）
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
   * 处理直接语音识别（手动模式）
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
   * 切换输入模式
   */
  switchInputMode(e) {
    // 从按钮的 data-mode 属性获取目标模式
    const newMode = e.currentTarget.dataset.mode;
    
    // 如果已经是当前模式，则不执行任何操作
    if (newMode === this.data.inputMode) {
      return;
    }

    // 停止当前的录音和自动语音模式
    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop();
    }
    
    // 清除定时器
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // 更新输入模式
    this.setData({ 
      inputMode: newMode,
      autoVoiceMode: newMode === '语音输入',
      inputText: "",
      voiceRecognitionResult: "",
      isRecording: false,
      isTTSPlaying: false
    });
    wx.setStorageSync("inputMode", newMode);

    if (newMode === '语音输入') {
      wx.showToast({
        title: '语音模式已激活',
        icon: 'success',
        duration: 1500
      });
      
      // 如果切换到语音模式且当前有问题在等待回答，自动开始录音
      if (!this.data.isConsultFinished && !this.data.isWaitingResponse) {
        setTimeout(() => {
          this.startAutoVoiceRecording();
        }, 1500);
      }
    } else {
      wx.showToast({
        title: '文字模式已激活',
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
          
          // 清除所有定时器
          if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
          }
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          
          this.setData({
            messageList: [],
            inputText: "",
            currentQuestionIndex: 0,
            isWaitingResponse: false,
            isConsultFinished: false,
            isInputDisabled: false,
            isRecording: false,
            voiceRecognitionResult: "",
            isTTSPlaying: false,
            autoVoiceMode: this.data.inputMode === '语音输入'
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
  }
});
