# 决策树问诊和LLM集成使用指南

## 快速开始

### 1. 配置LLM API

编辑 `config/llm-config.js` 文件，填入您的API密钥：

```javascript
// 将此行修改为您的实际API密钥
apiKey: "sk-xxxxxxxxxxxxxxxxxx",
```

### 2. 启动项目

1. 用微信开发者工具打开项目
2. 编译并预览
3. 选择问诊页面开始体验

## 核心功能演示

### 决策树问诊流程

系统会按照以下顺序进行智能问诊：

1. **基础信息收集**
   - 系统："请告诉我您的性别和年龄？"
   - 用户："我是女性，28岁"
   - 系统：自动提取 `gender: "female"`, `age: "28"`

2. **追问相关问题**
   - 系统："您有没有慢性病，比如高血压、高血糖？"
   - 用户："有高血压，在吃药"
   - 系统：记录 `chronic_disease: "高血压"`, `treatment: "在吃药"`

3. **智能跳过与条件判断**
   - 如果用户是男性，系统会自动跳过月经相关问题
   - 如果没有发热，系统不会询问发热温度

### LLM智能分析

#### 相关性判断
```
用户问题：最近有没有头痛或头晕？
用户回答：我昨天吃了火锅
系统判断：回答不相关，重新询问
```

#### 数据提取
```
用户回答：我经常头疼，特别是太阳穴那里，像针扎一样疼
系统提取：
- headache: true
- headache_location: "太阳穴"
- headache_type: "针扎样疼痛"
```

#### 症状总结
完成问诊后，系统会生成：
```
## 基本信息
女性，28岁，有高血压病史，目前在服药治疗

## 主要症状
经常性头痛，主要位于太阳穴部位，表现为针扎样疼痛

## 中医证候分析
根据症状表现，初步考虑为肝阳上亢型头痛...

## 健康建议
1. 保持规律作息
2. 避免情绪激动
3. 适当运动...
```

## 语音交互演示

### 自动语音模式
1. 切换到"语音输入"模式
2. 系统播放问题后自动开始录音
3. 说话完毕1.5秒后自动停止
4. 识别结果自动发送

### 手动语音模式
1. 切换到"文字输入"模式
2. 点击语音按钮手动录音
3. 识别结果填入输入框
4. 点击发送按钮

## 配置选项详解

### 功能开关
```javascript
// 在 llm-config.js 中控制各功能的开启/关闭
enableRelevanceCheck: true,    // 相关性检查
enableDataExtraction: true,    // 数据提取
enableSummaryGeneration: true, // 总结生成
```

### 模型选择
```javascript
// 推荐配置（成本低，速度快）
model: "qwen-turbo",
temperature: 0.3,

// 高质量配置（成本高，质量好）
model: "qwen-plus", 
temperature: 0.1,
```

### 备用API
```javascript
// 如果主API不可用，自动切换到备用API
fallback: {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "your-openai-key",
  model: "gpt-3.5-turbo"
}
```

## 调试技巧

### 查看提取的数据
在控制台中可以看到：
```javascript
console.log('患者数据:', this.data.patientData);
console.log('原始回答:', this.data.rawResponses);
```

### 测试LLM连接
```javascript
// 在控制台中测试
this.callLLMAPI("你好，请回复测试成功").then(console.log);
```

### 禁用LLM功能
如果遇到API问题，可以临时禁用：
```javascript
enableRelevanceCheck: false,   // 所有回答都认为相关
enableDataExtraction: false,   // 不提取结构化数据
enableSummaryGeneration: false, // 使用简单总结
```

## 常见问题排查

### API调用失败
1. 检查网络连接
2. 验证API密钥是否正确
3. 查看控制台错误信息
4. 尝试备用API

### 语音识别问题
1. 确认麦克风权限
2. 在安静环境中测试
3. 检查录音时长（不要太短）
4. 尝试清晰大声说话

### 决策树跳过问题
这是正常现象：
- 男性用户不会被问月经问题
- 没有发热不会问发热温度
- 回答"否"的症状不会追问细节

## 开发建议

### 扩展问题库
在 `questionTree` 中添加新的主题：
```javascript
"T10-新主题": {
  question: "新的问题？",
  fields: ["new_field"],
  condition: "始终提问",
  followUps: [...]
}
```

### 自定义提示词
修改 `llm-config.js` 中的提示词模板：
```javascript
relevancePrompt: (question, answer) => `
  自定义相关性判断提示词...
`,
```

### 性能优化
```javascript
// 减少API调用
enableRelevanceCheck: false,

// 降低超时时间
requestTimeout: 5000,

// 减少重试次数
retryTimes: 1,
```
