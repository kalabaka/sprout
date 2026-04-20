/**
 * 大模型服务层 - 适配器模式
 * 统一封装不同厂商的 LLM API，支持热插拔切换
 * 当前实现：通义千问（兼容 OpenAI 协议）
 */

const OpenAI = require('openai');
const logger = require('../config/logger');

class LLMService {
  constructor() {
    this.client = null;
    this.model = process.env.QWEN_MODEL || process.env.LLM_MODEL || 'qwen-plus';
    this.baseUrl = process.env.QWEN_BASE_URL || process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.apiKey = process.env.QWEN_API_KEY || process.env.LLM_API_KEY;
    this.enabled = false;
    
    this.init();
  }

  init() {
    if (!this.apiKey) {
      logger.warn('LLM API Key 未配置，智能规划功能将使用规则引擎');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
      this.enabled = true;
      logger.info(`LLM 服务初始化成功: model=${this.model}, baseUrl=${this.baseUrl}`);
    } catch (error) {
      logger.error('LLM 服务初始化失败:', error.message);
    }
  }

  isAvailable() {
    return this.enabled && this.client !== null;
  }

  async chatCompletion(messages, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM 服务不可用，请检查 API Key 配置');
    }

    const startTime = Date.now();
    
    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
        response_format: options.response_format || { type: 'text' },
        ...this.buildExtraOptions(options),
      });

      const duration = Date.now() - startTime;
      const usage = completion.usage || {};
      
      logger.info(`LLM 调用成功: model=${this.model}, tokens=${usage.total_tokens || 'N/A'}, duration=${duration}ms`);

      return {
        content: completion.choices[0].message.content,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        model: completion.model,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`LLM 调用失败: ${error.message}, duration=${duration}ms`);
      
      if (error.code === 'insufficient_quota' || error.status === 429) {
        throw new Error('API 配额不足，请稍后重试');
      }
      if (error.code === 'invalid_api_key' || error.status === 401) {
        throw new Error('API Key 无效，请检查配置');
      }
      if (error.code === 'timeout' || error.code === 'ETIMEDOUT') {
        throw new Error('请求超时，请稍后重试');
      }
      
      throw new Error(`智能规划服务暂时不可用: ${error.message}`);
    }
  }

  buildExtraOptions(options) {
    const extra = {};
    
    if (options.topP !== undefined) {
      extra.top_p = options.topP;
    }
    if (options.stop) {
      extra.stop = options.stop;
    }
    if (options.presencePenalty !== undefined) {
      extra.presence_penalty = options.presencePenalty;
    }
    if (options.frequencyPenalty !== undefined) {
      extra.frequency_penalty = options.frequencyPenalty;
    }
    
    return extra;
  }

  async generateJSON(messages, options = {}) {
    const response = await this.chatCompletion(messages, {
      ...options,
      response_format: { type: 'json_object' },
    });

    return this.parseJSONResponse(response.content);
  }

  parseJSONResponse(content) {
    if (!content) {
      throw new Error('LLM 返回内容为空');
    }

    let jsonStr = content.trim();
    
    jsonStr = this.extractJsonFromString(jsonStr);

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error('JSON 解析失败:', parseError.message);
      logger.debug('原始内容:', content.substring(0, 500));
      throw new Error('LLM 返回格式错误，无法解析为 JSON');
    }
  }

  extractJsonFromString(str) {
    if (str.startsWith('{') || str.startsWith('[')) {
      const lastBrace = str.lastIndexOf('}') !== -1 ? str.lastIndexOf('}') : str.lastIndexOf(']');
      if (lastBrace !== -1) {
        return str.substring(0, lastBrace + 1);
      }
      return str;
    }

    const jsonBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    const jsonObjectMatch = str.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return jsonObjectMatch[0];
    }

    const jsonArrayMatch = str.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      return jsonArrayMatch[0];
    }

    return str;
  }

  extractAndValidateJSON(content) {
    if (!content) {
      return { valid: false, error: 'LLM 返回内容为空', data: null };
    }

    let jsonStr = content.trim();
    jsonStr = this.extractJsonFromString(jsonStr);

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error('JSON 解析失败:', parseError.message);
      logger.debug('原始内容:', content.substring(0, 500));
      return { valid: false, error: 'LLM 返回格式错误，无法解析为 JSON', data: null };
    }

    if (!data.phases || !Array.isArray(data.phases)) {
      return { valid: false, error: '缺少必填字段 phases 或格式错误', data: null };
    }

    for (let i = 0; i < data.phases.length; i++) {
      const phase = data.phases[i];
      
      if (!phase.name) {
        return { valid: false, error: `第 ${i + 1} 阶段缺少 name 字段`, data: null };
      }
      
      if (!phase.tasks || !Array.isArray(phase.tasks)) {
        return { valid: false, error: `阶段「${phase.name}」缺少 tasks 字段或格式错误`, data: null };
      }

      for (let j = 0; j < phase.tasks.length; j++) {
        const task = phase.tasks[j];
        
        if (!task.name) {
          return { valid: false, error: `阶段「${phase.name}」第 ${j + 1} 个任务缺少 name 字段`, data: null };
        }
        
        if (typeof task.estimatedMinutes !== 'number' || task.estimatedMinutes <= 0) {
          phase.tasks[j].estimatedMinutes = 45;
        }
        
        if (typeof task.difficulty !== 'number' || task.difficulty < 1 || task.difficulty > 3) {
          phase.tasks[j].difficulty = 2;
        }
      }
    }

    if (!data.explanation) {
      data.explanation = {
        phaseDistribution: 'AI 智能规划',
        summary: '由 AI 根据您的学习目标生成的个性化计划',
      };
    }

    return { valid: true, error: null, data };
  }

  async testConnection() {
    if (!this.isAvailable()) {
      return { success: false, message: 'LLM 服务未初始化' };
    }

    try {
      const result = await this.chatCompletion([
        { role: 'user', content: '你好，请回复"连接成功"' }
      ], { maxTokens: 50 });

      return {
        success: true,
        message: 'LLM 服务连接正常',
        model: this.model,
        response: result.content,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  getModelInfo() {
    return {
      model: this.model,
      baseUrl: this.baseUrl,
      available: this.isAvailable(),
    };
  }
}

module.exports = new LLMService();
