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
            condition: "gender == 'female'",
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
    inputMode: wx.getStorageSync("inputMode") || "文字输入",
    showVoiceInput: false,         // 控制语音输入组件显示
    currentVideo: '',              //当前播放的视频
    showImage: false,
    imageUrl: '/cover.jpg', // 统一封面图
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
    isPreparingRecording: false,   // 防止重复录音启动
    videoEndedCallback: null,      // 播放结束后触发的 callback
    // 实时语音识别相关
    videoEndedCallback: null,      // 播放结束后触发的 callback
    realtimeASR: null,             // 实时语音识别实例
    isRealtimeRecording: false,    // 是否正在实时录音
    realtimeRecognitionText: "",   // 实时识别文本
    showRealtimeResult: false,     // 是否显示实时识别结果
    useRealtimeASR: true,          // 是否使用实时语音识别
      // LLM配置
    llmConfig: LLM_CONFIG,
    
    videoMap: {
      "首先，请告诉我您的性别和年龄？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/welcome.mp4",
      "您有没有慢性病，比如高血压、高血糖、高血脂、胃病等？是否在治疗？是否有药物过敏？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T1基础信息追问1.mp4",
      "最近有没有发烧或怕冷？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热主问题.mp4",
      "发烧大概多少度？哪个时间段最明显？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问1.mp4",
      "穿衣服后能缓解怕冷吗？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问2.mp4",
      "有没有出汗？是清水汗还是黏汗？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问3.mp4",
      "最近有没有头痛或头晕？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕主问题.mp4",
      "头痛在什么部位？是胀痛、刺痛还是抽痛？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕追问1.mp4",
      "是头部昏沉还是天旋地转？有没有伴随恶心呕吐？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕追问2.mp4",
      "眼睛有没有不适，比如干涩、发痒、流泪或视力问题？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官主问题.mp4",
      "请问是否有耳鸣或听力问题？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官追问1.mp4",
      "鼻子是否有鼻塞、流涕？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官追问2.mp4",
      "喉咙是否干、痒、疼或堵？最近有没有咳嗽？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽主问题.mp4",
      "咳嗽是间断还是持续？有痰吗？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问1.mp4",
      "痰的颜色和质地如何？容易咳出吗？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问2.mp4",
      "是否伴随胸闷或心悸？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问3.mp4",
      "最近食欲如何？有没有偏好吃冷食或热食？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水主问题.mp4",
      "有没有口苦、口干、反酸等口腔症状？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水追问1.mp4",
      "平时喝水习惯是怎样的？喜欢热水还是冷水？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水追问2.mp4",
      "小便通畅吗？颜色如何？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T7大小便与腹痛主问题.mp4",
      "大便频率和性状如何？有没有腹痛？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T7大小便与腹痛追问1.mp4",
      "最近睡眠质量如何？情绪状态怎么样？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T8睡眠情绪主问题.mp4",
      "有没有皮肤问题，比如瘙痒、红疹等？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T8睡眠情绪追问1.mp4",
      "月经周期正常吗？颜色和量如何？是否痛经？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T9女性月经主问题.mp4",
      "白带情况如何？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T9女性月经追问1.mp4",
      "您好！我是您的智能问诊助手，接下来我会通过提问来了解您的健康状况，这样能帮助医生更好地了解您的情况。准备好了吗？我们开始第一个问题。": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/welcome.mp4",
      "感谢您的配合！所有问题已经回答完毕，正在为您生成健康建议和症状总结...": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/finish.mp4",
      "您的回答似乎与问题不太相关，能否请您重新回答一下？": "https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/irrelevant_answer.mp4"
    }
  },
  
  onVideoEnd() {
      console.log('视频播放已结束');
      this.setData({ isTTSPlaying: false , showImage: true });

    if (this.videoEndedCallback) {
      this.videoEndedCallback(); // 通知 playVideoOnly 的 promise 完成
      this.videoEndedCallback = null; // 清除引用，防止后续错误触发
    }
  },

  onLoad() {
    console.log('问诊页面开始加载');
    // 重新获取输入模式并更新数据
    const inputMode = wx.getStorageSync("inputMode") || "文字输入";
    this.setData({ inputMode });
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
    }else {
      this.setData({ 
        autoVoiceMode: false,
        useRealtimeASR: false
      });
      console.log('开启文字输入模式');
    }
  },
  /**
   * 获取视频时长
   * @returns {number} 视频时长，单位毫秒
   */
  getVideoDuration(url) {
    if (!this.data.currentQuestion) {
      return 16000;
    }

    // 先匹配当前问题到视频URL
    const matchedVideo = Object.entries(this.data.videoMap).find(([questionText]) =>
      this.data.currentQuestion.question.includes(questionText)
    );

    // 视频URL -> 时长 映射
    const videoDurations = {
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/welcome.mp4': 16000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T1基础信息追问1.mp4': 8000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热主问题.mp4': 3000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问1.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问2.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T2发热寒热追问3.mp4': 5000, 
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕主问题.mp4': 3000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕追问1.mp4': 7000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T3头痛头晕追问2.mp4': 6000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官主问题.mp4': 7000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官追问1.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T4五官追问2.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽主问题.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问1.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问2.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T5咽喉与咳嗽追问3.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水主问题.mp4': 5000, 
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水追问1.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T6食欲饮水追问2.mp4': 6000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T7大小便与腹痛主问题.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T7大小便与腹痛追问1.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T8睡眠情绪主问题.mp4': 4000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T8睡眠情绪追问1.mp4': 6000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T9女性月经主问题.mp4': 5000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/T9女性月经追问1.mp4': 4000,        
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/finish.mp4': 11000,
      'https://xiaochengxu-1365640006.cos.ap-beijing.myqcloud.com/irrelevant_answer.mp4': 6000
    };

    if (matchedVideo) {
      return videoDurations[url] || 16000;
    }

    return 16000;
  },

  /**
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
    });

    // 滚动到最新消息
    this.scrollToBottom();
    
    console.log('初始化聊天完成，检查是否需要视频播报');
    console.log('当前autoVoiceMode:', this.data.autoVoiceMode);
    console.log('当前inputMode:', this.data.inputMode);
    
    // 播放欢迎视频和第一个问题的视频
    const fullWelcomeText = `${welcomeMessage.text} ${currentQuestion.question}`;
    console.log('视频播报内容:', fullWelcomeText);
    
    if (this.data.autoVoiceMode) {
      // 语音模式：视频播报 + 自动录音
      this.playVideoAndStartRecording(fullWelcomeText);
    } else {
      // 文字模式：仅视频播报
      this.playVideoOnly(fullWelcomeText);
      
      // 文字模式下，延迟给输入框设置焦点
      setTimeout(() => {
        this.setData({ inputFocus: true });
      }, 2000);
    }
  },

  /**
   * 播放视频并自动开始录音 - 语音模式专用
   * @param {string} text - 要播放的文本
   */
  async playVideoAndStartRecording(text) {
    console.log('进入playVideoAndStartRecording方法（语音模式）');
    console.log('要播放的文本:', text);
    
    try {
      this.setData({ currentVideo: '' , isTTSPlaying: true });
      await this.playVideoOnly(text); // 等待视频播放完成
      console.log('视频播放完成，开始自动录音');
      this.startAutoVoiceRecording(); // 播放结束 -> 录音
    } catch (error) {
      console.error('视频播放失败:', error);
      // 失败也要开始录音
      this.startAutoVoiceRecording();
    }
  },

  /**
   * 仅播放视频 - 适用于文字输入模式
   * @param {string} text - 要播放的文本
   */
  async playVideoOnly(text, forceReplay = false) {
    console.log('进入playVideoOnly方法（视频播报）');
    console.log('要播放的文本:', text);
    return new Promise((resolve) => {
      const matchedVideo = Object.entries(this.data.videoMap).find(([key]) =>
        text.includes(key)
      );
    
      if (!matchedVideo) {
      console.log('没有匹配到视频，延时 1500ms');
      setTimeout(resolve, 1500);
      return;
    }

    const videoUrl = matchedVideo[1];
    const isSameVideo = videoUrl === this.data.currentVideo;

    const doPlay = () => {
      this.videoEndedCallback = resolve;
      this.setData({
        currentVideo: videoUrl,
        isTTSPlaying: true,
        showImage: false
      }, () => {
        // 注意：这个 play() 必须在 setData 回调中执行！
        const videoContext = wx.createVideoContext('consultVideo', this);
        videoContext.play(); // 主动播放
      });
    };

    if (forceReplay && isSameVideo) {
      console.log('强制重播相同视频：先清空 currentVideo');
      this.setData({ currentVideo: '', isTTSPlaying: false });
      setTimeout(doPlay, 100);
    } else {
      doPlay();
    }
  });
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

    // ✅ 最优先处理 || 复合条件
    if (condition.includes("||")) {
      const parts = condition.split("||").map(s => s.trim());
      return parts.some(part => this.checkQuestionCondition(part));
    }

    // ✅ 然后处理显式布尔条件
    if (/==\s*(true|false)/.test(condition)) {
      const [field, value] = condition.split("==").map(s => s.trim());
      const cleanValue = value.replace(/['"]/g, '');
      const patientValue = this.data.patientData[field];
      console.log(`检查条件: ${field} == ${cleanValue}, 患者数据: ${patientValue}`);
      return String(patientValue) === cleanValue;
    }

    // ✅ 特殊字段处理
    if (condition.includes("==")) {
      const [field, value] = condition.split("==").map(s => s.trim());
      const cleanValue = value.replace(/['"]/g, '');
      const patientValue = this.data.patientData[field];
      if (field === 'gender') {
        if (!patientValue) {
          console.log('性别未确定，跳过女性专属问题');
          return false;
        }
        const normalizeGender = (val) => {
          if (!val) return "";
          if (["male", "男", "m", "1"].includes(val.toLowerCase())) return "male";
          if (["female", "女", "f", "0"].includes(val.toLowerCase())) return "female";
          return val.toLowerCase();
        };
        const normalizedPatientGender = normalizeGender(patientValue);
        const normalizedConditionGender = normalizeGender(cleanValue);
        const result = normalizedPatientGender === normalizedConditionGender;
        console.log(`性别匹配结果: ${result}`);
        console.log("🌈 原始性别值:", patientValue);
        console.log("🌈 条件值:", cleanValue);
        console.log("🌈 归一化后:", normalizedPatientGender, "==", normalizedConditionGender);
        console.log("🌈 匹配结果:", result);
        return result;
      }
      console.log(`检查条件: ${field} == ${cleanValue}, 患者数据: ${patientValue}`);
      return patientValue === cleanValue;
    }
    return true;
  },


  /**
   * 自动开始语音录音
   */
  startAutoVoiceRecording() {
    if (!this.data.autoVoiceMode || this.data.isRecording || this.data.isConsultFinished || this.data.isPreparingRecording) {
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
          voice_format: this.data.llmConfig.asr?.voice_format || 1,
          needvad: 1,
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
            resolve();
          } else if (res.authSetting['scope.record'] === false) {
            wx.showModal({
              title: '麦克风权限',
              content: '实时语音识别需要麦克风权限，将使用普通录音模式',
              showCancel: false,
              confirmText: '知道了'
            });
            reject(new Error('权限被拒绝'));
          } else {
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
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(),
            fail: () => reject(new Error('权限申请失败'))
          });
        }
      });
    });
  },

  /**
   * 处理实时语音识别结果
   */
  handleRealtimeASRResult(result) {
    console.log('实时识别结果:', result);
    
    this.setData({
      realtimeRecognitionText: result.text
    });

    if (result.is_final && result.text.trim()) {
      console.log('收到最终识别结果:', result.text);
      
      this.stopRealtimeASR();
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
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager();
      this.initAutoRecorderEvents();
    }

    this.setData({ isRecording: true });

    wx.showToast({
      title: '开始录音...',
      icon: 'none',
      duration: 1000
    });

    console.log('开始传统录音');
    
    this.recorderManager.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });

    this.startSilenceDetection();
  },

  /**
   * 开始静音检测
   */
  startSilenceDetection() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

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
      this.stopRealtimeASR();
    } else if (this.data.isRecording) {
      this.stopTraditionalRecording();
    }
  },

  /**
   * 停止传统录音
   */
  stopTraditionalRecording() {
    console.log('停止传统录音');
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.recorderManager.stop();
    this.setData({ isRecording: false });
  },

  /**
   * 初始化自动录音事件
   */
  initAutoRecorderEvents() {
    const that = this;

    this.recorderManager.onStart(() => {
      console.log('自动录音开始');
    });

    this.recorderManager.onStop((res) => {
      console.log('自动录音结束', res);
      
      if (res.tempFilePath) {
        wx.showToast({
          title: '语音识别中...',
          icon: 'loading',
          duration: 3000
        });
        
        that.processAutoVoiceRecognition(res.tempFilePath);
      }
    });

    this.recorderManager.onError((err) => {
      console.error('自动录音错误:', err);
      this.setData({ isRecording: false });
      
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
   * 处理自动语音识别 - 使用腾讯云ASR
   */
  async processAutoVoiceRecognition(audioPath) {
    try {
      const result = await this.callASRCloudFunction(audioPath);
      
      wx.hideToast();
      
      if (result.success && result.text.trim()) {
        console.log('语音识别成功:', result.text);
        await this.sendAutoVoiceMessage(result.text);
      } else {
        console.log('语音识别结果为空或失败:', result.message);
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
      const isRelevant = await this.checkAnswerRelevance(text);
      
      if (!isRelevant) {
        console.log('回答不相关，重复当前问题');
        
        await this.repeatCurrentQuestion();
      } else {
        console.log('回答相关，处理下一个问题');
        await this.processNextQuestion();
      }
      
    } catch (error) {
      console.error('发送消息错误:', error);
      this.setData({ 
        isWaitingResponse: false,
        isInputDisabled: false 
      });
      
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
    const repeatText = `您的回答似乎与问题不太相关，能否请您重新回答一下？`;
    await this.addSystemMessage(
      `您的回答似乎与问题不太相关，能否请您重新回答一下？`,
      true
    );
    
    this.setData({ 
      isWaitingResponse: false,
      isInputDisabled: false ,
      currentVideo: '',
      isTTSPlaying: false
    });
    
    setTimeout(() => {
      if (this.data.autoVoiceMode) {
        this.playVideoAndStartRecording(repeatText, true);
      } else {
        this.playVideoOnly(repeatText, true);
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
      const isRelevant = await this.checkAnswerRelevance(text);
      
      if (!isRelevant) {
        const irrelevantMessage = "您的回答似乎与问题不太相关，能否请您重新回答一下？";
        await this.addSystemMessage(irrelevantMessage, true);
        
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            this.playVideoAndStartRecording(irrelevantMessage);
          } else {
            this.playVideoOnly(irrelevantMessage);
          }
        }, 1500);
        
        this.setData({ 
          isWaitingResponse: false,
          isInputDisabled: false,
          inputText: ""
        });
        
        setTimeout(() => {
          this.setData({ inputFocus: true });
        }, 100);
        return;
      }

      await this.processNextQuestion();
      
    } catch (error) {
      console.error('发送消息错误:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
      this.setData({ 
        isWaitingResponse: false,
        isInputDisabled: false,
        inputText: ""
      });
      
      setTimeout(() => {
        this.setData({ inputFocus: true });
      }, 100);
    }
  },

  /**
   * 检查回答相关性 - 使用LLM进行智能判断
   */
  async checkAnswerRelevance(answer) {
  try {
    const currentQuestion = this.getCurrentQuestion();
    const relevanceResult = await this.callLLMForRelevance(currentQuestion.question, answer);

    if (relevanceResult.isRelevant) {
      const extractedData = await this.extractStructuredData(answer, currentQuestion.fields);
      console.log("📌 提取结构化字段：", extractedData);

      // ✅ 直接合并进 this.data.patientData
      Object.assign(this.data.patientData, extractedData);

      // ✅ 更新 rawResponses 和 patientData
      this.setData({
        rawResponses: {
          ...this.data.rawResponses,
          [this.data.currentQuestionKey]: (this.data.rawResponses[this.data.currentQuestionKey] || "") + " " + answer
        },
        patientData: this.data.patientData
      });

      console.log("🧬 当前 patientData:", this.data.patientData);

      return true;
    }

    return false;
  } catch (error) {
    console.error('相关性检查失败:', error);
    return true; // 默认继续问
  }
}
,

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
        "gender": "性别(male/female)",
        "age": "年龄(数字)",
        "chronic_disease": "慢性病类型",
        "treatment": "治疗方式",
        "drug_allergy": "药物过敏情况",
        "fever": "是否发热(true/false)",
        "fever_temperature": "发热温度",
        "fever_time": "发热时间段",
        "cold_feeling": "是否怕冷(true/false)",
        "cold_relief": "怕冷缓解情况",
        "sweating": "是否出汗(true/false)",
        "sweat_type": "汗液类型",
        "headache": "是否头痛(true/false)",
        "headache_location": "头痛部位",
        "headache_type": "头痛类型",
        "dizziness": "是否头晕(true/false)",
        "dizziness_type": "头晕类型",
        "nausea": "是否恶心(true/false)",
        "eye_symptoms": "眼部症状",
        "ear_symptoms": "耳部症状",
        "nose_symptoms": "鼻部症状",
        "throat_symptoms": "咽部症状",
        "cough": "是否咳嗽(true/false)",
        "cough_type": "咳嗽类型",
        "phlegm": "是否有痰(true/false)",
        "phlegm_color": "痰颜色",
        "phlegm_texture": "痰质地",
        "phlegm_easy": "是否易咳出",
        "chest_tightness": "是否胸闷(true/false)",
        "palpitation": "是否心悸(true/false)",
        "appetite": "食欲情况",
        "mouth_symptoms": "口腔症状",
        "drinking_habits": "饮水习惯",
        "urine_flow": "小便情况",
        "urine_color": "尿色",
        "bowel_frequency": "大便频率",
        "bowel_shape": "大便性状",
        "abdominal_pain": "腹痛情况",
        "sleep_quality": "睡眠质量",
        "mood": "情绪状态",
        "skin_symptoms": "皮肤症状",
        "menstrual_cycle": "月经周期",
        "menstrual_color": "月经颜色与量",
        "dysmenorrhea": "是否痛经(true/false)",
        "leucorrhea": "白带情况"
      };
      
      const relevantFields = fields.filter(field => fieldsDescription[field]);
      
      if (relevantFields.length === 0) {
        return {};
      }
      console.log("🧪 进入 extractStructuredData()");
      const prompt = this.data.llmConfig.extractionPrompt(
        answer, 
        relevantFields.map(field => `- ${field}: ${fieldsDescription[field]}`).join('\n')
      );
      console.log("📤 构造的提取 Prompt:", prompt);

      const response = await this.callLLMAPI(prompt);
      console.log("📥 LLM原始输出:", response); 
          let extracted = {};

    try {
      // ✅ 先尝试直接解析整段为 JSON
      extracted = JSON.parse(response);
    } catch (e) {
      // ❗失败时使用 fallback 提取 JSON 片段
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        console.warn("⚠️ 无法提取结构化 JSON：", response);
        return {};
      }
    }

    // ✅ 统一 gender 值格式
    if (extracted.gender) {
      const genderRaw = extracted.gender.trim().toLowerCase();
      if (genderRaw.includes('男') || genderRaw === 'male') {
        extracted.gender = 'male';
      } else if (genderRaw.includes('女') || genderRaw === 'female') {
        extracted.gender = 'female';
      }
    }

    // ✅ 如果 gender 还是没被识别，做兜底
    if (!extracted.gender) {
      const raw = answer.toLowerCase();
      if (raw.includes('女')) {
        extracted.gender = 'female';
      } else if (raw.includes('男')) {
        extracted.gender = 'male';
      }
      console.warn('⚠️ LLM未提取性别，使用正则兜底，结果：', extracted.gender);
    }

    console.log("📌 提取结构化字段：", extracted);
    return extracted;

  } catch (error) {
    console.error('❌ 数据提取失败:', error);
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
          console.log("📤 正在请求 LLM，Prompt:", prompt);
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
        console.log("📥 LLM 返回内容：", response);
        return response;
        
      } catch (error) {
        console.error(`LLM API调用失败 (尝试 ${retry + 1}/${config.retryTimes + 1}):`, error);
        
        if (retry === config.retryTimes) {
          if (config.fallback && config.fallback.apiKey !== "your-openai-api-key-here") {
            try {
              return await this.callFallbackLLMAPI(prompt);
            } catch (fallbackError) {
              console.error('备用LLM API也失败:', fallbackError);
              return "";
            }
          }
          return "";
        }
        
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
   * 调用阿里云智能体应用
   */
  async callAliyunAgent(patientInfo) {
    const config = this.data.llmConfig.aliyunAgent;
    
    try {
      const prompt = this.data.llmConfig.aliyunAgentPrompt(patientInfo);
      
      const requestData = {
        input: {
          prompt: prompt
        },
        parameters: {},
        debug: {},
        // 如果配置了RAG选项，添加到请求中
        ...(Object.keys(config.ragOptions).length > 0 && { 
          rag_options: config.ragOptions 
        })
      };
      
      console.log('调用阿里云智能体应用，请求数据:', requestData);
      
      const response = await this.callAliyunAgentAPI(requestData);
      return response;
      
    } catch (error) {
      console.error('阿里云智能体应用调用失败:', error);
      throw error;
    }
  },

  /**
   * 调用阿里云智能体应用API
   */
  async callAliyunAgentAPI(requestData) {
    const config = this.data.llmConfig.aliyunAgent;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${config.baseUrl}/${config.appId}/completion`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        data: requestData,
        timeout: this.data.llmConfig.requestTimeout,
        success: (res) => {
          console.log('阿里云智能体应用响应:', res);
          
          if (res.statusCode === 200) {
            if (res.data.output && res.data.output.text) {
              resolve(res.data.output.text);
            } else if (res.data.output && res.data.output.choices && res.data.output.choices[0]) {
              resolve(res.data.output.choices[0].message.content);
            } else {
              reject(new Error('阿里云智能体应用响应格式错误'));
            }
          } else {
            reject(new Error(`阿里云智能体应用调用失败: ${res.statusCode} ${JSON.stringify(res.data)}`));
          }
        },
        fail: (err) => {
          console.error('阿里云智能体应用网络请求失败:', err);
          reject(new Error('网络请求失败'));
        }
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

    if (currentQuestion.followUps && currentFollowUpIndex < currentQuestion.followUps.length - 1) {
      const nextFollowUpIndex = currentFollowUpIndex + 1;
      const nextFollowUp = currentQuestion.followUps[nextFollowUpIndex];
      console.log(`当前问题: ${currentQuestionKey}, followUpIndex: ${nextFollowUpIndex}`);
      console.log(`检测 followUp 条件: ${nextFollowUp.condition}, 结果: ${this.checkQuestionCondition(nextFollowUp.condition)}`);
      if (this.checkQuestionCondition(nextFollowUp.condition)) {
        await this.addSystemMessage(nextFollowUp.question, true);
        
        this.setData({
          currentFollowUpIndex: nextFollowUpIndex,
          isWaitingResponse: false,
          isInputDisabled: false
        });
        
        if (!this.data.autoVoiceMode) {
          setTimeout(() => {
            this.setData({ inputFocus: true });
          }, 1000);
        }
        
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            this.playVideoAndStartRecording(nextFollowUp.question);
          } else {
            this.playVideoOnly(nextFollowUp.question);
          }
        }, 500);
        
        return;
      } else {
        this.setData({ currentFollowUpIndex: nextFollowUpIndex });
        await this.processNextQuestion();
        return;
      }
    }
    
    const nextQuestionKey = this.getNextQuestionKey();
    
    if (nextQuestionKey) {
      const nextMainQuestion = this.data.questionTree[nextQuestionKey];
      
      if (this.checkQuestionCondition(nextMainQuestion.condition)) {
        await this.addSystemMessage(nextMainQuestion.question, true);
        
        this.setData({
          currentQuestionKey: nextQuestionKey,
          currentFollowUpIndex: -1,
          isWaitingResponse: false,
          isInputDisabled: false
        });
        
        if (!this.data.autoVoiceMode) {
          setTimeout(() => {
            this.setData({ inputFocus: true });
          }, 1000);
        }
        
        setTimeout(() => {
          if (this.data.autoVoiceMode) {
            this.playVideoAndStartRecording(nextMainQuestion.question);
          } else {
            this.playVideoOnly(nextMainQuestion.question);
          }
        }, 500);
      } else {
        this.setData({
          currentQuestionKey: nextQuestionKey,
          currentFollowUpIndex: -1
        });
        await this.processNextQuestion();
      }
      
    } else {
      await this.finishConsultation();
    }
  },

  /**
   * 完成问诊并生成总结
   */
  async finishConsultation() {
    const finishMessage = "感谢您的配合！所有问题已经回答完毕，正在为您生成健康建议和症状总结...";
    await this.addSystemMessage(finishMessage, true);
    
    setTimeout(() => {
      if (this.data.autoVoiceMode) {
        this.playVideoOnly(finishMessage);
      } else {
        this.playVideoOnly(finishMessage);
      }
    }, 1500);
    
    this.setData({
      isConsultFinished: true,
      isWaitingResponse: true,
      isInputDisabled: true,
      autoVoiceMode: false
    });

    try {
      const summary = await this.generateMedicalSummary();
      
      await this.addSystemMessage(summary, true);
      
      setTimeout(() => {
        this.playVideoOnly(summary);
      }, 1500);
      
      this.saveRecordsAndNavigate();
      
    } catch (error) {
      console.error('生成总结失败:', error);
      const errorMessage = "系统正在整理您的信息，请稍后查看总结页面。";
      await this.addSystemMessage(errorMessage, true);
      
      setTimeout(() => {
        this.playVideoOnly(errorMessage);
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
      
      // 检查是否启用阿里云智能体应用
      if (this.data.llmConfig.enableAliyunAgent) {
        console.log('使用阿里云智能体应用生成总结');
        const summary = await this.callAliyunAgent(patientInfo);
        return summary;
      } else {
        console.log('使用传统LLM生成总结');
        const prompt = this.data.llmConfig.summaryPrompt(patientInfo);
        const summary = await this.callLLMAPI(prompt);
        return summary;
      }
      
    } catch (error) {
      console.error('总结生成失败:', error);
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
    });
    wx.setStorageSync("inputMode", newMode);

    if (newMode === '语音输入') {
      wx.showToast({
        title: '语音模式已激活',
        icon: 'success',
        duration: 1500
      });
      
      // 如果切换到语音模式且当前有问题在等待回答，自动开始录音（0.5s后）
      if (!this.data.isConsultFinished && !this.data.isWaitingResponse && !this.data.isTTSPlaying && !this.data.isPreparingRecording) {
        // 在需要录音时设置 preparing 状态
        this.setData({ isPreparingRecording: true });
        setTimeout(() => {
          this.startAutoVoiceRecording();
          this.setData({ isPreparingRecording: false });
        }, 500);
      }
    } else {
      wx.showToast({
        title: '文字模式已激活', icon: 'success', duration: 1500 });
        this.setData({ isPreparingRecording: false });  // 释放准备状态
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
          if (this.data.isTTSPlaying) {
            this.setData({ isTTSPlaying: false, currentVideo: '', showImage: false });
          }
          
          // 停止录音（如果正在录音）
          if (this.data.isRecording && this.recorderManager) {
            this.recorderManager.stop();
          }
          
          // 确保视频 URL 被清空，以便重新初始化视频播放
          this.setData({ currentVideo: '' });
          
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
            // 不在此处设置isTTSPlaying，交由initializeChat方法处理视频播放逻辑
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
  },

  /**
   * 测试阿里云智能体应用（调试用）
   */
  async testAliyunAgent() {
    if (!this.data.llmConfig.enableAliyunAgent) {
      wx.showModal({
        title: '测试结果',
        content: '阿里云智能体应用未启用，请在配置中开启',
        showCancel: false
      });
      return;
    }

    wx.showLoading({
      title: '测试中...',
      mask: true
    });

    try {
      const testInfo = `患者信息：女性，35岁
问诊信息：
T1-基础信息：我是女性，35岁，有轻微高血压在服药治疗，无药物过敏。
T2-发热寒热：最近有轻微发热，晚上比较明显，体温37.5度左右。
T3-头痛头晕：偶尔头痛，主要在太阳穴部位，胀痛。
T5-咽喉与咳嗽：喉咙有些干痒，有轻微咳嗽，少量白痰。
T8-睡眠情绪：睡眠质量一般，容易早醒，情绪有些焦虑。`;

      const result = await this.callAliyunAgent(testInfo);
      
      wx.hideLoading();
      
      wx.showModal({
        title: '测试成功',
        content: `阿里云智能体应用调用成功！\n\n响应长度：${result.length}字符\n\n前100字符：${result.substring(0, 100)}...`,
        showCancel: false
      });
      
      console.log('阿里云智能体应用测试结果:', result);
      
    } catch (error) {
      wx.hideLoading();
      
      wx.showModal({
        title: '测试失败',
        content: `错误信息：${error.message}\n\n请检查配置和网络连接`,
        showCancel: false
      });
      
      console.error('阿里云智能体应用测试失败:', error);
    }
  }
});