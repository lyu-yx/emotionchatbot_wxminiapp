// App entry point
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // 你的云开发环境ID，需要替换为实际的环境ID
        env: 'your-cloud-env-id',
        traceUser: true,
      });
      
      console.log('云开发初始化成功');
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }
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