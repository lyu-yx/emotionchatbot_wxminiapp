// ASR云函数示例  
// 文件路径: cloudfunctions/asr/index.js

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { audioBuffer, format = 'mp3', sampleRate = 16000 } = event
  
  try {
    // 这里应该调用实际的ASR服务
    // 例如：百度语音、腾讯云、阿里云等
    
    console.log('ASR请求:', { format, sampleRate, audioSize: audioBuffer?.length })
    
    // 模拟ASR处理
    // 实际应用中应该将audioBuffer发送给ASR服务进行识别
    
    // 模拟识别结果
    const mockResults = [
      '头痛',
      '肚子痛', 
      '发烧了',
      '三天了',
      '没有发热',
      '有一点咳嗽',
      '男，25岁',
      '是的',
      '没有'
    ]
    
    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)]
    
    return {
      success: true,
      text: randomResult,
      confidence: 0.95,
      message: '语音识别成功'
    }
    
  } catch (error) {
    console.error('ASR处理失败:', error)
    return {
      success: false,
      text: '',
      message: error.message || '语音识别失败'
    }
  }
}
