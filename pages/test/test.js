/**
 * 腾讯云语音服务API测试工具
 * 用于测试LLM、ASR、TTS功能是否正常工作
 */

const LLM_CONFIG = require('../../config/llm-config.js');
const TencentCloud = require('../../utils/tencent-cloud-final.js');

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
    
    this.addResult('info', '页面已加载，准备测试腾讯云语音服务API功能');
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
  },  /**
   * 测试TTS API - 使用腾讯云语音合成
   */
  async testTTS() {
    this.addResult('info', '开始测试腾讯云TTS API...');
    
    try {
      const result = await TencentCloud.callTencentTTS(LLM_CONFIG.tts, '你好，这是腾讯云TTS测试');
      
      // 播放音频
      await TencentCloud.playTencentTTSAudio(result.audioPath);
      
      this.addResult('success', 'TTS测试成功，音频已播放');
    } catch (error) {
      this.addResult('error', `TTS测试失败: ${error.message}`);
    }
  },

  /**
   * 测试ASR API - 使用腾讯云实时语音识别
   */
  async testASR() {
    this.addResult('info', '开始测试腾讯云ASR API，请点击录音按钮...');
    
    try {
      // 启动录音
      const recorderManager = wx.getRecorderManager();
      
      recorderManager.onStart(() => {
        this.addResult('info', '录音开始，请说话...');
      });
      
      recorderManager.onStop(async (res) => {
        this.addResult('info', '录音结束，正在使用腾讯云识别...');
        
        try {
          const text = await TencentCloud.callTencentASR(LLM_CONFIG.asr, res.tempFilePath);
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
  },  /**
   * 运行所有测试
   */
  async runAllTests() {
    if (this.data.testing) return;
    
    this.setData({ testing: true, testResults: [] });
    
    // 1. 检查API密钥和腾讯云配置
    this.checkAPIKey();
    
    // 2. 测试LLM
    await this.testLLM();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 测试腾讯云TTS
    await this.testTTS();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 提示ASR测试
    this.addResult('info', '腾讯云ASR测试需要手动点击"测试ASR"按钮进行录音测试');
    
    this.setData({ testing: false });
    this.addResult('success', '自动测试完成，请手动测试腾讯云ASR功能');
  },
  /**
   * 检查API密钥格式
   */
  checkAPIKey() {
    const apiKey = LLM_CONFIG.apiKey;
    const tencentConfig = LLM_CONFIG.tencent;
    
    // 检查LLM API密钥
    if (!apiKey || apiKey === 'your-dashscope-api-key-here') {
      this.addResult('error', 'LLM API密钥未配置，请在llm-config.js中设置');
      return false;
    }
    
    if (!apiKey.startsWith('sk-')) {
      this.addResult('error', 'LLM API密钥格式错误，应该以sk-开头');
      return false;
    }
    
    if (apiKey.length < 30) {
      this.addResult('error', 'LLM API密钥长度可能不正确');
      return false;
    }
    
    this.addResult('success', `LLM API密钥格式正确: ${apiKey.substring(0, 8)}...`);
    
    // 检查腾讯云配置
    if (!tencentConfig.appid || tencentConfig.appid === 'your-tencent-appid') {
      this.addResult('error', '腾讯云AppID未配置，请在llm-config.js中设置');
      return false;
    }
    
    if (!tencentConfig.secretid || tencentConfig.secretid === 'your-tencent-secretid') {
      this.addResult('error', '腾讯云SecretId未配置，请在llm-config.js中设置');
      return false;
    }
    
    if (!tencentConfig.secretkey || tencentConfig.secretkey === 'your-tencent-secretkey') {
      this.addResult('error', '腾讯云SecretKey未配置，请在llm-config.js中设置');
      return false;
    }
    
    this.addResult('success', `腾讯云配置正确: AppID=${tencentConfig.appid}`);
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
  },  /**
   * 清空测试结果
   */
  clearResults() {
    this.setData({ testResults: [] });
  },

  /**
   * 复制API配置信息（去敏感化）
   */
  copyAPIInfo() {
    const info = `API配置信息:
LLM BaseURL: ${LLM_CONFIG.baseUrl}
LLM Model: ${LLM_CONFIG.model}
LLM API Key: ${LLM_CONFIG.apiKey.substring(0, 8)}...
腾讯云AppID: ${LLM_CONFIG.tencent.appid}
腾讯云SecretId: ${LLM_CONFIG.tencent.secretid.substring(0, 8)}...
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
