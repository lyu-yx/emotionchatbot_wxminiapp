/**
 * 腾讯云TTS语音合成云函数
 * 使用官方SDK处理语音合成请求
 */

const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { text, config } = event;
  
  try {
    console.log('TTS云函数开始处理请求');
    console.log('Text:', text);
    console.log('Config AppId:', config.appid);
    
    // 使用官方腾讯云TTS SDK
    const TtsClient = tencentcloud.tts.v20190823.Client;
    
    // 初始化客户端，SDK会自动处理TC3签名
    const client = new TtsClient({
      credential: {
        secretId: config.secretid,
        secretKey: config.secretkey,
      },
      region: "ap-beijing",
      profile: {
        httpProfile: {
          endpoint: "tts.tencentcloudapi.com",
        },
      },
    });
      // 构建请求参数 - 符合腾讯云TTS API官方标准
      const params = {
        Text: text,
        SessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        VoiceType: 101021,               // 更自然女声
        SampleRate: 16000,
        Codec: 'mp3',
        Volume: 5,                       // 适当提高音量
        Speed: 1.5,                      // 提高语速
        ProjectId: 0,
        ModelType: 2,                    // 使用增强模型
        EmotionCategory: 'neutral'        // 添加情感
      };
    
    console.log('调用腾讯云TTS API，参数:', params);
    
    // 调用腾讯云TTS API
    const response = await client.TextToVoice(params);
    
    console.log('腾讯云TTS API调用成功');
    
    if (response.Error) {
      throw new Error(`TTS API错误: ${response.Error.Message}`);
    }
    
    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('TTS云函数执行失败:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};
