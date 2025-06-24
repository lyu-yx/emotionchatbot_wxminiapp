/**
 * 语音输入组件
 * 功能：录音 -> 调用云函数ASR识别 -> 返回文本结果
 */
Component({
  properties: {
    // 是否显示组件
    show: {
      type: Boolean,
      value: false
    },
    // 录音最大时长（秒）
    maxDuration: {
      type: Number,
      value: 60
    }
  },
    data: {
    isRecording: false,      // 是否正在录音
    recordTime: 0,           // 录音时长
    recordTimer: null,       // 录音计时器
    audioPath: '',           // 录音文件路径
    isProcessing: false      // 是否正在处理语音识别
  },

  observers: {
    'recordTime, maxDuration': function(recordTime, maxDuration) {
      // 当录音时间或最大时长变化时，更新格式化时间
      this.setData({
        formattedRecordTime: this.formatTime(recordTime),
        formattedMaxDuration: this.formatTime(maxDuration)
      });
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化
      this.recorderManager = wx.getRecorderManager();
      this.initRecorderEvents();
    },
    
    detached() {
      // 组件销毁时清理资源
      if (this.data.recordTimer) {
        clearInterval(this.data.recordTimer);
      }
      if (this.recorderManager) {
        this.recorderManager.stop();
      }
    }
  },

  methods: {
    /**
     * 初始化录音管理器事件
     */
    initRecorderEvents() {
      const that = this;
      
      // 录音开始事件
      this.recorderManager.onStart(() => {
        console.log('录音开始');
        that.setData({ 
          isRecording: true,
          recordTime: 0 
        });
        that.startTimer();
      });

      // 录音结束事件
      this.recorderManager.onStop((res) => {
        console.log('录音结束', res);
        that.setData({ 
          isRecording: false,
          audioPath: res.tempFilePath 
        });
        that.stopTimer();
        
        // 自动开始语音识别
        if (res.tempFilePath) {
          that.processVoiceRecognition(res.tempFilePath);
        }
      });

      // 录音错误事件
      this.recorderManager.onError((err) => {
        console.error('录音错误:', err);
        that.setData({ 
          isRecording: false,
          isProcessing: false 
        });
        that.stopTimer();
        
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none'
        });
        
        // 触发错误事件
        that.triggerEvent('error', { error: err });
      });
    },    /**
     * 开始录音
     */
    startRecording() {
      // 先检查麦克风权限状态
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record'] === true) {
            // 已授权，直接开始录音
            this.doStartRecording();
          } else if (res.authSetting['scope.record'] === false) {
            // 权限被拒绝，引导用户到设置页面
            this.showPermissionModal();
          } else {
            // 未申请过权限，申请权限
            this.requestRecordPermission();
          }
        },
        fail: () => {
          // 获取设置失败，尝试直接申请权限
          this.requestRecordPermission();
        }
      });
    },

    /**
     * 申请录音权限
     */
    requestRecordPermission() {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          console.log('录音权限申请成功');
          this.doStartRecording();
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
     * 执行开始录音
     */
    doStartRecording() {
      this.recorderManager.start({
        duration: this.properties.maxDuration * 1000, // 转换为毫秒
        sampleRate: 16000,    // 采样率
        numberOfChannels: 1,  // 录音通道数
        encodeBitRate: 96000, // 编码码率
        format: 'mp3'         // 音频格式
      });
    },

    /**
     * 停止录音
     */
    stopRecording() {
      if (this.data.isRecording) {
        this.recorderManager.stop();
      }
    },

    /**
     * 开始计时器
     */
    startTimer() {
      const timer = setInterval(() => {
        const newTime = this.data.recordTime + 1;
        this.setData({ recordTime: newTime });
        
        // 达到最大时长自动停止
        if (newTime >= this.properties.maxDuration) {
          this.stopRecording();
        }
      }, 1000);
      
      this.setData({ recordTimer: timer });
    },

    /**
     * 停止计时器
     */
    stopTimer() {
      if (this.data.recordTimer) {
        clearInterval(this.data.recordTimer);
        this.setData({ recordTimer: null });
      }
    },

    /**
     * 处理语音识别
     * @param {string} audioPath - 音频文件路径
     */
    async processVoiceRecognition(audioPath) {
      this.setData({ isProcessing: true });
      
      try {
        // 显示加载提示
        wx.showLoading({
          title: '语音识别中...',
          mask: true
        });

        // 调用云函数进行语音识别
        const result = await this.callASRCloudFunction(audioPath);
        
        wx.hideLoading();
        
        if (result.success) {
          // 识别成功，触发成功事件
          this.triggerEvent('success', {
            text: result.text,
            audioPath: audioPath,
            duration: this.data.recordTime
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
        
        // 触发错误事件
        this.triggerEvent('error', { error: error });
      } finally {
        this.setData({ isProcessing: false });
      }
    },

    /**
     * 调用ASR云函数
     * @param {string} audioPath - 音频文件路径
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
     * 取消录音
     */
    cancelRecording() {
      if (this.data.isRecording) {
        this.recorderManager.stop();
      }
      this.setData({
        isRecording: false,
        recordTime: 0,
        audioPath: '',
        isProcessing: false
      });
      this.stopTimer();
      
      // 触发取消事件
      this.triggerEvent('cancel');
    },

    /**
     * 格式化时间显示
     */
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * 关闭组件
     */
    closeComponent() {
      this.cancelRecording();
      this.triggerEvent('close');
    }
  }
});
