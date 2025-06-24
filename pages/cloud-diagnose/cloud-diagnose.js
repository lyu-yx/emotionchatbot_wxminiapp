/**
 * 云开发诊断页面
 * 用于诊断和修复云开发初始化问题
 */

Page({
  data: {
    // 基本信息
    appId: '',
    cloudEnvId: 'cloud1-1g8mdub01affed7e',
    sdkVersion: '',
    envType: '',

    // 诊断结果
    diagnoseResults: [],

    // 测试结果
    testResults: [],

    // 修复指南
    showGuide: false,
    fixGuide: [
      {
        issue: '没有权限，请先开通云开发或者云托管',
        solutions: [
          '1. 确认小程序AppId与云开发环境匹配',
          '2. 检查云开发环境是否正确开通',
          '3. 验证project.config.json中的appid配置',
          '4. 确保使用正确的云开发环境ID',
          '5. 检查小程序是否已发布或在开发者工具中正确配置'
        ]
      },
      {
        issue: '云函数调用失败',
        solutions: [
          '1. 检查云函数是否已正确部署',
          '2. 验证云函数名称拼写是否正确',
          '3. 检查云函数运行时环境配置',
          '4. 确认云函数权限设置',
          '5. 查看云函数日志排查具体错误'
        ]
      },
      {
        issue: '云开发初始化超时',
        solutions: [
          '1. 检查网络连接状态',
          '2. 增加初始化超时时间',
          '3. 使用延迟初始化策略',
          '4. 实现初始化重试机制',
          '5. 考虑使用多环境初始化'
        ]
      }
    ]
  },

  onLoad() {
    console.log('云开发诊断页面加载');
    this.initPageData();
    this.runDiagnose();
  },

  // 初始化页面数据
  initPageData() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      
      // 获取账户信息
      const accountInfo = wx.getAccountInfoSync();
      
      this.setData({
        sdkVersion: systemInfo.SDKVersion,
        appId: accountInfo.miniProgram.appId,
        envType: accountInfo.miniProgram.envType
      });

      console.log('页面数据初始化完成:', {
        sdkVersion: systemInfo.SDKVersion,
        appId: accountInfo.miniProgram.appId,
        envType: accountInfo.miniProgram.envType
      });
    } catch (error) {
      console.error('页面数据初始化失败:', error);
    }
  },

  // 运行诊断
  runDiagnose() {
    console.log('开始运行云开发诊断...');
    
    const results = [];

    // 检查基础库版本
    try {
      const systemInfo = wx.getSystemInfoSync();
      const version = systemInfo.SDKVersion;
      const isVersionOk = this.compareVersion(version, '2.2.3') >= 0;
      
      results.push({
        name: '基础库版本检查',
        status: isVersionOk,
        fix: isVersionOk ? '' : '请使用基础库版本 2.2.3 或以上'
      });
    } catch (error) {
      results.push({
        name: '基础库版本检查',
        status: false,
        fix: '无法获取基础库版本信息'
      });
    }

    // 检查云开发能力
    const hasCloudCapability = typeof wx.cloud !== 'undefined';
    results.push({
      name: '云开发能力检查',
      status: hasCloudCapability,
      fix: hasCloudCapability ? '' : '请确保使用支持云开发的基础库'
    });

    // 检查AppId配置
    try {
      const accountInfo = wx.getAccountInfoSync();
      const currentAppId = accountInfo.miniProgram.appId;
      const expectedAppId = 'wxfab8b135f1b0013b';
      const isAppIdOk = currentAppId === expectedAppId;
      
      results.push({
        name: 'AppId配置检查',
        status: isAppIdOk,
        fix: isAppIdOk ? '' : `当前AppId: ${currentAppId}, 期望: ${expectedAppId}`
      });
    } catch (error) {
      results.push({
        name: 'AppId配置检查',
        status: false,
        fix: '无法获取AppId信息'
      });
    }

    // 检查云开发初始化状态
    if (hasCloudCapability) {
      try {
        // 尝试获取云开发数据库实例
        const db = wx.cloud.database();
        results.push({
          name: '云开发初始化检查',
          status: true,
          fix: ''
        });
      } catch (error) {
        results.push({
          name: '云开发初始化检查',
          status: false,
          fix: '云开发可能未正确初始化'
        });
      }
    }

    this.setData({
      diagnoseResults: results
    });

    console.log('诊断完成，结果:', results);
  },

  // 测试云函数
  async testCloudFunction() {
    console.log('开始测试云函数...');
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'tencent-tts-proxy',
        data: { 
          action: 'test',
          text: 'hello' 
        }
      });
      
      this.addTestResult('云函数测试', true, '云函数调用成功');
      console.log('云函数测试成功:', result);
    } catch (error) {
      this.addTestResult('云函数测试', false, error.errMsg || error.message);
      console.error('云函数测试失败:', error);
    }
  },

  // 测试数据库
  async testDatabase() {
    console.log('开始测试数据库...');
    
    try {
      const db = wx.cloud.database();
      const result = await db.collection('test').limit(1).get();
      
      this.addTestResult('数据库测试', true, '数据库连接成功');
      console.log('数据库测试成功:', result);
    } catch (error) {
      this.addTestResult('数据库测试', false, error.errMsg || error.message);
      console.error('数据库测试失败:', error);
    }
  },

  // 测试TTS代理
  async testTTSProxy() {
    console.log('开始测试TTS代理...');
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'tencent-tts-proxy',
        data: {
          text: '这是一个测试',
          voiceType: 101001,
          codec: 'mp3'
        }
      });
      
      if (result.result && result.result.success) {
        this.addTestResult('TTS代理测试', true, 'TTS代理调用成功');
      } else {
        this.addTestResult('TTS代理测试', false, result.result?.error || '未知错误');
      }
      
      console.log('TTS代理测试结果:', result);
    } catch (error) {
      this.addTestResult('TTS代理测试', false, error.errMsg || error.message);
      console.error('TTS代理测试失败:', error);
    }
  },

  // 添加测试结果
  addTestResult(name, success, message) {
    const testResults = this.data.testResults;
    testResults.push({
      name,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    });
    
    this.setData({
      testResults
    });
  },

  // 重新初始化云开发
  reinitCloud() {
    console.log('重新初始化云开发...');
    
    try {
      wx.cloud.init({
        env: this.data.cloudEnvId,
        traceUser: true,
        timeout: 15000
      });
      
      wx.showToast({
        title: '重新初始化成功',
        icon: 'success'
      });
      
      // 重新运行诊断
      setTimeout(() => {
        this.runDiagnose();
      }, 1000);
      
    } catch (error) {
      console.error('重新初始化失败:', error);
      wx.showToast({
        title: '重新初始化失败',
        icon: 'none'
      });
    }
  },

  // 显示修复指南
  showFixGuide() {
    this.setData({
      showGuide: true
    });
  },

  // 隐藏修复指南
  hideFixGuide() {
    this.setData({
      showGuide: false
    });
  },

  // 比较版本号
  compareVersion(v1, v2) {
    const arr1 = v1.split('.');
    const arr2 = v2.split('.');
    const length = Math.max(arr1.length, arr2.length);
    
    for (let i = 0; i < length; i++) {
      const num1 = parseInt(arr1[i] || '0');
      const num2 = parseInt(arr2[i] || '0');
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  }
});
