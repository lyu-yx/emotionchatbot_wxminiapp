/**
 * 腾讯云实时语音识别云函数
 * 基于WebSocket实现实时语音识别
 * 使用HMAC-SHA1签名算法（按照官方文档要求）
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 生成实时语音识别的HMAC-SHA1签名
 * 严格按照腾讯云实时语音识别官方文档要求实现
 * 参考文档：https://cloud.tencent.com/document/product/1093/48982
 */
function generateRealtimeASRSignature(config, timestamp) {
  const expired = timestamp + 24 * 60 * 60; // 24小时后过期
  const nonce = Math.floor(Math.random() * 1000000000);
  const voiceId = generateUUID();
  
  // 构建查询参数（不包含signature），按照官方文档顺序
  const queryParams = {
    secretid: config.secretid,
    timestamp: timestamp,
    expired: expired,
    nonce: nonce,
    voice_id: voiceId,
    engine_model_type: config.engine_model_type || '16k_zh',
    voice_format: config.voice_format || 1, // 1=pcm格式（实时识别推荐）
    needvad: config.needvad || 1,
    filter_dirty: config.filter_dirty || 0,
    filter_modal: config.filter_modal || 0,
    filter_punc: config.filter_punc || 0,
    convert_num_mode: config.convert_num_mode || 1,
    word_info: config.word_info || 0,
    vad_silence_time: config.vad_silence_time || 1000
  };
  
  // 1. 对除signature之外的所有参数按字典序进行排序
  const sortedKeys = Object.keys(queryParams).sort();
  const sortedParams = sortedKeys
    .map(key => `${key}=${queryParams[key]}`) // 注意：这里不进行URL编码，用于签名计算
    .join('&');
  
  // 2. 拼接请求URL（不包含协议部分：wss://）作为签名原文
  // 格式：asr.cloud.tencent.com/asr/v2/{appid}?{排序后的参数}
  const host = 'asr.cloud.tencent.com';
  const path = `/asr/v2/${config.appid}`;
  const signStr = `${host}${path}?${sortedParams}`;
  
  console.log('排序后的参数:', sortedParams);
  console.log('签名原文:', signStr);
  console.log('SecretKey长度:', config.secretkey ? config.secretkey.length : 0);
  
  // 3. 对签名原文使用SecretKey进行HMAC-SHA1加密，之后再进行base64编码
  const signature = crypto
    .createHmac('sha1', config.secretkey)
    .update(signStr, 'utf8')
    .digest('base64');
  
  console.log('生成的HMAC-SHA1签名:', signature);
  
  return {
    signature,
    queryParams,
    signStr,
    sortedParams
  };
}

/**
 * 生成UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { audioChunks, config, action } = event;
  
  try {
    console.log('实时ASR云函数开始处理请求');
    console.log('Action:', action);
    console.log('Config AppId:', config?.appid);
    console.log('Config SecretId:', config?.secretid ? config.secretid.substring(0, 8) + '...' : 'undefined');
    
    if (action === 'start') {
      // 开始实时识别会话
      return await startRealtimeASR(config);
    } else if (action === 'process') {
      // 处理音频数据块
      return await processAudioChunks(audioChunks, config);
    } else if (action === 'end') {
      // 结束识别会话
      return await endRealtimeASR(config);
    } else {
      throw new Error('无效的action参数');
    }
    
  } catch (error) {
    console.error('实时ASR云函数执行失败:', error);
    return {
      success: false,
      error: error.message,
      message: error.message || '实时语音识别失败'
    };
  }
};

/**
 * 开始实时语音识别会话
 */
async function startRealtimeASR(config) {
  return new Promise((resolve, reject) => {
    try {
      // 验证必要参数
      if (!config.appid || !config.secretid || !config.secretkey) {
        throw new Error('缺少必要的配置参数: appid, secretid, secretkey');
      }
      
      // 准备连接参数
      const timestamp = Math.floor(Date.now() / 1000);
      
      console.log('开始生成实时ASR签名（HMAC-SHA1）');
      console.log('AppId:', config.appid);
      console.log('SecretId:', config.secretid);
      console.log('Timestamp:', timestamp);
      
      // 生成实时ASR签名
      const signatureResult = generateRealtimeASRSignature(config, timestamp);
      
      // 添加签名到查询参数
      const finalParams = {
        ...signatureResult.queryParams,
        signature: signatureResult.signature
      };
      
      // 4. 将signature值进行urlencode后拼接得到最终请求URL
      const paramString = Object.keys(finalParams)
        .sort() // 确保参数顺序一致
        .map(key => {
          if (key === 'signature') {
            // 对签名进行URL编码
            return `${key}=${encodeURIComponent(finalParams[key])}`;
          } else {
            // 其他参数直接使用
            return `${key}=${finalParams[key]}`;
          }
        })
        .join('&');
      
      const wsUrl = `wss://asr.cloud.tencent.com/asr/v2/${config.appid}?${paramString}`;
      
      console.log('WebSocket连接URL生成成功');
      console.log('URL长度:', wsUrl.length);
      console.log('URL前200字符:', wsUrl.substring(0, 200));
      console.log('签名参数:', signatureResult.signature);
      console.log('URL编码后的签名:', encodeURIComponent(signatureResult.signature));
      
      resolve({
        success: true,
        voice_id: finalParams.voice_id,
        ws_url: wsUrl,
        params: finalParams,
        signature_method: 'HMAC-SHA1',
        timestamp: timestamp,
        signature_info: {
          original_string: signatureResult.signStr,
          signature: signatureResult.signature,
          sorted_params: signatureResult.sortedParams,
          url_encoded_signature: encodeURIComponent(signatureResult.signature)
        },
        message: '实时语音识别会话已准备就绪（使用HMAC-SHA1签名）'
      });
      
    } catch (error) {
      console.error('准备实时ASR会话失败:', error);
      reject(error);
    }
  });
}

/**
 * 处理音频数据块（在小程序端实现WebSocket连接）
 * 云函数只负责准备连接参数
 */
async function processAudioChunks(audioChunks, config) {
  // 由于云函数的限制，实际的WebSocket连接需要在小程序端实现
  // 这里只返回成功状态
  return {
    success: true,
    message: '音频数据块处理完成（实际处理在小程序端）'
  };
}

/**
 * 结束实时语音识别会话
 */
async function endRealtimeASR(config) {
  return {
    success: true,
    message: '实时语音识别会话已结束'
  };
}
