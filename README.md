# 智能医疗助手微信小程序

基于决策树和大语言模型的智能医疗问诊小程序，实现了结构化医疗信息收集、智能相关性判断、自动症状总结和病因分析。

## 功能特性

### 🎯 决策树式问诊
- 基于中医问诊流程的结构化问题体系
- 智能跳过不相关的问题（如男性不询问月经情况）
- 根据用户回答动态决定追问内容
- 完整覆盖：基础信息、发热寒热、头痛头晕、五官、咽喉咳嗽、食欲饮水、大小便、睡眠情绪、女性月经等9大主题

### 🤖 LLM智能分析
- **相关性判断**：自动识别用户回答是否与问题相关
- **数据提取**：将自然语言回答转换为结构化数据
- **症状总结**：自动生成专业的中医问诊总结
- **病因分析**：基于症状信息提供初步的证候分析

### 🎙️ 智能语音交互
- 语音输入切换后自动录音
- TTS播报问题后自动开始录音
- 静音1.5秒自动停止录音
- 语音识别结果自动发送

### 💬 优雅的对话界面
- ChatGPT式对话气泡
- 患者消息右对齐，医生消息左对齐
- 打字效果动画
- 自动滚动到最新消息

## 配置说明

### LLM API配置

1. 编辑 `config/llm-config.js` 文件
2. 配置您的API密钥：

```javascript
const LLM_CONFIG = {
  // 主要API配置（推荐使用阿里云通义千问）
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: "your-dashscope-api-key-here", // 在此填入您的API密钥
  model: "qwen-turbo",
  
  // 备用API配置（可选）
  fallback: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "your-openai-api-key-here",
    model: "gpt-3.5-turbo"
  },
  
  // 功能开关
  enableRelevanceCheck: true,    // 是否启用相关性检查
  enableDataExtraction: true,    // 是否启用数据提取
  enableSummaryGeneration: true, // 是否启用总结生成
};
```

### 获取API密钥

#### 阿里云通义千问（推荐）
1. 访问 [DashScope控制台](https://dashscope.console.aliyun.com/)
2. 注册账号并实名认证
3. 创建API密钥
4. 将密钥填入 `llm-config.js` 的 `apiKey` 字段

#### OpenAI（备用）
1. 访问 [OpenAI API](https://platform.openai.com/api-keys)
2. 创建API密钥
3. 将密钥填入 `llm-config.js` 的 `fallback.apiKey` 字段

## 项目结构

```
emotionchatbot_wxminiapp/
├── pages/
│   ├── index/           # 首页
│   ├── consult/         # 问诊页面（核心功能）
│   └── summary/         # 总结页面
├── config/
│   └── llm-config.js    # LLM配置文件
├── app.js
├── app.json
├── app.wxss
└── README.md
```

## 问诊流程

### 决策树结构

问诊系统按照以下主题顺序进行：

1. **T1-基础信息**：性别、年龄、慢性病史、药物过敏
2. **T2-发热寒热**：发热情况、怕冷情况、出汗情况
3. **T3-头痛头晕**：头痛部位类型、头晕情况、恶心呕吐
4. **T4-五官**：眼耳鼻症状
5. **T5-咽喉与咳嗽**：咽部不适、咳嗽咳痰、胸闷心悸
6. **T6-食欲饮水**：食欲状况、口腔症状、饮水习惯
7. **T7-大小便与腹痛**：大小便情况、腹痛
8. **T8-睡眠情绪**：睡眠质量、情绪状态、皮肤症状
9. **T9-女性月经**：月经周期、痛经、白带（仅女性）

### 智能决策

- 根据用户性别自动跳过不相关问题
- 基于前面回答的症状决定是否追问
- 使用LLM判断回答相关性，避免无效信息

## 技术特性

### 数据结构

#### 患者数据 (patientData)
结构化存储所有症状信息，包括布尔值、字符串和枚举类型字段。

#### 原始回答 (rawResponses)
按主题分类存储用户的原始回答，用于LLM分析。

#### 消息列表 (messageList)
完整的对话历史记录，支持时间戳和格式化显示。

### LLM集成

#### 相关性判断
```javascript
// 自动判断用户回答是否与问题相关
const isRelevant = await this.checkAnswerRelevance(userAnswer);
```

#### 数据提取
```javascript
// 从自然语言中提取结构化数据
const extractedData = await this.extractStructuredData(answer, fields);
```

#### 症状总结
```javascript
// 生成专业的医疗总结
const summary = await this.generateMedicalSummary();
```

## 使用说明

### 开发者

1. 克隆项目到本地
2. 配置 `config/llm-config.js` 中的API密钥
3. 使用微信开发者工具打开项目
4. 编译并预览

### 用户

1. 选择语音或文字输入模式
2. 回答系统提出的问题
3. 系统会根据您的回答智能决定下一个问题
4. 完成问诊后查看症状总结和健康建议

## 注意事项

1. **API费用**：LLM API调用会产生费用，请注意用量控制
2. **网络要求**：需要稳定的网络连接以访问LLM API
3. **隐私保护**：问诊数据仅存储在本地，不会上传到服务器
4. **医疗免责**：本系统仅供参考，不能替代专业医疗诊断

## 故障排除

### 常见问题

**Q: LLM API调用失败？**
A: 检查API密钥是否正确配置，网络连接是否正常。

**Q: 语音识别不工作？**
A: 确保已授权麦克风权限，在安静环境中使用。

**Q: 问题跳过了？**
A: 系统根据决策树逻辑自动跳过不相关的问题。

**Q: 总结生成失败？**
A: 检查LLM配置，或禁用 `enableSummaryGeneration` 使用备用总结。

## 更新日志

### v2.0.0 (当前版本)
- ✅ 实现完整的决策树式问诊流程
- ✅ 集成LLM进行相关性判断和数据提取
- ✅ 自动生成症状总结和健康建议
- ✅ 优化语音交互体验
- ✅ 重构代码结构，提升可维护性

### v1.0.0
- ✅ 基础问诊功能
- ✅ 语音输入支持
- ✅ 聊天界面设计

## 技术支持

如有问题或建议，请联系开发团队。

---

**免责声明**：本系统仅供医疗信息收集和参考，不能替代专业医疗诊断和治疗。使用本系统时请务必咨询专业医生。
├── voiceInput.js      // 组件逻辑
├── voiceInput.wxml    // 组件模板
├── voiceInput.wxss    // 组件样式
└── voiceInput.json    // 组件配置
```

### 2. 核心功能

#### 2.1 录音管理
- **权限检查**：自动申请麦克风权限
- **录音控制**：开始/停止录音，支持最大时长限制
- **实时反馈**：录音状态显示、时长计时、进度条
- **错误处理**：录音失败的友好提示和重试机制

#### 2.2 语音识别
- **云函数调用**：调用 `/asr` 云函数进行语音识别
- **文件处理**：支持 MP3 格式，16kHz 采样率
- **异步处理**：使用 async/await 确保流程完整
- **结果返回**：成功返回识别文本，失败返回错误信息

#### 2.3 用户界面
- **模态弹窗**：全屏遮罩的语音输入界面
- **动态动画**：录音时的波纹动画效果
- **状态指示**：清晰的录音、识别状态提示
- **操作按钮**：开始录音、停止录音、取消操作
- **响应式设计**：适配不同屏幕尺寸

### 3. 组件属性 (Properties)
```javascript
{
  show: Boolean,        // 控制组件显示/隐藏
  maxDuration: Number   // 最大录音时长（秒）
}
```

### 4. 组件事件 (Events)
```javascript
bind:success  // 语音识别成功 - 返回 {text, audioPath, duration}
bind:error    // 识别失败 - 返回 {error}
bind:cancel   // 用户取消录音
bind:close    // 关闭组件
```

### 5. 在 consult 页面的集成

#### 5.1 页面更新
- **组件引入**：在 consult.json 中注册 voiceInput 组件
- **界面优化**：添加进度条、重新设计输入区域
- **状态管理**：`showVoiceInput` 控制组件显示
- **数据流**：语音识别结果自动填入回答框

#### 5.2 功能增强
- **问答记录**：完整保存每次问答的时间戳
- **本地存储**：使用 `wx.setStorageSync` 保存进度
- **用户体验**：添加重新开始、字符计数等功能
- **表单验证**：确保回答不为空才能进入下一题

### 6. 云函数配置需求

#### 6.1 ASR 云函数 (`/asr`)
```javascript
// 预期输入
{
  audioBuffer: ArrayBuffer,  // 音频文件数据
  format: String,           // 音频格式 (mp3)
  sampleRate: Number        // 采样率 (16000)
}

// 预期输出
{
  success: Boolean,
  text: String,      // 识别结果文本
  message: String    // 错误信息（失败时）
}
```

#### 6.2 小程序配置
- **app.js**：已添加云开发初始化代码
- **app.json**：已添加录音权限和后台音频模式配置
- **权限说明**：已添加麦克风权限使用说明

### 7. 使用示例

#### 7.1 在页面中使用
```html
<voice-input 
  show="{{showVoiceInput}}"
  max-duration="{{60}}"
  bind:success="onVoiceSuccess"
  bind:error="onVoiceError"
  bind:cancel="onVoiceCancel"
  bind:close="onVoiceClose"
/>
```

#### 7.2 事件处理
```javascript
onVoiceSuccess(e) {
  const { text } = e.detail;
  this.setData({ 
    userAnswer: text,
    showVoiceInput: false 
  });
}
```

### 8. 样式特性
- **现代化设计**：圆角、渐变、阴影效果
- **动画效果**：录音波纹动画、按钮缩放反馈
- **主题色彩**：绿色主题色（#1aad19）
- **可访问性**：清晰的文字说明和状态提示

## 待实现功能

### 下一步：cameraView 组件
- 摄像头权限管理
- 实时视频流获取
- 每秒截取画面帧
- 调用情绪识别API
- 情绪结果展示

### 后续功能：
1. summary 页面的 LLM 总结功能
2. 用户信息绑定和云数据库存储
3. 回答相关性判断功能

## 部署注意事项

1. **云开发环境**：需要在 `app.js` 中配置正确的云环境ID
2. **云函数部署**：需要部署 `asr` 云函数用于语音识别
3. **权限申请**：确保在小程序管理后台配置录音权限
4. **测试设备**：真机测试录音和语音识别功能

## 技术栈
- **前端**：微信小程序原生框架
- **云服务**：微信云开发
- **音频处理**：微信小程序录音管理器API
- **UI设计**：响应式布局 + CSS3动画
