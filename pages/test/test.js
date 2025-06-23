/**
 * DashScope API测试工具
 * 用于测试LLM、ASR、TTS功能是否正常工作
 */

const LLM_CONFIG = require('../../config/llm-config.js');

// 测试页面，用于验证API功能
Page({
  data: {
    testResults: [],
    testing: false,
    apiKey: '',
    model: ''
  },

  onLoad() {
    console.log('API测试页面加载');
    
    // 显示配置信息
    this.setData({
      apiKey: LLM_CONFIG.apiKey.substring(0, 8) + '...',
      model: LLM_CONFIG.model
    });
    
    this.addResult('info', '页面已加载，准备测试API功能');
  },

  /**
   * 添加测试结果
   */
  addResult(type, message) {
    const result = {
      type: type, // success, error, info
      message: message,
      time: new Date().toLocaleTimeString()
    };
    
    this.setData({
      testResults: [...this.data.testResults, result]
    });
    
    console.log(`[${type.toUpperCase()}] ${message}`);
  },

  /**
   * 测试LLM API
   */
  async testLLM() {
    this.addResult('info', '开始测试LLM API...');
    
    try {
      const response = await this.callLLMAPI('你好，请简单回复"测试成功"');
      
      if (response.includes('测试成功') || response.includes('你好')) {
        this.addResult('success', `LLM测试成功: ${response.substring(0, 50)}...`);
      } else {
        this.addResult('success', `LLM响应: ${response.substring(0, 100)}...`);
      }
    } catch (error) {
      this.addResult('error', `LLM测试失败: ${error.message}`);
    }
  },
  /**
   * 测试TTS API
   */
  async testTTS() {
    this.addResult('info', '开始测试TTS API...');
    
    try {
      await this.callTTSAPI('你好，这是TTS测试');
      this.addResult('success', 'TTS测试成功，音频已播放');
    } catch (error) {
      this.addResult('error', `TTS测试失败: ${error.message}`);
    }
  },

  /**
   * 测试ASR API (需要用户录音)
   */
  async testASR() {
    this.addResult('info', '开始测试ASR API，请点击录音按钮...');
    
    try {
      // 启动录音
      const recorderManager = wx.getRecorderManager();
      
      recorderManager.onStart(() => {
        this.addResult('info', '录音开始，请说话...');
      });
      
      recorderManager.onStop(async (res) => {
        this.addResult('info', '录音结束，正在识别...');
        
        try {
          const text = await this.callASRAPI(res.tempFilePath);
          this.addResult('success', `ASR识别结果: ${text}`);
        } catch (error) {
          this.addResult('error', `ASR识别失败: ${error.message}`);
        }
      });
      
      recorderManager.onError((err) => {
        this.addResult('error', `录音失败: ${err.errMsg}`);
      });
      
      // 开始录音
      recorderManager.start({
        duration: 10000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3',
        frameSize: 50
      });
      
      // 3秒后自动停止
      setTimeout(() => {
        recorderManager.stop();
      }, 3000);
      
    } catch (error) {
      this.addResult('error', `ASR测试失败: ${error.message}`);
    }
  },
  /**
   * 运行所有测试
   */
  async runAllTests() {
    if (this.data.testing) return;
    
    this.setData({ testing: true, testResults: [] });
    
    // 1. 检查API密钥
    this.checkAPIKey();
    
    // 2. 测试LLM
    await this.testLLM();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 测试TTS
    await this.testTTS();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 提示ASR测试
    this.addResult('info', 'ASR测试需要手动点击"测试ASR"按钮进行录音测试');
    
    this.setData({ testing: false });
    this.addResult('success', '自动测试完成，请手动测试ASR功能');
  },

  /**
   * 检查API密钥格式
   */
  checkAPIKey() {
    const apiKey = LLM_CONFIG.apiKey;
    
    if (!apiKey || apiKey === 'your-dashscope-api-key-here') {
      this.addResult('error', 'API密钥未配置，请在llm-config.js中设置');
      return false;
    }
    
    if (!apiKey.startsWith('sk-')) {
      this.addResult('error', 'API密钥格式错误，应该以sk-开头');
      return false;
    }
    
    if (apiKey.length < 30) {
      this.addResult('error', 'API密钥长度可能不正确');
      return false;
    }
    
    this.addResult('success', `API密钥格式正确: ${apiKey.substring(0, 8)}...`);
    return true;
  },

  /**
   * 调用LLM API
   */
  async callLLMAPI(prompt) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${LLM_CONFIG.baseUrl}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
        },
        data: {
          model: LLM_CONFIG.model,
          messages: [
            {
              role: "system",
              content: LLM_CONFIG.systemPrompt
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: LLM_CONFIG.temperature,
          max_tokens: 100
        },
        timeout: LLM_CONFIG.requestTimeout,
        success: (res) => {
          if (res.statusCode === 200 && res.data.choices && res.data.choices[0]) {
            resolve(res.data.choices[0].message.content);
          } else {
            reject(new Error(`LLM API错误: ${res.statusCode} ${JSON.stringify(res.data)}`));
          }
        },
        fail: (err) => {
          reject(new Error(`请求失败: ${err.errMsg}`));
        }
      });
    });
  },
  /**
   * 调用TTS API
   */
  async callTTSAPI(text) {
    const ttsConfig = LLM_CONFIG.tts;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: ttsConfig.baseUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
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
        timeout: 15000,
        success: (res) => {
          if (res.statusCode === 200 && res.data.output && res.data.output.audio_url) {
            // 播放音频测试
            this.playTestAudio(res.data.output.audio_url, resolve, reject);
          } else {
            reject(new Error(`TTS API错误: ${JSON.stringify(res.data)}`));
          }
        },
        fail: (err) => {
          reject(new Error(`TTS请求失败: ${err.errMsg}`));
        }
      });
    });
  },

  /**
   * 调用ASR API
   */
  async callASRAPI(audioFilePath) {
    const asrConfig = LLM_CONFIG.asr;
    
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: asrConfig.baseUrl,
        filePath: audioFilePath,
        name: 'audio',
        header: {
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
        },
        formData: {
          'model': asrConfig.model,
          'format': asrConfig.format,
          'sample_rate': asrConfig.sampleRate,
          'enable_punctuation': asrConfig.enablePunctuation,
          'enable_itn': asrConfig.enableITN
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.output && data.output.text) {
              resolve(data.output.text);
            } else {
              reject(new Error(`ASR API错误: ${res.data}`));
            }
          } catch (error) {
            reject(new Error(`ASR响应解析失败: ${error.message}`));
          }
        },
        fail: (err) => {
          reject(new Error(`ASR请求失败: ${err.errMsg}`));
        }
      });
    });
  },

  /**
   * 播放测试音频
   */
  playTestAudio(audioUrl, resolve, reject) {
    const audioContext = wx.createInnerAudioContext();
    
    audioContext.src = audioUrl;
    audioContext.onPlay(() => {
      console.log('TTS测试音频开始播放');
    });
    
    audioContext.onEnded(() => {
      console.log('TTS测试音频播放完成');
      audioContext.destroy();
      resolve();
    });
    
    audioContext.onError((err) => {
      console.error('TTS测试音频播放失败:', err);
      audioContext.destroy();
      reject(new Error('音频播放失败'));
    });
    
    audioContext.play();
  },

  /**
   * 清空测试结果
   */
  clearResults() {
    this.setData({ testResults: [] });
  },

  /**
   * 复制API密钥（去敏感化）
   */
  copyAPIInfo() {
    const info = `API配置信息:
BaseURL: ${LLM_CONFIG.baseUrl}
Model: ${LLM_CONFIG.model}
API Key: ${LLM_CONFIG.apiKey.substring(0, 8)}...
功能开关: LLM(${LLM_CONFIG.enableRelevanceCheck}), ASR(${LLM_CONFIG.enableASR}), TTS(${LLM_CONFIG.enableTTS})`;
    
    wx.setClipboardData({
      data: info,
      success: () => {
        wx.showToast({
          title: '配置信息已复制',
          icon: 'success'
        });
      }
    });
  }
});
