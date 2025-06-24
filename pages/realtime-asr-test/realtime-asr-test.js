/**
 * 实时语音识别测试页面
 */

const TencentRealtimeASR = require('../../utils/tencent-realtime-asr.js');
const LLM_CONFIG = require('../../config/llm-config.js');

Page({
  data: {
    isRecording: false,
    recognitionResult: '',
    realtimeText: '',
    connectionStatus: '未连接',
    testResults: []
  },

  onLoad() {
    console.log('实时ASR测试页面加载');
  },

  /**
   * 开始实时语音识别测试
   */
  async startRealtimeTest() {
    try {
      this.addTestResult('info', '开始实时语音识别测试...');
      
      // 检查录音权限
      await this.checkRecordPermission();
        // 准备ASR配置（使用修正后的TC3签名配置）
      const asrConfig = {
        appid: LLM_CONFIG.asr.appid,
        secretid: LLM_CONFIG.asr.secretid,
        secretkey: LLM_CONFIG.asr.secretkey,
        engine_model_type: LLM_CONFIG.asr.engine_model_type || '16k_zh',
        voice_format: LLM_CONFIG.asr.voice_format || 1, // 使用PCM格式
        needvad: LLM_CONFIG.asr.needvad || 1,
        filter_dirty: LLM_CONFIG.asr.filter_dirty || 0,
        filter_modal: LLM_CONFIG.asr.filter_modal || 0,
        filter_punc: LLM_CONFIG.asr.filter_punc || 0,
        convert_num_mode: LLM_CONFIG.asr.convert_num_mode || 1,
        word_info: LLM_CONFIG.asr.word_info || 0,
        vad_silence_time: LLM_CONFIG.asr.vad_silence_time || 1000
      };
      
      this.addTestResult('info', `ASR配置: ${JSON.stringify(asrConfig, null, 2)}`);

      // 创建实时ASR实例
      this.realtimeASR = new TencentRealtimeASR(asrConfig);
      
      // 设置回调函数
      this.realtimeASR.onResult = (result) => {
        console.log('实时识别结果:', result);
        this.setData({
          realtimeText: result.text
        });
        
        if (result.is_final) {
          this.setData({
            recognitionResult: result.text
          });
          this.addTestResult('success', `最终识别结果: ${result.text}`);
        }
      };
        this.realtimeASR.onError = (error) => {
        console.error('实时ASR错误:', error);
        this.addTestResult('error', `识别错误: ${error.message}`);
        
        // 如果是4002签名错误，记录详细信息
        if (error.message && error.message.includes('4002')) {
          this.addTestResult('error', '签名验证失败（4002）- 可能的原因：');
          this.addTestResult('error', '1. TC3签名算法问题');
          this.addTestResult('error', '2. 时间戳不准确');
          this.addTestResult('error', '3. 参数排序问题');
          this.addTestResult('error', '4. 密钥配置错误');
        }
        
        this.setData({
          isRecording: false,
          connectionStatus: '连接失败'
        });
      };
      
      this.realtimeASR.onConnect = () => {
        console.log('实时ASR连接成功');
        this.addTestResult('success', 'WebSocket连接成功');
        this.setData({
          connectionStatus: '已连接'
        });
      };
      
      this.realtimeASR.onStart = () => {
        console.log('实时ASR开始录音');
        this.addTestResult('info', '开始录音，请说话...');
        this.setData({
          isRecording: true
        });
      };
      
      this.realtimeASR.onEnd = () => {
        console.log('实时ASR结束');
        this.addTestResult('info', '实时语音识别结束');
        this.setData({
          isRecording: false,
          connectionStatus: '已断开'
        });
      };

      // 开始实时识别
      await this.realtimeASR.start();
      
    } catch (error) {
      console.error('启动实时ASR测试失败:', error);
      this.addTestResult('error', `启动失败: ${error.message}`);
    }
  },

  /**
   * 停止实时语音识别测试
   */
  async stopRealtimeTest() {
    try {
      if (this.realtimeASR) {
        await this.realtimeASR.stop();
        this.realtimeASR = null;
      }
      
      this.setData({
        isRecording: false,
        connectionStatus: '已断开'
      });
      
      this.addTestResult('info', '手动停止实时语音识别');
      
    } catch (error) {
      console.error('停止实时ASR失败:', error);
      this.addTestResult('error', `停止失败: ${error.message}`);
    }
  },
  /**
   * 测试签名生成
   */
  async testSignature() {
    try {
      this.addTestResult('info', '开始测试TC3签名生成...');
      
      const testConfig = {
        appid: LLM_CONFIG.asr.appid,
        secretid: LLM_CONFIG.asr.secretid,
        secretkey: LLM_CONFIG.asr.secretkey
      };
      
      this.addTestResult('info', `配置检查: AppId=${testConfig.appid}, SecretId=${testConfig.secretid ? '已配置' : '未配置'}`);
      
      // 调用云函数生成签名
      const result = await wx.cloud.callFunction({
        name: 'realtime-asr',
        data: {
          action: 'start',
          config: testConfig
        }
      });
      
      if (result.result && result.result.success) {
        this.addTestResult('success', '签名生成成功');
        this.addTestResult('info', `Voice ID: ${result.result.voice_id}`);
        this.addTestResult('info', `URL长度: ${result.result.ws_url.length}`);
        this.addTestResult('info', `Authorization: ${result.result.authorization || '无'}`);
      } else {
        this.addTestResult('error', `签名生成失败: ${result.result?.message || '未知错误'}`);
      }
      
    } catch (error) {
      console.error('签名测试失败:', error);
      this.addTestResult('error', `签名测试失败: ${error.message}`);
    }
  },  /**
   * 检查录音权限
   */
  checkRecordPermission() {
    return new Promise((resolve, reject) => {
      // 先检查权限状态
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record'] === true) {
            // 已授权
            this.addTestResult('success', '录音权限检查通过（已授权）');
            resolve();
          } else if (res.authSetting['scope.record'] === false) {
            // 权限被拒绝，引导用户到设置页面
            this.addTestResult('error', '录音权限被拒绝，需要手动开启');
            this.showPermissionModal();
            reject(new Error('录音权限被拒绝'));
          } else {
            // 未申请过权限，申请权限
            this.addTestResult('info', '首次申请录音权限...');
            this.requestRecordPermission(resolve, reject);
          }
        },
        fail: () => {
          // 获取设置失败，尝试直接申请权限
          this.addTestResult('warning', '无法获取权限状态，尝试申请权限...');
          this.requestRecordPermission(resolve, reject);
        }
      });
    });
  },

  /**
   * 申请录音权限
   */
  requestRecordPermission(resolve, reject) {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.addTestResult('success', '录音权限申请成功');
        resolve();
      },
      fail: () => {
        this.addTestResult('error', '录音权限申请失败');
        this.showPermissionModal();
        reject(new Error('录音权限被拒绝'));
      }
    });
  },

  /**
   * 显示权限申请对话框
   */
  showPermissionModal() {
    wx.showModal({
      title: '麦克风权限',
      content: '测试语音识别需要麦克风权限，请在设置中开启',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.record']) {
                this.addTestResult('success', '权限设置成功，请重新开始测试');
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
   * 测试云函数连接
   */
  async testCloudFunction() {
    try {
      this.addTestResult('info', '测试realtime-asr云函数...');
      
      const result = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'realtime-asr',
          data: {
            action: 'start',
            config: {
              appid: LLM_CONFIG.asr.appid,
              secretid: LLM_CONFIG.asr.secretid,
              secretkey: LLM_CONFIG.asr.secretkey,
              engine_model_type: '16k_zh'
            }
          },
          success: (res) => {
            console.log('云函数调用成功:', res);
            resolve(res.result);
          },
          fail: (err) => {
            console.error('云函数调用失败:', err);
            reject(new Error(`云函数调用失败: ${err.errMsg}`));
          }
        });
      });
      
      if (result.success) {
        this.addTestResult('success', '云函数测试成功');
        this.addTestResult('info', `Voice ID: ${result.voice_id}`);
      } else {
        this.addTestResult('error', `云函数返回错误: ${result.message}`);
      }
      
    } catch (error) {
      console.error('云函数测试失败:', error);
      this.addTestResult('error', `云函数测试失败: ${error.message}`);
    }
  },

  /**
   * 添加测试结果
   */
  addTestResult(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const newResult = {
      id: Date.now(),
      type: type,
      message: message,
      timestamp: timestamp
    };
    
    this.setData({
      testResults: [...this.data.testResults, newResult]
    });
  },

  /**
   * 清除测试结果
   */
  clearResults() {
    this.setData({
      testResults: [],
      recognitionResult: '',
      realtimeText: ''
    });
  },

  /**
   * 页面卸载时清理资源
   */
  onUnload() {
    if (this.realtimeASR) {
      this.realtimeASR.stop();
    }
  }
});
