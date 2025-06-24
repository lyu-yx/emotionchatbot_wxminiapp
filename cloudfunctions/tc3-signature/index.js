/**
 * 腾讯云TC3签名生成云函数
 * 专门用于生成标准的TC3-HMAC-SHA256签名
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 生成TC3签名
 */
function generateTC3Signature(config, method, uri, queryString, payload, host, action, version, region, timestamp) {
  const date = getDate(timestamp);
  const service = host.split('.')[0];
  
  // 步骤 1：拼接规范请求串
  const httpRequestMethod = method;
  const canonicalUri = uri;
  const canonicalQueryString = queryString;
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n');
  
  // 步骤 2：拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');
  
  const stringToSign = [
    algorithm,
    timestamp.toString(),
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');
  
  // 步骤 3：计算签名
  const secretDate = crypto.createHmac('sha256', 'TC3' + config.secretkey).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');
  
  // 步骤 4：拼接 Authorization
  const authorization = `${algorithm} Credential=${config.secretid}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    authorization,
    timestamp,
    canonicalRequest,
    stringToSign,
    signature,
    hashedRequestPayload,
    hashedCanonicalRequest
  };
}

/**
 * 获取UTC日期字符串
 */
function getDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const day = ('0' + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { config, method, uri, queryString, payload, host, action, version, region, timestamp } = event;
  
  try {
    console.log('TC3签名云函数开始处理请求');
    console.log('Config AppId:', config.appid);
    console.log('Action:', action);
    console.log('Host:', host);
    console.log('Timestamp:', timestamp);
    
    // 生成TC3签名
    const signatureResult = generateTC3Signature(
      config,
      method || 'POST',
      uri || '/',
      queryString || '',
      payload,
      host,
      action,
      version,
      region || 'ap-beijing',
      timestamp || Math.floor(Date.now() / 1000)
    );
    
    console.log('TC3签名生成成功');
    console.log('Authorization:', signatureResult.authorization);
    
    return {
      success: true,
      data: signatureResult,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('TC3签名云函数执行失败:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};
