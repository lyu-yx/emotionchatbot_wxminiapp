/**
 * 腾讯云ASR语音识别云函数
 * 使用官方SDK处理语音识别请求
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
  // 兼容两种参数传递方式
  const audioData = event.audioData || event.audioBuffer; // 云函数方式 or 小程序直接调用方式
  const config = event.config || {
    // 如果没有传config，使用默认配置
    engine_model_type: "16k_zh",
    voice_format: event.format || "mp3",
    filter_dirty: 0,
    filter_modal: 0,
    filter_punc: 0,
    convert_num_mode: 1,
    word_info: 0
  };
  
  try {
    console.log('ASR云函数开始处理请求');
    console.log('Audio data length:', audioData ? audioData.length : 0);
    console.log('Voice format:', config.voice_format);
    
    if (!audioData) {
      throw new Error('缺少音频数据');
    }
    
    // 使用官方腾讯云ASR SDK
    const AsrClient = tencentcloud.asr.v20190614.Client;
    
    // 初始化客户端，SDK会自动处理TC3签名
    const client = new AsrClient({
      credential: {
        secretId: config.secretid || process.env.TENCENT_SECRET_ID,
        secretKey: config.secretkey || process.env.TENCENT_SECRET_KEY,
      },
      region: "ap-beijing",
      profile: {
        httpProfile: {
          endpoint: "asr.tencentcloudapi.com",
        },
      },    });
    
    // 构建请求参数 - 符合腾讯云一句话识别API官方标准
    // 音频格式转换：数字格式转字符串格式
    const formatMapping = {
      1: 'pcm',
      4: 'speex', 
      6: 'silk',
      8: 'mp3',
      10: 'opus',
      12: 'wav',
      14: 'm4a',
      16: 'aac'
    };
    
    const voiceFormat = typeof config.voice_format === 'number' 
      ? formatMapping[config.voice_format] || 'mp3'
      : config.voice_format || 'mp3';
    
    const params = {
      Data: audioData, // base64编码的音频数据
      EngSerViceType: config.engine_model_type || "16k_zh", // 正确参数名
      SourceType: 1, // 语音数据来源：0：语音 URL；1：语音数据（post body）
      VoiceFormat: voiceFormat, // 音频格式：确保为字符串类型
      DataLen: audioData ? Buffer.from(audioData, 'base64').length : 0, // 数据长度（未base64编码前）
      WordInfo: config.word_info || 0,           // 是否显示词级别时间戳
      FilterDirty: config.filter_dirty || 0,     // 是否过滤脏词
      FilterModal: config.filter_modal || 0,     // 是否过滤语气词  
      FilterPunc: config.filter_punc || 0,       // 是否过滤标点符号
      ConvertNumMode: config.convert_num_mode || 1, // 阿拉伯数字智能转换
      HotwordId: config.hotword_id || "",        // 热词表id
      CustomizationId: config.customization_id || "", // 自学习模型id
      HotwordList: config.hotword_list || "",    // 临时热词表
      InputSampleRate: config.input_sample_rate || 0 // PCM音频升采样
      // 注意：移除了WebSocket实时识别特有的参数，使用一句话识别API标准参数
    };
    
    console.log('调用腾讯云ASR API');
    
    // 调用腾讯云ASR API
    const response = await client.SentenceRecognition(params);
      console.log('腾讯云ASR API调用成功');
    
    if (response.Error) {
      throw new Error(`ASR API错误: ${response.Error.Message}`);
    }
    
    // 兼容小程序期望的返回格式
    return {
      success: true,
      text: response.Result || '',  // 识别结果文本
      data: response,
      timestamp: new Date().toISOString(),
      message: '语音识别成功'
    };
    
  } catch (error) {
    console.error('ASR云函数执行失败:', error);
    return {
      success: false,
      text: '',
      error: error.message,
      message: error.message || '语音识别失败',
      stack: error.stack
    };
  }
};
