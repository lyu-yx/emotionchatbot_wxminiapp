// 引入LLM配置
const LLM_CONFIG = require('../../config/llm-config.js');

Page({
  data: {
    qaList: [],
    summary: "正在生成问诊总结...",
    patientData: {},
    chatHistory: [],
    isLoading: true
  },
  
  onLoad() {
    console.log('总结页面加载');
    
    // 获取保存的数据
    const qaRecords = wx.getStorageSync("qaRecords") || [];
    const patientData = wx.getStorageSync("patientData") || {};
    const chatHistory = wx.getStorageSync("chatHistory") || [];
    
    this.setData({ 
      qaList: qaRecords,
      patientData: patientData,
      chatHistory: chatHistory
    });
    
    // 尝试从聊天记录中提取LLM生成的总结
    this.extractSummaryFromChat();
  },

  /**
   * 从聊天记录中提取LLM生成的总结
   */
  extractSummaryFromChat() {
    const chatHistory = this.data.chatHistory;
    
    // 查找最后一条系统消息，通常是LLM生成的总结
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      if (message.type === 'system' && message.content.length > 100) {
        // 如果内容较长，可能是总结
        this.setData({
          summary: message.content,
          isLoading: false
        });
        return;
      }
    }
    
    // 如果没有找到LLM总结，生成基本总结
    this.generateBasicSummary();
  },

  /**
   * 生成基本总结
   */
  generateBasicSummary() {
    const patientData = this.data.patientData;
    
    let summary = "## 问诊总结\n\n";
    
    // 基本信息
    if (patientData.gender || patientData.age) {
      summary += `**患者信息：** ${patientData.gender || '未知'}性，${patientData.age || '年龄未知'}\n\n`;
    }
    
    // 主要症状
    const symptoms = [];
    if (patientData.fever) symptoms.push("发热");
    if (patientData.cold_feeling) symptoms.push("怕冷");
    if (patientData.headache) symptoms.push("头痛");
    if (patientData.dizziness) symptoms.push("头晕");
    if (patientData.cough) symptoms.push("咳嗽");
    if (patientData.sore_throat) symptoms.push("咽喉痛");
    
    if (symptoms.length > 0) {
      summary += `**主要症状：** ${symptoms.join("、")}\n\n`;
    }
    
    // 慢性疾病
    if (patientData.chronic_disease) {
      summary += `**慢性疾病：** ${patientData.chronic_disease}\n\n`;
    }
    
    // 建议
    summary += "**建议：** 请根据症状情况，及时就医咨询专业医生。\n\n";
    summary += "**注意：** 本总结仅供参考，不能替代专业医疗诊断。";
    
    this.setData({
      summary: summary,
      isLoading: false
    });
  },

  /**
   * 复制总结内容
   */
  copySummary() {
    wx.setClipboardData({
      data: this.data.summary,
      success: () => {
        wx.showToast({
          title: '总结已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 分享总结
   */
  shareSummary() {
    // 将总结保存为可分享的格式
    const shareData = {
      summary: this.data.summary,
      patientData: this.data.patientData,
      timestamp: new Date().toISOString()
    };
    
    wx.setStorageSync('shareSummary', shareData);
    
    wx.showToast({
      title: '总结已保存',
      icon: 'success'
    });
  },

  /**
   * 重新开始问诊
   */
  startNewConsult() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
})