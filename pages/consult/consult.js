// 引入LLM配置
const LLM_CONFIG = require('../../config/llm-config.js');
// 引入实时语音识别工具类
const TencentRealtimeASR = require('../../utils/tencent-realtime-asr.js');

Page({
  data: {
    // 决策树式问诊数据结构 - 参考medical_chatbot.py的consultation_flow
    questionTree: {
      "T1-基础信息": {
        question: "首先，请告诉我您的性别和年龄？",
        fields: ["gender", "age"],
        condition: "始终提问",
        followUps: [
          {
            condition: "始终提问",
            question: "您有没有慢性病，比如高血压、高血糖、高血脂、胃病等？是否在治疗？是否有药物过敏？",
            fields: ["chronic_disease", "treatment", "drug_allergy"]
          }
        ]
      },
      "T2-发热寒热": {
        question: "最近有没有发烧或怕冷？",
        fields: ["fever", "cold_feeling"],
        condition: "始终提问",
        followUps: [
          {
            condition: "fever == true",
            question: "发烧大概多少度？哪个时间段最明显？",
            fields: ["fever_temperature", "fever_time"]
          },
          {
            condition: "cold_feeling == true",
            question: "穿衣服后能缓解怕冷吗？",
            fields: ["cold_relief"]
          },
          {
            condition: "fever == true || cold_feeling == true",
            question: "有没有出汗？是清水汗还是黏汗？",
            fields: ["sweating", "sweat_type"]
          }
        ]
      },
      "T3-头痛头晕": {
        question: "最近有没有头痛或头晕？",
        fields: ["headache", "dizziness"],
        condition: "始终提问",
        followUps: [
          {
            condition: "headache == true",
            question: "头痛在什么部位？是胀痛、刺痛还是抽痛？",
            fields: ["headache_location", "headache_type"]
          },
          {
            condition: "dizziness == true",
            question: "是头部昏沉还是天旋地转？有没有伴随恶心呕吐？",
            fields: ["dizziness_type", "nausea"]
          }
        ]
      },
      "T4-五官": {
        question: "眼睛有没有不适，比如干涩、发痒、流泪或视力问题？",
        fields: ["eye_symptoms"],
        condition: "始终提问",
        followUps: [
          {
            condition: "始终提问",
            question: "请问是否有耳鸣或听力问题？",
            fields: ["ear_symptoms"]
          },
          {
            condition: "始终提问", 
            question: "鼻子是否有鼻塞、流涕？",
            fields: ["nose_symptoms"]
          }
        ]
      },
      "T5-咽喉与咳嗽": {
        question: "喉咙是否干、痒、疼或堵？最近有没有咳嗽？",
        fields: ["throat_symptoms", "cough"],
        condition: "始终提问",
        followUps: [
          {
            condition: "cough == true",
            question: "咳嗽是间断还是持续？有痰吗？",
            fields: ["cough_type", "phlegm"]
          },
          {
            condition: "phlegm == true",
            question: "痰的颜色和质地如何？容易咳出吗？",
            fields: ["phlegm_color", "phlegm_texture", "phlegm_easy"]
          },
          {
            condition: "cough == true",
            question: "是否伴随胸闷或心悸？",
            fields: ["chest_tightness", "palpitation"]
          }
        ]
      },
      "T6-食欲饮水": {
        question: "最近食欲如何？有没有偏好吃冷食或热食？",
        fields: ["appetite"],
        condition: "始终提问",
        followUps: [
          {
            condition: "始终提问",
            question: "有没有口苦、口干、反酸等口腔症状？",
            fields: ["mouth_symptoms"]
          },
          {
            condition: "始终提问",
            question: "平时喝水习惯是怎样的？喜欢热水还是冷水？",
            fields: ["drinking_habits"]
          }
        ]
      },
      "T7-大小便与腹痛": {
        question: "小便通畅吗？颜色如何？",
        fields: ["urine_flow", "urine_color"],
        condition: "始终提问",
        followUps: [
          {
            condition: "始终提问",
            question: "大便频率和性状如何？有没有腹痛？",
            fields: ["bowel_frequency", "bowel_shape", "abdominal_pain"]
          }
        ]
      },
      "T8-睡眠情绪": {
        question: "最近睡眠质量如何？情绪状态怎么样？",
        fields: ["sleep_quality", "mood"],
        condition: "始终提问",
        followUps: [
          {
            condition: "始终提问",
            question: "有没有皮肤问题，比如瘙痒、红疹等？",
            fields: ["skin_symptoms"]
          }
        ]
      },
      "T9-女性月经": {
        question: "月经周期正常吗？颜色和量如何？是否痛经？",
        fields: ["menstrual_cycle", "menstrual_color", "dysmenorrhea"],
        condition: "gender == 'female'",
        followUps: [
          {
            condition: "始终提问",
            question: "白带情况如何？",
            fields: ["leucorrhea"]
          }
        ]
      }
    },
    
    // 用户回答记录
    patientData: {
      // 基础信息
      gender: "",                // 性别
      age: "",                   // 年龄
      chronic_disease: "",       // 慢性病
      treatment: "",             // 治疗情况
      drug_allergy: "",          // 药物过敏
      
      // 发热寒热
      fever: false,              // 是否发热
      fever_temperature: "",     // 发热温度
      fever_time: "",            // 发热时间段
      cold_feeling: false,       // 是否怕冷
      cold_relief: "",           // 怕冷缓解
      sweating: false,           // 是否出汗
      sweat_type: "",            // 汗液类型
      
      // 头痛头晕
      headache: false,           // 是否头痛
      headache_location: "",     // 头痛部位
      headache_type: "",         // 头痛类型
      dizziness: false,          // 是否头晕
      dizziness_type: "",        // 头晕类型
      nausea: false,             // 是否恶心
      
      // 五官
      eye_symptoms: "",          // 眼部症状
      ear_symptoms: "",          // 耳部症状
      nose_symptoms: "",         // 鼻部症状
      
      // 咽喉与咳嗽
      throat_symptoms: "",       // 咽部症状
      cough: false,              // 是否咳嗽
      cough_type: "",            // 咳嗽类型
      phlegm: false,             // 是否有痰
      phlegm_color: "",          // 痰颜色
      phlegm_texture: "",        // 痰质地
      phlegm_easy: "",           // 是否易咳出
      chest_tightness: false,    // 是否胸闷
      palpitation: false,        // 是否心悸
      
      // 食欲饮水
      appetite: "",              // 食欲情况
      mouth_symptoms: "",        // 口腔症状
      drinking_habits: "",       // 饮水习惯
      
      // 大小便与腹痛
      urine_flow: "",            // 小便情况
      urine_color: "",           // 尿色
      bowel_frequency: "",       // 大便频率
      bowel_shape: "",           // 大便性状
      abdominal_pain: "",        // 腹痛情况
      
      // 睡眠情绪
      sleep_quality: "",         // 睡眠质量
      mood: "",                  // 情绪状态
      skin_symptoms: "",         // 皮肤症状
      
      // 女性月经
      menstrual_cycle: "",       // 月经周期
      menstrual_color: "",       // 月经颜色与量
      dysmenorrhea: false,       // 是否痛经
      leucorrhea: ""             // 白带情况
    },
    
    // 原始回答记录（用于LLM分析）
    rawResponses: {
      "T1-基础信息": "",
      "T2-发热寒热": "",
      "T3-头痛头晕": "",
      "T4-五官": "",
      "T5-咽喉与咳嗽": "",
      "T6-食欲饮水": "",
      "T7-大小便与腹痛": "",
      "T8-睡眠情绪": "",
      "T9-女性月经": ""
    },
      messageList: [],               // 对话消息列表
    inputText: "",                 // 当前输入文本
    inputFocus: false,             // 输入框焦点状态
    inputMode: wx.getStorageSync("inputMode") || "语音输入",
    showVoiceInput: false,         // 控制语音输入组件显示
    currentQuestionKey: "T1-基础信息", // 当前问题键值
    currentFollowUpIndex: -1,      // 当前追问索引
    isWaitingResponse: false,      // 是否等待系统回复
    isConsultFinished: false,      // 问诊是否完成
    scrollIntoView: "",            // 滚动到指定消息
    isInputDisabled: false,        // 输入是否禁用
    isRecording: false,            // 是否正在录音
    voiceRecognitionResult: "",    // 语音识别结果缓存
    isTTSPlaying: false,           // TTS是否正在播放
    silenceTimer: null,            // 静音检测定时器
    silenceThreshold: 1500,        // 静音阈值1.5秒
    autoVoiceMode: false,          // 自动语音模式
    
    // 实时语音识别相关
    realtimeASR: null,             // 实时语音识别实例
    isRealtimeRecording: false,    // 是否正在实时录音
    realtimeRecognitionText: "",   // 实时识别文本
    showRealtimeResult: false,     // 是否显示实时识别结果
    useRealtimeASR: true,          // 是否使用实时语音识别
      // LLM配置
    llmConfig: LLM_CONFIG
  },
  onLoad() {
    console.log('问诊页面开始加载');
    
    // 先初始化语音相关设置
    this.initVoiceSettings();
    
    // 然后初始化对话，添加第一条系统消息
    this.initializeChat();
  },
  /**
   * 初始化语音设置
   */
  initVoiceSettings() {
    // 检查是否启用实时语音识别
    const enableRealtimeASR = this.data.llmConfig.enableRealtimeASR !== false;
    
    // 如果是语音模式，开启自动语音模式
    if (this.data.inputMode === '语音输入') {
      this.setData({ 
        autoVoiceMode: true,
        useRealtimeASR: enableRealtimeASR
      });
      console.log('开启自动语音模式');
      console.log('实时语音识别:', enableRealtimeASR ? '启用' : '禁用');
    }
  },/**
   * 初始化聊天对话
   */
  initializeChat() {
    const currentQuestion = this.getCurrentQuestion();
    const timestamp = new Date().toISOString();
    
    const welcomeMessage = {
      id: this.generateMessageId(),
      role: "system",
      text: "您好！我是您的智能问诊助手，接下来我会通过提问来了解您的健康状况，这样能帮助医生更好地了解您的情况。准备好了吗？我们开始第一个问题。",
      timestamp: timestamp,
      formattedTime: this.formatTime(timestamp),
      typing: false
    };
    
    const firstQuestionMessage = {
      id: this.generateMessageId(),
      role: "system", 
      text: currentQuestion.question,
      timestamp: timestamp,
      formattedTime: this.formatTime(timestamp),
      typing: false
    };

    this.setData({
      messageList: [welcomeMessage, firstQuestionMessage]
    });    // 滚动到最新消息
    this.scrollToBottom();
      console.log('初始化聊天完成，检查是否需要TTS播报');
    console.log('当前autoVoiceMode:', this.data.autoVoiceMode);
    console.log('当前inputMode:', this.data.inputMode);
    
    // 不论语音模式还是文字模式，都播放TTS - 医生问题必须有语音播报
    console.log('开始TTS播报初始化消息（适用于所有模式）');
    const fullWelcomeText = `${welcomeMessage.text} ${currentQuestion.question}`;
    console.log('TTS播报内容:', fullWelcomeText);
      if (this.data.autoVoiceMode) {
      // 语音模式：TTS播报 + 自动录音
      this.playTTSAndStartRecording(fullWelcomeText);
    } else {
      // 文字模式：仅TTS播报，不自动录音
      this.playTTSOnly(fullWelcomeText);
      
      // 文字模式下，延迟给输入框设置焦点
      setTimeout(() => {
        this.setData({ inputFocus: true });
      }, 2000); // TTS播放完毕后设置焦点
    }
  },

  /**
   * 获取当前问题
   */
  getCurrentQuestion() {
    const questionKey = this.data.currentQuestionKey;
    const followUpIndex = this.data.currentFollowUpIndex;
    const question = this.data.questionTree[questionKey];
    
    if (followUpIndex >= 0 && question.followUps && question.followUps[followUpIndex]) {
      return question.followUps[followUpIndex];
    }
    
    return question;
  },

  /**
   * 获取下一个问题键值
   */
  getNextQuestionKey() {
    const questionKeys = Object.keys(this.data.questionTree);
    const currentIndex = questionKeys.indexOf(this.data.currentQuestionKey);
    
    if (currentIndex >= 0 && currentIndex < questionKeys.length - 1) {
      return questionKeys[currentIndex + 1];
    }
    
    return null;
  },
  /**
   * 检查问题条件是否满足
   */
  checkQuestionCondition(condition) {
    if (condition === "始终提问") return true;
    
    // 解析条件表达式，如 "gender == 'female'"
    if (condition.includes("==")) {
      const [field, value] = condition.split("==").map(s => s.trim());
      const cleanValue = value.replace(/['"]/g, '');
      const patientValue = this.data.patientData[field];
      
      console.log(`检查条件: ${field} == ${cleanValue}, 患者数据: ${patientValue}`);
      
      // 特殊处理性别判断
      if (field === 'gender') {
        // 如果患者性别还未确定，返回false（跳过女性专属问题）
        if (!patientValue) {
          console.log('性别未确定，跳过女性专属问题');
          return false;
        }
        // 标准化性别值进行比较
        const normalizedPatientGender = patientValue.toLowerCase();
        const normalizedConditionGender = cleanValue.toLowerCase();
        const result = normalizedPatientGender === normalizedConditionGender;
        console.log(`性别匹配结果: ${result}`);
        return result;
      }
      
      return patientValue === cleanValue;
    }
    
    // 解析布尔条件，如 "fever == true"
    if (condition.includes("true")) {
      const field = condition.split("==")[0].trim();
      return this.data.patientData[field] === true;
    }
    
    if (condition.includes("false")) {
      const field = condition.split("==")[0].trim();
      return this.data.patientData[field] === false;
    }
    
    // 解析或条件，如 "fever == true || cold_feeling == true"
    if (condition.includes("||")) {
      const parts = condition.split("||").map(s => s.trim());
      return parts.some(part => this.checkQuestionCondition(part));
    }
    
    return true;
  },/**
   * 播放TTS并自动开始录音 - 使用腾讯云TTS（语音模式专用）
   * @param {string} text - 要播放的文本
   */
  async playTTSAndStartRecording(text) {
    console.log('进入playTTSAndStartRecording方法（语音模式）');
    console.log('要播放的文本:', text);
    
    try {
      console.log('开始腾讯云TTS播放:', text);
      this.setData({ isTTSPlaying: true });
      
      // 使用腾讯云TTS播放
      await this.playTencentTTS(text);
      
      console.log('腾讯云TTS播放完成，开始自动录音');
      this.setData({ isTTSPlaying: false });
      
      // TTS播放完成后，自动开始录音
      setTimeout(() => {
        this.startAutoVoiceRecording();
      }, 100); // 0.1秒延迟后开始录音
      
    } catch (error) {
      console.error('腾讯云TTS播放失败:', error);
      this.setData({ isTTSPlaying: false });
      // TTS失败也要开始录音
      this.startAutoVoiceRecording();
    }
  },

  /**
   * 仅播放TTS，不启动录音 - 适用于文字输入模式
   * @param {string} text - 要播放的文本
   */
  async playTTSOnly(text) {
    console.log('进入playTTSOnly方法（文字模式TTS播报）');
    console.log('要播放的文本:', text);
    
    try {
      console.log('开始腾讯云TTS播放（仅播报，不录音）:', text);
      this.setData({ isTTSPlaying: true });
      
      // 使用腾讯云TTS播放
      await this.playTencentTTS(text);
      
      console.log('腾讯云TTS播放完成（文字模式，不启动录音）');
      this.setData({ isTTSPlaying: false });
      
    } catch (error) {
      console.error('腾讯云TTS播放失败（文字模式）:', error);
      this.setData({ isTTSPlaying: false });
      // 文字模式下TTS失败不需要特殊处理，用户可以正常文字输入
    }
  },

  /**
   * 使用DashScope TTS播放语音
   * @param {string} text - 要播放的文本
   */
  async playDashScopeTTS(text) {
    if (!this.data.llmConfig.enableTTS) {
      // 如果TTS被禁用，使用简单延迟模拟
      return this.playBackupTTS(text);
    }

    try {
      const ttsConfig = this.data.llmConfig.tts;
      
      // 调用DashScope TTS API
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: ttsConfig.baseUrl,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${this.data.llmConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: ttsConfig.model,
            input: {
              text: text
            },
            parameters: {
              voice: ttsConfig.voice,
              format: ttsConfig.format,
              sample_rate: ttsConfig.sampleRate,
              volume: ttsConfig.volume,
              speech_rate: ttsConfig.speechRate,
              pitch_rate: ttsConfig.pitchRate
            }
          },
          timeout: 10000,
          success: resolve,
          fail: reject
        });
      });

      if (response.statusCode === 200 && response.data.output && response.data.output.audio_url) {
        // 播放生成的音频
        return this.playAudioFromUrl(response.data.output.audio_url);
      } else {
        throw new Error('TTS API返回错误: ' + JSON.stringify(response.data));
      }
      
    } catch (error) {
      console.error('DashScope TTS调用失败:', error);
      // 降级到备用TTS
      return this.playBackupTTS(text);
    }
  },

  /**
   * 播放音频URL
   * @param {string} audioUrl - 音频URL
   */
  playAudioFromUrl(audioUrl) {
    return new Promise((resolve, reject) => {
      const audioContext = wx.createInnerAudioContext();
      
      audioContext.src = audioUrl;
      this.ttsPlayer = audioContext; // 保存播放器实例，供外部 stop 使用
      audioContext.onPlay(() => {
        console.log('TTS音频开始播放');
      });
      
      audioContext.onEnded(() => {
        console.log('TTS音频播放完成');
        audioContext.destroy();
        this.ttsPlayer = null; // 清除引用
        resolve();
      });
      
      audioContext.onError((err) => {
        console.error('TTS音频播放失败:', err);
        audioContext.destroy();
        this.ttsPlayer = null; // 清除引用
        reject(err);
      });
      
      audioContext.play();
    });  
  },

  /**
   * 使用腾讯云TTS播放语音
   * @param {string} text - 要播放的文本
   */
  async playTencentTTS(text) {
    try {
      console.log('调用腾讯云TTS云函数:', text);
        // 准备TTS配置
      const ttsConfig = {
        appid: this.data.llmConfig.tts?.appid || this.data.llmConfig.tencent?.appid || '1365883949',
        secretid: this.data.llmConfig.tts?.secretid || this.data.llmConfig.tencent?.secretid,
        secretkey: this.data.llmConfig.tts?.secretkey || this.data.llmConfig.tencent?.secretkey,
        voicetype: this.data.llmConfig.tts?.voicetype || 1002, // 标准女声
        samplerate: this.data.llmConfig.tts?.samplerate || 16000,
        codec: this.data.llmConfig.tts?.codec || 'mp3',
        volume: this.data.llmConfig.tts?.volume || 0,
        speed: this.data.llmConfig.tts?.speed || 0,
        emotion: this.data.llmConfig.tts?.emotion || 'neutral'
      };
      
      // 调用腾讯云TTS云函数
      const result = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'tts',
          data: {
            text: text,
            config: ttsConfig
          },
          success: res => {
            console.log('腾讯云TTS云函数调用成功:', res);
            if (res.result && res.result.success) {
              resolve(res.result);
            } else {
              reject(new Error(res.result ? res.result.error : 'TTS云函数调用失败'));
            }
          },
          fail: err => {
            reject(new Error(`TTS云函数调用失败: ${err.errMsg}`));
          }
        });
      });
      
      // 处理TTS返回的音频数据
      if (result.data && result.data.Audio) {
        // 保存音频文件并播放
        const audioData = result.data.Audio;
        const timestamp = Math.floor(Date.now() / 1000);
        const fileName = `tts_${timestamp}.mp3`;
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        
        // 保存音频文件
        await new Promise((resolve, reject) => {
          wx.getFileSystemManager().writeFile({
            filePath: filePath,
            data: wx.base64ToArrayBuffer(audioData),
            success: resolve,
            fail: reject
          });
        });
        
        // 播放音频文件
        return this.playAudioFromUrl(filePath);
      } else {
        throw new Error('TTS响应中没有音频数据');
      }
      
    } catch (error) {
      console.error('腾讯云TTS调用失败:', error);
      // 降级到备用TTS
      return this.playBackupTTS(text);
    }
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
    
    // 先检查麦克风权限状态
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === true) {
          // 已授权，直接开始录音
          this.doStartAutoRecording();
        } else if (res.authSetting['scope.record'] === false) {
          // 权限被拒绝，引导用户到设置页面
          this.showPermissionModal();
        } else {
          // 未申请过权限，申请权限
          this.requestRecordPermission(() => {
            this.doStartAutoRecording();
          });
        }
      },
      fail: () => {
        // 获取设置失败，尝试直接申请权限
        this.requestRecordPermission(() => {
          this.doStartAutoRecording();
        });
      }
    });
  },
  /**
   * 执行自动录音
   */
  doStartAutoRecording() {
    if (this.data.useRealtimeASR) {
      // 使用实时语音识别
      this.startRealtimeASR();
    } else {
      // 使用传统的一句话识别
      this.startTraditionalRecording();
    }
  },
  /**
   * 开始实时语音识别
   */
  async startRealtimeASR() {
    try {
      console.log('开始实时语音识别...');
      
      // 设置状态
      this.setData({ 
        isRealtimeRecording: true,
        realtimeRecognitionText: '',
        showRealtimeResult: true
      });

      // 显示提示
      wx.showToast({
        title: '开始实时识别...',
        icon: 'none',
        duration: 1000
      });

      // 初始化实时语音识别
      if (!this.data.realtimeASR) {
        const asrConfig = {
          appid: this.data.llmConfig.asr?.appid || this.data.llmConfig.tencent?.appid || '1365883949',
          secretid: this.data.llmConfig.asr?.secretid || this.data.llmConfig.tencent?.secretid,
          secretkey: this.data.llmConfig.asr?.secretkey || this.data.llmConfig.tencent?.secretkey,
          engine_model_type: this.data.llmConfig.asr?.engine_model_type || '16k_zh',
          voice_format: this.data.llmConfig.asr?.voice_format || 1, // 使用PCM格式
          needvad: 1, // 开启VAD
          filter_dirty: this.data.llmConfig.asr?.filter_dirty || 0,
          filter_modal: this.data.llmConfig.asr?.filter_modal || 0,
          filter_punc: this.data.llmConfig.asr?.filter_punc || 0,
          convert_num_mode: this.data.llmConfig.asr?.convert_num_mode || 1,
          word_info: this.data.llmConfig.asr?.word_info || 0,
          vad_silence_time: this.data.llmConfig.asr?.vad_silence_time || 1000
        };

        const realtimeASR = new TencentRealtimeASR(asrConfig);
        
        // 设置回调函数
        realtimeASR.onResult = (result) => {
          this.handleRealtimeASRResult(result);
        };
        
        realtimeASR.onError = (error) => {
          this.handleRealtimeASRError(error);
        };
        
        realtimeASR.onEnd = () => {
          this.handleRealtimeASREnd();
        };

        this.setData({ realtimeASR });
      }

      // 先检查权限，再开始实时识别
      try {
        await this.checkRealtimeASRPermission();
        await this.data.realtimeASR.start();
      } catch (permissionError) {
        console.log('权限检查失败，降级到传统录音:', permissionError.message);
        throw permissionError;
      }
      
    } catch (error) {
      console.error('启动实时语音识别失败:', error);
      this.setData({ 
        isRealtimeRecording: false,
        showRealtimeResult: false
      });
      
      // 降级到传统识别
      this.startTraditionalRecording();
    }
  },

  /**
   * 检查实时ASR权限
   */
  async checkRealtimeASRPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record'] === true) {
            // 已授权，直接继续
            resolve();
          } else if (res.authSetting['scope.record'] === false) {
            // 权限被拒绝，显示提示并降级
            wx.showModal({
              title: '麦克风权限',
              content: '实时语音识别需要麦克风权限，将使用普通录音模式',
              showCancel: false,
              confirmText: '知道了'
            });
            reject(new Error('权限被拒绝'));
          } else {
            // 首次申请权限
            wx.authorize({
              scope: 'scope.record',
              success: () => resolve(),
              fail: () => {
                wx.showModal({
                  title: '麦克风权限',
                  content: '实时语音识别需要麦克风权限，将使用普通录音模式',
                  showCancel: false,
                  confirmText: '知道了'
                });
                reject(new Error('权限申请失败'));
              }
            });
          }
        },
        fail: () => {
          // 获取设置失败，尝试直接申请权限
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(),
            fail: () => reject(new Error('权限申请失败'))          });
        }
      });
    });
  },

  /**
   * 处理实时语音识别结果
   */
  handleRealtimeASRResult(result) {
    console.log('实时识别结果:', result);
    
    // 更新实时显示的识别文本
    this.setData({
      realtimeRecognitionText: result.text
    });

    // 如果是最终结果（稳态），处理完整的识别内容
    if (result.is_final && result.text.trim()) {
      console.log('收到最终识别结果:', result.text);
      
      // 停止实时识别
      this.stopRealtimeASR();
      
      // 发送识别结果
      this.processRealtimeASRResult(result.text);
    }
  },

  /**
   * 处理实时语音识别错误
   */
  handleRealtimeASRError(error) {
    console.error('实时语音识别错误:', error);
    
    this.setData({ 
      isRealtimeRecording: false,
      showRealtimeResult: false
    });

    wx.showToast({
      title: '语音识别失败，请重试',
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
   * 实时语音识别结束
   */
  handleRealtimeASREnd() {
    console.log('实时语音识别结束');
    
    this.setData({ 
      isRealtimeRecording: false,
      showRealtimeResult: false,
      realtimeRecognitionText: ''
    });
  },

  /**
   * 停止实时语音识别
   */
  async stopRealtimeASR() {
    if (this.data.realtimeASR && this.data.isRealtimeRecording) {
      try {
        await this.data.realtimeASR.stop();
      } catch (error) {
        console.error('停止实时语音识别失败:', error);
      }
    }
  },

  /**
   * 处理实时识别的最终结果
   */
  async processRealtimeASRResult(text) {
    if (!text.trim()) {
      console.log('识别结果为空');
      this.handleRecognitionFailure();
      return;
    }

    console.log('处理实时识别结果:', text);
    
    try {
      // 自动发送识别结果
      await this.sendAutoVoiceMessage(text);
    } catch (error) {
      console.error('发送实时识别结果失败:', error);
      this.handleRecognitionFailure();
    }
  },

  /**
   * 传统录音方式
   */
  startTraditionalRecording() {
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

    console.log('开始传统录音');
    
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
    if (this.data.useRealtimeASR && this.data.isRealtimeRecording) {
      // 停止实时语音识别
      this.stopRealtimeASR();
    } else if (this.data.isRecording) {
      // 停止传统录音
      this.stopTraditionalRecording();
    }
  },

  /**
   * 停止传统录音
   */
  stopTraditionalRecording() {
    console.log('停止传统录音');
    
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
  },  /**
   * 处理自动语音识别 - 使用腾讯云ASR
   */
  async processAutoVoiceRecognition(audioPath) {
    try {
      // 调用腾讯云ASR进行语音识别
      const result = await this.callASRCloudFunction(audioPath);
      
      wx.hideToast();
      
      if (result.success && result.text.trim()) {
        console.log('语音识别成功:', result.text);
        
        // 自动发送识别结果
        await this.sendAutoVoiceMessage(result.text);
      } else {
        console.log('语音识别结果为空或失败:', result.message);
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
   * 调用DashScope ASR API
   * @param {string} audioPath - 音频文件路径
   */
  async callDashScopeASR(audioPath) {
    if (!this.data.llmConfig.enableASR) {
      // 如果ASR被禁用，使用备用方案
      return this.callASRCloudFunction(audioPath);
    }

    try {
      const asrConfig = this.data.llmConfig.asr;
      
      // 读取音频文件
      const fileData = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: audioPath,
          success: (res) => resolve(res.data),
          fail: reject
        });
      });

      // 将音频数据转换为base64
      const base64Audio = wx.arrayBufferToBase64(fileData);

      // 调用DashScope ASR API
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: asrConfig.baseUrl,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${this.data.llmConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: asrConfig.model,
            input: {
              audio: base64Audio,
              format: asrConfig.format
            },
            parameters: {
              sample_rate: asrConfig.sampleRate,
              enable_punctuation_prediction: asrConfig.enablePunctuation,
              enable_inverse_text_normalization: asrConfig.enableITN
            }
          },
          timeout: 15000,
          success: resolve,
          fail: reject
        });
      });

      if (response.statusCode === 200 && response.data.output) {
        const transcription = response.data.output.text || '';
        return {
          success: true,
          text: transcription.trim()
        };
      } else {
        throw new Error('ASR API返回错误: ' + JSON.stringify(response.data));
      }

    } catch (error) {
      console.error('DashScope ASR调用失败:', error);
      // 降级到云函数ASR
      return this.callASRCloudFunction(audioPath);
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
    const currentQuestion = this.getCurrentQuestion();
    
    await this.addSystemMessage(
      `您的回答似乎与问题不太相关。${currentQuestion.question}`,
      true
    );
      this.setData({ 
      isWaitingResponse: false,
      isInputDisabled: false 
    });

    // 播放TTS（所有模式都需要），语音模式额外启动录音
    const repeatText = `您的回答似乎与问题不太相关。${currentQuestion.question}`;
    setTimeout(() => {
      if (this.data.autoVoiceMode) {
        // 语音模式：TTS播报 + 自动录音
        this.playTTSAndStartRecording(repeatText);
      } else {
        // 文字模式：仅TTS播报
        this.playTTSOnly(repeatText);
      }
    }, 500);
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
   * 输入框失去焦点
   */
  onInputBlur() {
    this.setData({ inputFocus: false });
  },

  /**
   * 发送消息（文字模式）`
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
        const irrelevantMessage = "您的回答似乎与问题不太相关，能否请您重新回答一下？";
        await this.addSystemMessage(irrelevantMessage, true);
        
        // 播放相关性提示的TTS
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            // 语音模式：TTS播报 + 自动录音
            this.playTTSAndStartRecording(irrelevantMessage);
          } else {
            // 文字模式：仅TTS播报
            this.playTTSOnly(irrelevantMessage);
          }
        }, 1500);
          this.setData({ 
          isWaitingResponse: false,
          isInputDisabled: false,
          inputText: "" // 清空输入框但保持焦点
        });
        
        // 设置输入框焦点
        setTimeout(() => {
          this.setData({ inputFocus: true });
        }, 100);
        return;
      }

      // 处理下一个问题
      await this.processNextQuestion();
      
    } catch (error) {
      console.error('发送消息错误:', error);      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
      this.setData({ 
        isWaitingResponse: false,
        isInputDisabled: false,
        inputText: ""
      });
      
      // 设置输入框焦点
      setTimeout(() => {
        this.setData({ inputFocus: true });
      }, 100);
    }
  },
  /**
   * 检查回答相关性 - 使用LLM进行智能判断
   * @param {string} answer - 用户回答
   */
  async checkAnswerRelevance(answer) {
    try {
      const currentQuestion = this.getCurrentQuestion();
      
      // 使用LLM进行相关性判断
      const relevanceResult = await this.callLLMForRelevance(currentQuestion.question, answer);
      
      if (relevanceResult.isRelevant) {
        // 记录原始回答
        const topicKey = this.data.currentQuestionKey;
        const updatedRawResponses = { ...this.data.rawResponses };
        updatedRawResponses[topicKey] = (updatedRawResponses[topicKey] || "") + " " + answer;
        
        // 提取结构化数据
        const extractedData = await this.extractStructuredData(answer, currentQuestion.fields);
        
        // 更新患者数据
        const updatedPatientData = { ...this.data.patientData };
        Object.assign(updatedPatientData, extractedData);
        
        this.setData({
          rawResponses: updatedRawResponses,
          patientData: updatedPatientData
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('相关性检查失败:', error);
      // 检查失败时默认认为相关
      return true;
    }
  },
  /**
   * 调用LLM进行相关性判断
   */
  async callLLMForRelevance(question, answer) {
    try {
      if (!this.data.llmConfig.enableRelevanceCheck) {
        return { isRelevant: true, reason: "相关性检查已禁用" };
      }
      
      const prompt = this.data.llmConfig.relevancePrompt(question, answer);
      const response = await this.callLLMAPI(prompt);
      
      const isRelevant = response.includes("相关性：是") || response.includes("相关性: 是");
      
      return {
        isRelevant: isRelevant,
        reason: response
      };
    } catch (error) {
      console.error('LLM相关性判断失败:', error);
      return { isRelevant: true, reason: "判断失败，默认相关" };
    }
  },
  /**
   * 提取结构化数据
   */
  async extractStructuredData(answer, fields) {
    try {
      const fieldsDescription = {
        // 基础信息
        "gender": "性别(male/female)",
        "age": "年龄(数字)",
        "chronic_disease": "慢性病类型",
        "treatment": "治疗方式",
        "drug_allergy": "药物过敏情况",
        
        // 发热寒热
        "fever": "是否发热(true/false)",
        "fever_temperature": "发热温度",
        "fever_time": "发热时间段",
        "cold_feeling": "是否怕冷(true/false)",
        "cold_relief": "怕冷缓解情况",
        "sweating": "是否出汗(true/false)",
        "sweat_type": "汗液类型",
        
        // 头痛头晕
        "headache": "是否头痛(true/false)",
        "headache_location": "头痛部位",
        "headache_type": "头痛类型",
        "dizziness": "是否头晕(true/false)",
        "dizziness_type": "头晕类型",
        "nausea": "是否恶心(true/false)",
        
        // 五官
        "eye_symptoms": "眼部症状",
        "ear_symptoms": "耳部症状",
        "nose_symptoms": "鼻部症状",
        
        // 咽喉与咳嗽
        "throat_symptoms": "咽部症状",
        "cough": "是否咳嗽(true/false)",
        "cough_type": "咳嗽类型",
        "phlegm": "是否有痰(true/false)",
        "phlegm_color": "痰颜色",
        "phlegm_texture": "痰质地",
        "phlegm_easy": "是否易咳出",
        "chest_tightness": "是否胸闷(true/false)",
        "palpitation": "是否心悸(true/false)",
        
        // 食欲饮水
        "appetite": "食欲情况",
        "mouth_symptoms": "口腔症状",
        "drinking_habits": "饮水习惯",
        
        // 大小便与腹痛
        "urine_flow": "小便情况",
        "urine_color": "尿色",
        "bowel_frequency": "大便频率",
        "bowel_shape": "大便性状",
        "abdominal_pain": "腹痛情况",
        
        // 睡眠情绪
        "sleep_quality": "睡眠质量",
        "mood": "情绪状态",
        "skin_symptoms": "皮肤症状",
        
        // 女性月经
        "menstrual_cycle": "月经周期",
        "menstrual_color": "月经颜色与量",
        "dysmenorrhea": "是否痛经(true/false)",
        "leucorrhea": "白带情况"
      };
      
      const relevantFields = fields.filter(field => fieldsDescription[field]);
      
      if (relevantFields.length === 0) {
        return {};
      }
        const prompt = this.data.llmConfig.extractionPrompt(
        answer, 
        relevantFields.map(field => `- ${field}: ${fieldsDescription[field]}`).join('\n')
      );

      const response = await this.callLLMAPI(prompt);
      
      // 尝试解析JSON
      try {
        // 提取JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          
          // 处理性别字段的标准化
          if (extracted.gender) {
            if (extracted.gender.includes('男') || extracted.gender.toLowerCase().includes('male')) {
              extracted.gender = 'male';
            } else if (extracted.gender.includes('女') || extracted.gender.toLowerCase().includes('female')) {
              extracted.gender = 'female';
            }
          }
          
          return extracted;
        }
        return {};
      } catch {
        // 如果解析失败，返回空对象
        return {};
      }
      
    } catch (error) {
      console.error('数据提取失败:', error);
      return {};
    }
  },
  /**
   * 调用LLM API
   */
  async callLLMAPI(prompt) {
    const config = this.data.llmConfig;
    
    for (let retry = 0; retry <= config.retryTimes; retry++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const requestData = {
            model: config.model,
            messages: [
              {
                role: "system",
                content: config.systemPrompt
              },
              {
                role: "user", 
                content: prompt
              }
            ],
            temperature: config.temperature,
            max_tokens: config.maxTokens
          };
          
          wx.request({
            url: `${config.baseUrl}/chat/completions`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            },
            data: requestData,
            timeout: config.requestTimeout,
            success: (res) => {
              if (res.statusCode === 200 && res.data.choices && res.data.choices[0]) {
                resolve(res.data.choices[0].message.content);
              } else {
                reject(new Error(`LLM API调用失败: ${res.statusCode} ${JSON.stringify(res.data)}`));
              }
            },
            fail: reject
          });
        });
        
        return response;
        
      } catch (error) {
        console.error(`LLM API调用失败 (尝试 ${retry + 1}/${config.retryTimes + 1}):`, error);
        
        if (retry === config.retryTimes) {
          // 最后一次重试失败，尝试备用API
          if (config.fallback && config.fallback.apiKey !== "your-openai-api-key-here") {
            try {
              return await this.callFallbackLLMAPI(prompt);
            } catch (fallbackError) {
              console.error('备用LLM API也失败:', fallbackError);
              throw new Error('所有LLM API都不可用');
            }
          }
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
      }
    }
  },

  /**
   * 调用备用LLM API
   */
  async callFallbackLLMAPI(prompt) {
    const fallbackConfig = this.data.llmConfig.fallback;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${fallbackConfig.baseUrl}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fallbackConfig.apiKey}`
        },
        data: {
          model: fallbackConfig.model,
          messages: [
            {
              role: "system",
              content: this.data.llmConfig.systemPrompt
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: this.data.llmConfig.temperature,
          max_tokens: this.data.llmConfig.maxTokens
        },
        timeout: this.data.llmConfig.requestTimeout,
        success: (res) => {
          if (res.statusCode === 200 && res.data.choices && res.data.choices[0]) {
            resolve(res.data.choices[0].message.content);
          } else {
            reject(new Error('备用LLM API调用失败'));
          }
        },
        fail: reject
      });
    });
  },
  /**
   * 处理下一个问题 - 决策树逻辑
   */
  async processNextQuestion() {
    const currentQuestionKey = this.data.currentQuestionKey;
    const currentQuestion = this.data.questionTree[currentQuestionKey];
    const currentFollowUpIndex = this.data.currentFollowUpIndex;
    
    // 检查是否还有追问
    if (currentQuestion.followUps && currentFollowUpIndex < currentQuestion.followUps.length - 1) {
      const nextFollowUpIndex = currentFollowUpIndex + 1;
      const nextFollowUp = currentQuestion.followUps[nextFollowUpIndex];
      
      // 检查追问条件
      if (this.checkQuestionCondition(nextFollowUp.condition)) {
        // 进行追问
        await this.addSystemMessage(nextFollowUp.question, true);
          this.setData({
          currentFollowUpIndex: nextFollowUpIndex,
          isWaitingResponse: false,
          isInputDisabled: false
        });
        
        // 如果是文字模式，恢复输入框焦点
        if (!this.data.autoVoiceMode) {
          setTimeout(() => {
            this.setData({ inputFocus: true });
          }, 1000);
        }// 不论语音模式还是文字模式，都播放TTS - 医生问题必须有语音播报
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            // 语音模式：TTS播报 + 自动录音
            this.playTTSAndStartRecording(nextFollowUp.question);
          } else {
            // 文字模式：仅TTS播报，不自动录音
            this.playTTSOnly(nextFollowUp.question);
          }
        }, 500);
        
        return;
      } else {
        // 条件不满足，跳过这个追问，检查下一个
        this.setData({ currentFollowUpIndex: nextFollowUpIndex });
        await this.processNextQuestion();
        return;
      }
    }
    
    // 当前主题的所有问题已完成，进入下一个主题
    const nextQuestionKey = this.getNextQuestionKey();
    
    if (nextQuestionKey) {
      const nextMainQuestion = this.data.questionTree[nextQuestionKey];
      
      // 检查主题条件
      if (this.checkQuestionCondition(nextMainQuestion.condition)) {
        // 进入下一个主题
        await this.addSystemMessage(nextMainQuestion.question, true);
          this.setData({
          currentQuestionKey: nextQuestionKey,
          currentFollowUpIndex: -1,
          isWaitingResponse: false,
          isInputDisabled: false
        });
        
        // 如果是文字模式，恢复输入框焦点
        if (!this.data.autoVoiceMode) {
          setTimeout(() => {
            this.setData({ inputFocus: true });
          }, 1000);
        }// 不论语音模式还是文字模式，都播放TTS - 医生问题必须有语音播报
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            // 语音模式：TTS播报 + 自动录音
            this.playTTSAndStartRecording(nextMainQuestion.question);
          } else {
            // 文字模式：仅TTS播报，不自动录音
            this.playTTSOnly(nextMainQuestion.question);
          }
        }, 500);
      } else {
        // 条件不满足，跳过这个主题
        this.setData({
          currentQuestionKey: nextQuestionKey,
          currentFollowUpIndex: -1
        });
        await this.processNextQuestion();
      }
      
    } else {
      // 所有问题完成，进行总结
      await this.finishConsultation();
    }
  },
  /**
   * 完成问诊并生成总结
   */
  async finishConsultation() {
    const finishMessage = "感谢您的配合！所有问题已经回答完毕，正在为您生成健康建议和症状总结...";
    await this.addSystemMessage(finishMessage, true);
    
    // 播放完成提示的TTS
    setTimeout(() => {
      if (this.data.autoVoiceMode) {
        // 语音模式：仅TTS播报，不自动录音（问诊已结束）
        this.playTTSOnly(finishMessage);
      } else {
        // 文字模式：仅TTS播报
        this.playTTSOnly(finishMessage);
      }
    }, 1500);
    
    this.setData({
      isConsultFinished: true,
      isWaitingResponse: true,
      isInputDisabled: true,
      autoVoiceMode: false  // 关闭自动语音模式
    });

    try {
      // 使用LLM生成症状总结和初步分析
      const summary = await this.generateMedicalSummary();
      
      // 显示总结
      await this.addSystemMessage(summary, true);
      
      // 播放总结的TTS
      setTimeout(() => {
        this.playTTSOnly(summary);
      }, 1500);
      
      // 保存问答记录并跳转
      this.saveRecordsAndNavigate();
      
    } catch (error) {
      console.error('生成总结失败:', error);
      const errorMessage = "系统正在整理您的信息，请稍后查看总结页面。";
      await this.addSystemMessage(errorMessage, true);
      
      // 播放错误提示的TTS
      setTimeout(() => {
        this.playTTSOnly(errorMessage);
      }, 1500);
      
      this.saveRecordsAndNavigate();
    }
  },

  /**
   * 生成医疗总结
   */
  async generateMedicalSummary() {
    try {
      // 构建完整的症状描述
      const patientInfo = this.buildPatientInfoSummary();
        const prompt = this.data.llmConfig.summaryPrompt(patientInfo);

      const summary = await this.callLLMAPI(prompt);
      return summary;
      
    } catch (error) {
      console.error('LLM总结生成失败:', error);
      return this.generateFallbackSummary();
    }
  },

  /**
   * 构建患者信息总结
   */
  buildPatientInfoSummary() {
    const data = this.data.patientData;
    const responses = this.data.rawResponses;
    
    let summary = "";
    
    // 基础信息
    if (data.gender || data.age) {
      summary += `患者信息：${data.gender || '未知'}性，${data.age || '年龄未知'}\n`;
    }
    
    // 各个主题的原始回答
    Object.entries(responses).forEach(([topic, response]) => {
      if (response.trim()) {
        summary += `\n${topic}：${response.trim()}\n`;
      }
    });
    
    return summary;
  },

  /**
   * 生成备用总结
   */
  generateFallbackSummary() {
    const data = this.data.patientData;
    
    let summary = "## 问诊总结\n\n";
    
    if (data.gender || data.age) {
      summary += `患者基本信息：${data.gender || '未知'}性，${data.age || '年龄未知'}\n\n`;
    }
    
    // 主要症状
    const symptoms = [];
    if (data.fever) symptoms.push("发热");
    if (data.headache) symptoms.push("头痛");
    if (data.cough) symptoms.push("咳嗽");
    if (data.dizziness) symptoms.push("头晕");
    
    if (symptoms.length > 0) {
      summary += `主要症状：${symptoms.join("、")}\n\n`;
    }
    
    summary += "建议：请根据症状情况，及时就医咨询专业医生。\n\n";
    summary += "注意：本总结仅供参考，不能替代专业医疗诊断。";
    
    return summary;
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
    // 保存结构化的患者数据
    wx.setStorageSync('patientData', this.data.patientData);
    
    // 保存原始回答记录
    wx.setStorageSync('rawResponses', this.data.rawResponses);
    
    // 保存聊天历史
    wx.setStorageSync('chatHistory', this.data.messageList);
    
    // 保存传统格式的问答记录（兼容summary页面）
    const qaRecords = this.generateQARecords();
    wx.setStorageSync('qaRecords', qaRecords);

    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/summary/summary'
      });
    }, 2000);
  },

  /**
   * 生成传统格式的问答记录
   */
  generateQARecords() {
    const records = [];
    const messageList = this.data.messageList;
    
    let currentQuestion = "";
    
    messageList.forEach(msg => {
      if (msg.role === "system" && msg.text.includes("？")) {
        currentQuestion = msg.text;
      } else if (msg.role === "user" && currentQuestion) {
        records.push({
          question: currentQuestion,
          answer: msg.text,
          timestamp: msg.timestamp
        });
        currentQuestion = "";
      }
    });
    
    return records;
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
   */  async callASRCloudFunction(audioPath) {
    return new Promise((resolve, reject) => {
      // 读取音频文件
      wx.getFileSystemManager().readFile({
        filePath: audioPath,
        success: (fileRes) => {
          // 准备ASR配置
          const asrConfig = {
            appid: this.data.llmConfig.asr?.appid || this.data.llmConfig.tencent?.appid || '1365883949',
            secretid: this.data.llmConfig.asr?.secretid || this.data.llmConfig.tencent?.secretid,
            secretkey: this.data.llmConfig.asr?.secretkey || this.data.llmConfig.tencent?.secretkey,
            engine_model_type: this.data.llmConfig.asr?.engine_model_type || "16k_zh",
            voice_format: this.data.llmConfig.asr?.voice_format || 8, // 8对应mp3
            filter_dirty: this.data.llmConfig.asr?.filter_dirty || 0,
            filter_modal: this.data.llmConfig.asr?.filter_modal || 1,
            filter_punc: this.data.llmConfig.asr?.filter_punc || 0,
            convert_num_mode: this.data.llmConfig.asr?.convert_num_mode || 1,
            word_info: this.data.llmConfig.asr?.word_info || 0
          };
          
          // 将音频数据转换为base64
          const audioBase64 = wx.arrayBufferToBase64(fileRes.data);
          
          // 调用云函数
          wx.cloud.callFunction({
            name: 'asr',
            data: {
              audioData: audioBase64,
              config: asrConfig
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

    // 先检查麦克风权限状态
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === true) {
          // 已授权，直接开始录音
          this.doStartDirectRecording();
        } else if (res.authSetting['scope.record'] === false) {
          // 权限被拒绝，引导用户到设置页面
          this.showPermissionModal();
        } else {
          // 未申请过权限，申请权限
          this.requestRecordPermission(() => {
            this.doStartDirectRecording();
          });
        }
      },
      fail: () => {
        // 获取设置失败，尝试直接申请权限
        this.requestRecordPermission(() => {
          this.doStartDirectRecording();
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
   * 处理直接语音识别（手动模式） - 使用DashScope ASR
   */
  async processDirectVoiceRecognition(audioPath) {
    try {
      // 调用DashScope ASR进行语音识别
      const result = await this.callDashScopeASR(audioPath);
      
      wx.hideLoading();
      
      if (result.success && result.text.trim()) {
        console.log('语音识别成功:', result.text);
        
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
      
      // 如果切换到语音模式且当前有问题在等待回答，自动开始录音（0.5s后）
      if (!this.data.isConsultFinished && !this.data.isWaitingResponse) {
        setTimeout(() => {
          this.startAutoVoiceRecording();
        }, 500);
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
          // 停止播放（如果正在播放）
          if (this.data.isTTSPlaying && this.ttsPlayer && this.ttsPlayer.stop) {
            this.ttsPlayer.stop(); // 停止腾讯云TTS播放
            this.ttsPlayer.destroy();
            this.ttsPlayer = null;
            this.setData({ isTTSPlaying: false });
          }   
          
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
          
          // 重置所有数据
          const initialPatientData = {
            // 基础信息
            gender: "",                // 性别
            age: "",                   // 年龄
            chronic_disease: "",       // 慢性病
            treatment: "",             // 治疗情况
            drug_allergy: "",          // 药物过敏
            
            // 发热寒热
            fever: false,              // 是否发热
            fever_temperature: "",     // 发热温度
            fever_time: "",            // 发热时间段
            cold_feeling: false,       // 是否怕冷
            cold_relief: "",           // 怕冷缓解
            sweating: false,           // 是否出汗
            sweat_type: "",            // 汗液类型
            
            // 头痛头晕
            headache: false,           // 是否头痛
            headache_location: "",     // 头痛部位
            headache_type: "",         // 头痛类型
            dizziness: false,          // 是否头晕
            dizziness_type: "",        // 头晕类型
            nausea: false,             // 是否恶心
            
            // 五官
            eye_symptoms: "",          // 眼部症状
            ear_symptoms: "",          // 耳部症状
            nose_symptoms: "",         // 鼻部症状
            
            // 咽喉与咳嗽
            throat_symptoms: "",       // 咽部症状
            cough: false,              // 是否咳嗽
            cough_type: "",            // 咳嗽类型
            phlegm: false,             // 是否有痰
            phlegm_color: "",          // 痰颜色
            phlegm_texture: "",        // 痰质地
            phlegm_easy: "",           // 是否易咳出
            chest_tightness: false,    // 是否胸闷
            palpitation: false,        // 是否心悸
            
            // 食欲饮水
            appetite: "",              // 食欲情况
            mouth_symptoms: "",        // 口腔症状
            drinking_habits: "",       // 饮水习惯
            
            // 大小便与腹痛
            urine_flow: "",            // 小便情况
            urine_color: "",           // 尿色
            bowel_frequency: "",       // 大便频率
            bowel_shape: "",           // 大便性状
            abdominal_pain: "",        // 腹痛情况
            
            // 睡眠情绪
            sleep_quality: "",         // 睡眠质量
            mood: "",                  // 情绪状态
            skin_symptoms: "",         // 皮肤症状
            
            // 女性月经
            menstrual_cycle: "",       // 月经周期
            menstrual_color: "",       // 月经颜色与量
            dysmenorrhea: false,       // 是否痛经
            leucorrhea: ""             // 白带情况
          };
          
          const initialRawResponses = {
            "T1-基础信息": "",
            "T2-发热寒热": "",
            "T3-头痛头晕": "",
            "T4-五官": "",
            "T5-咽喉与咳嗽": "",
            "T6-食欲饮水": "",
            "T7-大小便与腹痛": "",
            "T8-睡眠情绪": "",
            "T9-女性月经": ""
          };
            this.setData({
            messageList: [],
            inputText: "",
            inputFocus: false, // 重置焦点状态
            currentQuestionKey: "T1-基础信息",
            currentFollowUpIndex: -1,
            isWaitingResponse: false,
            isConsultFinished: false,
            isInputDisabled: false,
            isRecording: false,
            voiceRecognitionResult: "",
            isTTSPlaying: false,
            autoVoiceMode: this.data.inputMode === '语音输入',
            patientData: initialPatientData,
            rawResponses: initialRawResponses
          });
          
          // 清除存储的数据
          wx.removeStorageSync("qaRecords");
          wx.removeStorageSync("chatHistory");
          wx.removeStorageSync("patientData");
          wx.removeStorageSync("rawResponses");
          
          // 重新初始化对话
          this.initializeChat();
        }
      }
    });
  },

  /**
   * 申请录音权限
   */
  requestRecordPermission(successCallback) {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        console.log('录音权限申请成功');
        if (successCallback) {
          successCallback();
        }
      },
      fail: () => {
        console.log('录音权限申请失败');
        this.showPermissionModal();
      }
    });
  },

  /**
   * 显示权限申请对话框
   */
  showPermissionModal() {
    wx.showModal({
      title: '麦克风权限',
      content: '需要获取麦克风权限进行语音输入，请在设置中开启',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.record']) {
                wx.showToast({
                  title: '权限开启成功',
                  icon: 'success'
                });
              }
            }
          });
        }
      }
    });
  }
});