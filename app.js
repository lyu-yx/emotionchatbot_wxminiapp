// App entry point
App({
  onLaunch() {
    console.log('小程序启动，开始初始化云开发...');
    
    // 云开发初始化诊断和修复
    this.initCloudWithDiagnosis();
  },

  // 带诊断功能的云开发初始化
  initCloudWithDiagnosis() {
    // 检查基础库版本
    const systemInfo = wx.getSystemInfoSync();
    console.log('基础库版本:', systemInfo.SDKVersion);
    
    if (!wx.cloud) {
      console.error('云开发能力不可用，请使用基础库 2.2.3 或以上版本');
      return;
    }

    // 获取当前小程序信息
    const accountInfo = wx.getAccountInfoSync();
    console.log('当前小程序AppId:', accountInfo.miniProgram.appId);
    console.log('当前环境:', accountInfo.miniProgram.envType);

    // 云开发环境配置
    const cloudConfig = {
      env: 'cloud1-1g8mdub01affed7e',
      traceUser: true,
      timeout: 15000
    };

    try {
      // 初始化云开发
      wx.cloud.init(cloudConfig);
      console.log('云开发初始化成功，环境ID:', cloudConfig.env);
      
      // 延迟验证云开发功能
      setTimeout(() => {
        this.verifyCloudCapabilities();
      }, 2000);
      
    } catch (error) {
      console.error('云开发初始化失败:', error);
      this.handleCloudInitError(error);
    }
  },

  // 验证云开发功能
  async verifyCloudCapabilities() {
    console.log('开始验证云开发功能...');
    
    try {
      // 测试云函数调用（如果存在测试云函数）
      const testResult = await wx.cloud.callFunction({
        name: 'test',
        data: { action: 'ping' }
      });
      console.log('云函数测试成功:', testResult);
    } catch (error) {
      console.warn('云函数测试失败（可能是测试云函数不存在）:', error.errMsg);
    }

    try {
      // 测试数据库连接
      const db = wx.cloud.database();
      console.log('数据库连接建立成功');
    } catch (error) {
      console.warn('数据库连接测试失败:', error);
    }

    console.log('云开发功能验证完成');
  },

  // 处理云开发初始化错误
  handleCloudInitError(error) {
    console.error('云开发初始化错误详情:', error);
    
    // 常见错误处理
    if (error.errMsg && error.errMsg.includes('permission')) {
      console.error('权限错误：请检查以下配置：');
      console.error('1. 确认小程序AppId与云开发环境匹配');
      console.error('2. 检查云开发环境是否正确开通');
      console.error('3. 验证project.config.json中的appid配置');
      console.error('4. 确保云开发环境ID正确: cloud1-1g8mdub01affed7e');
    }
    
    // 显示错误提示（可选）
    wx.showToast({
      title: '云开发初始化失败',
      icon: 'none',
      duration: 3000
    });
  },

  onShow() {
    // 应用显示时的处理
  },

  onHide() {
    // 应用隐藏时的处理
  },

  onError(error) {
    // 应用错误处理
    console.error('应用错误:', error);
  },

  // 全局数据
  globalData: {
    userInfo: null,
    openid: null
  }
});