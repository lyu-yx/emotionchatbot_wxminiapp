/**
 * LLM配置文件
 * 用于配置大语言模型API相关参数
 * 
 * 最新更新：
 * - ASR: 更新为腾讯云实时语音识别API
 * - TTS: 更新为腾讯云语音合成API
 * - AppId: 修复为正确的腾讯云语音服务AppId (1365883949)
 */

const LLM_CONFIG = {
  // API配置
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",  // 通义千问兼容API
  
  // API密钥 - DashScope统一密钥，用于LLM
  apiKey: "",

  // 腾讯云配置
  tencent: {
    appid: "1365883949",                // 腾讯云语音服务AppId（已修复）
    secretid: "",  // 腾讯云SecretId
    secretkey: "", // 腾讯云SecretKey
    token: "",                          // 临时密钥Token，可选
  },

  // 模型配置
  model: "qwen-turbo",           // 推荐使用qwen-turbo，速度快成本低
  temperature: 0.3,              // 控制回答的随机性，0.3比较稳定
  maxTokens: 1000,              // 最大回答长度  // ASR配置（语音识别）- 腾讯云实时语音识别
  asr: {
    appid: "1365883949",                 // 腾讯云语音服务AppId（已修复）
    secretid: "",   // 腾讯云SecretId
    secretkey: "", // 腾讯云SecretKey
    token: "",                           // 临时密钥Token，可选
    engine_model_type: "16k_zh",         // 引擎模型类型：16k_zh中文、8k_zh中文、16k_en英文
    voice_format: 1,                     // 音频格式：1-pcm（实时识别推荐），8-mp3
    hotword_id: "",                      // 热词id，可选
    customization_id: "",                // 自学习模型id，可选
    filter_dirty: 0,                     // 是否过滤脏话：0-不过滤，1-过滤，2-严格过滤
    filter_modal: 1,                     // 是否过滤语气词：0-不过滤，1-过滤
    filter_punc: 0,                      // 是否过滤句末的句号：0-不过滤，1-过滤
    convert_num_mode: 1,                 // 是否进行阿拉伯数字智能转换：0-不转换，1-转换
    word_info: 0,                        // 是否显示词级别时间戳：0-不显示，1-显示
    needvad: 1,                          // 是否需要vad断句：0-不需要，1-需要
    vad_silence_time: 1000,              // 语音断句检测阈值，静音时长超过该阈值会被认为断句（毫秒）
  },

  // TTS配置（语音合成）- 腾讯云语音合成
  tts: {
    appid: "1365883949",                 // 腾讯云语音服务AppId（已修复）
    secretid: "",   // 腾讯云SecretId  
    secretkey: "", // 腾讯云SecretKey
    token: "",                           // 临时密钥Token，可选
    voicetype: 1002,                     // 音色：1002-女声温和，1001-女声甜美，1003-男声磁性
    language: 1,                         // 主语言类型：1-中文（默认），2-英文
    primarylanguage: 1,                  // 主要语言：1-中文，2-英文
    samplerate: 16000,                   // 音频采样率：16000（默认），8000
    codec: "mp3",                        // 返回音频格式：mp3（默认），wav，pcm
    volume: 0,                           // 音量大小：[-10, 10] 范围内的整数，0为默认值
    speed: 0,                            // 语速：[-2, 2] 范围内的浮点数，0为默认值
    projectid: 0,                        // 项目id，可以根据控制台-账号中心-项目管理中的配置填写
    modeltype: 1,                        // 模型类型：1-默认模型
    emotion: "neutral",                  // 情感：neutral（中性），happy（高兴），sad（悲伤），angry（愤怒），fear（恐惧），news（新闻），customer_service（客服）
    timestamp: 1                         // 时间戳：1-返回时间戳信息，0-不返回（默认）
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
  enableRealtimeASR: true,      // 是否启用实时语音识别（优先级高于传统ASR）
  
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

请严格按照以下格式生成总结，每个部分都不能省略：

## 基本信息
[患者基本信息，包括性别、年龄、既往病史等]

## 主要症状
[详细描述患者的主要症状表现]

## 中医证候分析  
[根据中医理论进行证候分析和初步判断]

## 健康建议
[具体的生活调理建议和注意事项]

请使用专业但通俗易懂的语言，语气温和亲切。不要添加任何关于AI智能分析可信度的内容。`
};

module.exports = LLM_CONFIG;
