/**
 * LLM配置文件
 * 用于配置大语言模型API相关参数
 */

const LLM_CONFIG = {
  // API配置
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",  // 通义千问兼容API
  
  // API密钥 - DashScope统一密钥，用于LLM、ASR、TTS
  apiKey: "sk-cca081700e614b30a601d3599f94e5f4",
  
  // 模型配置
  model: "qwen-turbo",           // 推荐使用qwen-turbo，速度快成本低
  temperature: 0.3,              // 控制回答的随机性，0.3比较稳定
  maxTokens: 1000,              // 最大回答长度
  
  // ASR配置（语音识别）
  asr: {
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/asr/transcription",
    model: "paraformer-realtime-v2",  // 实时语音识别模型
    format: "mp3",                    // 音频格式
    sampleRate: 16000,               // 采样率
    enablePunctuation: true,         // 启用标点符号
    enableITN: true                  // 启用逆文本标准化
  },
  
  // TTS配置（语音合成）
  tts: {
    baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2speech/speech-synthesis",
    model: "cosyvoice-v1",           // 推荐模型，音质自然
    voice: "longyuan",               // 女声，适合医疗场景
    format: "mp3",                   // 音频格式
    sampleRate: 22050,              // 采样率
    volume: 50,                     // 音量 (0-100)
    speechRate: 0.85,               // 语速 (0.5-2.0)，稍慢一点便于理解
    pitchRate: 1.0                  // 音调 (0.5-2.0)
  },
  
  // 备用配置 - 如果主API不可用，可以切换到其他兼容的API
  fallback: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "your-openai-api-key-here",
    model: "gpt-3.5-turbo"
  },
    // 功能开关
  enableRelevanceCheck: true,    // 是否启用LLM相关性检查
  enableDataExtraction: true,    // 是否启用LLM数据提取
  enableSummaryGeneration: true, // 是否启用LLM总结生成
  enableASR: true,              // 是否启用语音识别
  enableTTS: true,              // 是否启用语音合成
  
  // 性能配置
  requestTimeout: 10000,         // API请求超时时间（毫秒）
  retryTimes: 2,                // 失败重试次数
  
  // 提示词模板
  systemPrompt: "你是一个专业的医疗问诊助手，请协助进行结构化的医疗信息收集和分析。请使用专业但通俗易懂的语言，保持温和亲切的语气。",
  
  // 相关性检查提示词
  relevancePrompt: (question, answer) => `作为医疗问诊助手，请判断用户的回答是否与问题相关。

问题：${question}
用户回答：${answer}

请回答：
1. 回答是否与问题相关？(是/否)
2. 简要说明原因

格式：相关性：是/否，原因：[原因]`,

  // 数据提取提示词
  extractionPrompt: (answer, fields) => `请从用户回答中提取以下医疗信息：

用户回答：${answer}

需要提取的字段：
${fields}

请以JSON格式返回，只包含能确定的字段。对于布尔字段，请返回true或false：
{
  "field1": "value1",
  "field2": true,
  "field3": "value3"
}`,

  // 总结生成提示词
  summaryPrompt: (patientInfo) => `请根据以下问诊信息，生成一份专业的中医问诊总结：

${patientInfo}

请按以下格式生成总结：

## 基本信息
[患者基本信息]

## 主要症状
[主要症状描述]

## 中医证候分析
[中医证候初步判断]

## 健康建议
[生活调理建议]

## 注意事项
[需要注意的事项]

请使用专业但通俗易懂的语言，语气温和亲切。`
};

module.exports = LLM_CONFIG;
