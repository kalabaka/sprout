/**
 * 新芽学习规划系统 - 后端入口
 *
 * 统一API返回格式：
 * {
 *   code: number,    // 状态码
 *   message: string, // 提示信息
 *   data: any        // 响应数据
 * }
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool, testConnection } = require('./config/database');
const logger = require('./config/logger');
const { success, fail, CODE } = require('./utils/response');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const userRoutes = require('./routes/user');
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goal');
const planRoutes = require('./routes/plan');
const taskRoutes = require('./routes/task');
const agentRoutes = require('./routes/agent');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb', verify: (req, res, buf) => {
  if (buf.length > 0) {
    req.rawBody = buf.toString('utf8');
  }
}}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  logger.api(`${req.method} ${req.path}`);
  if (req.method === 'POST' && req.path.includes('study-session')) {
    logger.api(`请求体: ${JSON.stringify(req.body)}`);
  }
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/goal', goalRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/qa', require('./routes/qa'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin-auth', require('./routes/adminAuth'));
app.use('/api/semester', require('./routes/semesterRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/time-slots', require('./routes/timeSlotRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/study-session', require('./routes/studySessionRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));

const uploadsDir = path.join(__dirname, 'uploads')
const absoluteUploadsDir = path.resolve(uploadsDir)
app.use('/uploads', express.static(absoluteUploadsDir));
logger.system('静态文件服务路径: ' + absoluteUploadsDir);

app.get('/api/test', (req, res) => {
  res.json(success({
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }, '新芽学习规划系统API运行正常'));
});

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    
    const llmService = require('./services/LLMService');
    const llmStatus = llmService.getModelInfo();
    
    res.json(success({ 
      database: 'connected',
      llm: llmStatus.available ? 'available' : 'unavailable',
      llmModel: llmStatus.model,
    }, '服务健康'));
  } catch (error) {
    res.json(fail('数据库连接失败', 500));
  }
});

app.get('/api/llm/test', async (req, res) => {
  const llmService = require('./services/LLMService');
  const result = await llmService.testConnection();
  res.json(success(result, result.message));
});

app.get('/api/cache/stats', (req, res) => {
  const { cache } = require('./services/CacheService');
  res.json(success(cache.getStats(), '缓存统计'));
});

app.post('/api/cache/clear', (req, res) => {
  const { cache } = require('./services/CacheService');
  cache.clear();
  res.json(success(null, '缓存已清除'));
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    logger.warn('数据库连接失败，请检查配置后重试');
  }

  app.listen(PORT, () => {
    logger.system(`新芽学习规划系统API已启动: http://localhost:${PORT}`);
    logger.system(`API文档: http://localhost:${PORT}/api/test`);
  });
};

startServer();

module.exports = app;
