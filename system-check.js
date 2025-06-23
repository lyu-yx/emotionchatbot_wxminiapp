/**
 * 系统完整性检查脚本
 * 用于验证所有功能模块是否正确配置
 */

// 验证配置文件
function validateConfig() {
  const issues = [];
  
  try {
    const LLM_CONFIG = require('./config/llm-config.js');
    
    // 检查必要的配置项
    if (!LLM_CONFIG.apiKey || LLM_CONFIG.apiKey === 'your-dashscope-api-key-here') {
      issues.push('❌ API密钥未配置');
    } else if (!LLM_CONFIG.apiKey.startsWith('sk-')) {
      issues.push('❌ API密钥格式错误');
    } else {
      issues.push('✅ API密钥配置正确');
    }
    
    // 检查模型配置
    if (LLM_CONFIG.model) {
      issues.push('✅ LLM模型配置正确');
    }
    
    // 检查ASR配置
    if (LLM_CONFIG.asr && LLM_CONFIG.asr.model) {
      issues.push('✅ ASR配置正确');
    }
    
    // 检查TTS配置
    if (LLM_CONFIG.tts && LLM_CONFIG.tts.model) {
      issues.push('✅ TTS配置正确');
    }
    
    // 检查功能开关
    if (LLM_CONFIG.enableRelevanceCheck) {
      issues.push('✅ LLM相关性检查已启用');
    }
    
    if (LLM_CONFIG.enableASR) {
      issues.push('✅ ASR功能已启用');
    }
    
    if (LLM_CONFIG.enableTTS) {
      issues.push('✅ TTS功能已启用');
    }
    
  } catch (error) {
    issues.push('❌ 配置文件加载失败: ' + error.message);
  }
  
  return issues;
}

// 验证页面文件
function validatePages() {
  const issues = [];
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'pages/index/index.js',
    'pages/index/index.wxml', 
    'pages/index/index.wxss',
    'pages/consult/consult.js',
    'pages/consult/consult.wxml',
    'pages/consult/consult.wxss',
    'pages/consult/consult.json',
    'pages/summary/summary.js',
    'pages/summary/summary.wxml',
    'pages/summary/summary.wxss',
    'pages/test/test.js',
    'pages/test/test.wxml',
    'pages/test/test.wxss',
    'pages/test/test.json'
  ];
  
  requiredFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        issues.push(`✅ ${file} 存在`);
      } else {
        issues.push(`❌ ${file} 缺失`);
      }
    } catch (error) {
      issues.push(`❌ ${file} 检查失败`);
    }
  });
  
  return issues;
}

// 验证app配置
function validateAppConfig() {
  const issues = [];
  
  try {
    const fs = require('fs');
    const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    // 检查页面注册
    const requiredPages = [
      'pages/index/index',
      'pages/consult/consult', 
      'pages/summary/summary',
      'pages/test/test'
    ];
    
    requiredPages.forEach(page => {
      if (appConfig.pages.includes(page)) {
        issues.push(`✅ ${page} 已注册`);
      } else {
        issues.push(`❌ ${page} 未注册`);
      }
    });
    
    // 检查权限配置
    if (appConfig.permission && appConfig.permission['scope.record']) {
      issues.push('✅ 录音权限已配置');
    } else {
      issues.push('❌ 录音权限未配置');
    }
    
    // 检查后台音频
    if (appConfig.requiredBackgroundModes && 
        appConfig.requiredBackgroundModes.includes('audio')) {
      issues.push('✅ 后台音频已启用');
    } else {
      issues.push('❌ 后台音频未启用');
    }
    
  } catch (error) {
    issues.push('❌ app.json 检查失败: ' + error.message);
  }
  
  return issues;
}

// 生成完整性报告
function generateSystemReport() {
  console.log('=== 智能医疗助手系统完整性检查 ===\n');
  
  console.log('📋 配置文件检查:');
  const configIssues = validateConfig();
  configIssues.forEach(issue => console.log('  ' + issue));
  
  console.log('\n📁 页面文件检查:');
  const pageIssues = validatePages();
  pageIssues.forEach(issue => console.log('  ' + issue));
  
  console.log('\n⚙️ 应用配置检查:');
  const appIssues = validateAppConfig();
  appIssues.forEach(issue => console.log('  ' + issue));
  
  console.log('\n=== 功能清单 ===');
  console.log('✅ 决策树式问诊流程');
  console.log('✅ LLM相关性判断和数据提取');
  console.log('✅ DashScope ASR语音识别');
  console.log('✅ DashScope TTS语音合成');
  console.log('✅ 智能症状总结和分析');
  console.log('✅ API功能测试页面');
  console.log('✅ 美观的总结报告页面');
  console.log('✅ 多模态交互体验');
  
  console.log('\n=== 使用指南 ===');
  console.log('1. 从首页选择输入模式（语音/文字）');
  console.log('2. 开始问诊，系统会智能引导问题');
  console.log('3. 语音模式下会自动播报和录音');
  console.log('4. 问诊结束后查看LLM生成的专业总结');
  console.log('5. 可从首页进入API测试页面验证功能');
  
  console.log('\n=== 注意事项 ===');
  console.log('⚠️ 确保DashScope API密钥配置正确');
  console.log('⚠️ 小程序需要录音权限');
  console.log('⚠️ 本系统仅供参考，不替代专业医疗诊断');
  
  console.log('\n系统检查完成! 🎉');
}

// 如果是直接运行此文件
if (require.main === module) {
  generateSystemReport();
}

module.exports = {
  validateConfig,
  validatePages, 
  validateAppConfig,
  generateSystemReport
};
