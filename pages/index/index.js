Page({
  data: {
    inputModes: ["语音输入", "文字输入"],
    inputMode: "语音输入"
  },
  
  onLoad() {
    // 从缓存中读取上次选择的输入模式
    const savedMode = wx.getStorageSync('inputMode');
    if (savedMode && this.data.inputModes.includes(savedMode)) {
      this.setData({ inputMode: savedMode });
    }
  },
  
  onModeChange(e) {
    const selectedMode = this.data.inputModes[e.detail.value];
    this.setData({ inputMode: selectedMode });
    wx.setStorageSync('inputMode', selectedMode);
    
    console.log('输入模式已切换为:', selectedMode);
  },
  
  startConsult() {
    console.log('开始问诊，当前输入模式:', this.data.inputMode);
    
    // 确保输入模式已保存到缓存
    wx.setStorageSync('inputMode', this.data.inputMode);
    
    wx.navigateTo({ 
      url: '/pages/consult/consult',
      success: function() {
        console.log('页面跳转成功');
      },
      fail: function(err) {
        console.error('页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  goToTest() {
    console.log('进入API测试页面');
    
    wx.navigateTo({ 
      url: '/pages/test/test',
      success: function() {
        console.log('测试页面跳转成功');
      },
      fail: function(err) {
        console.error('测试页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  goToDiagnose() {
    console.log('进入云开发诊断页面');
    
    wx.navigateTo({ 
      url: '/pages/cloud-diagnose/cloud-diagnose',
      success: function() {
        console.log('云开发诊断页面跳转成功');
      },
      fail: function(err) {
        console.error('云开发诊断页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  goToDiagnose() {
    console.log('进入云开发诊断页面');
    
    wx.navigateTo({ 
      url: '/pages/cloud-diagnose/cloud-diagnose',
      success: function() {
        console.log('云开发诊断页面跳转成功');
      },
      fail: function(err) {
        console.error('云开发诊断页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  }
})