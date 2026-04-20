/**
 * 演示案例API测试脚本
 *
 * 使用方法：
 * 1. 启动后端服务: npm start
 * 2. 运行测试: node docs/demo-api-test.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试账号
const TEST_USER = {
  username: 'demo_user',
  password: 'demo123'
};

let token = '';
let planId = '';
let taskIds = [];

// 颜色输出
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// ============================================
// 演示流程
// ============================================

async function runDemo() {
  log('\n========== 新芽学习规划系统 - 演示流程 ==========\n', 'blue');

  try {
    // Step 1: 用户登录
    await step1_login();

    // Step 2: 创建学习计划（输入学习目标）
    await step2_createPlan();

    // Step 3: 查看生成的学习任务
    await step3_viewTasks();

    // Step 4: 完成部分任务
    await step4_completeTasks();

    // Step 5: 查看学习数据分析
    await step5_viewAnalysis();

    // Step 6: 获取风险评估
    await step6_evaluateRisk();

    // Step 7: 获取动机干预建议
    await step7_getAdvice();

    log('\n========== 演示完成 ==========\n', 'green');
    log('所有API调用成功！', 'green');

  } catch (error) {
    log(`\n演示出错: ${error.message}`, 'red');
    console.error(error.response?.data || error);
  }
}

// ============================================
// Step 1: 用户登录
// ============================================
async function step1_login() {
  log('\n[Step 1] 用户登录', 'yellow');
  log('输入: 用户名=demo_user, 密码=demo123');

  try {
    // 先注册
    await axios.post(`${BASE_URL}/user/register`, TEST_USER);
  } catch (e) {
    // 用户已存在，继续登录
  }

  const res = await axios.post(`${BASE_URL}/user/login`, TEST_USER);
  token = res.data.data.token;

  log(`输出: 登录成功, token=${token.substring(0, 20)}...`, 'green');
}

// ============================================
// Step 2: 创建学习计划
// ============================================
async function step2_createPlan() {
  log('\n[Step 2] 创建学习计划 - 输入学习目标', 'yellow');
  log('输入: 目标=学习Python数据分析，掌握pandas和numpy库');

  const res = await axios.post(
    `${BASE_URL}/plan`,
    {
      name: 'Python数据分析学习计划',
      goal: '学习Python数据分析，掌握pandas和numpy库，完成数据可视化项目',
      targetDate: '2024-03-01'
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  planId = res.data.data.planId;
  taskIds = res.data.data.tasks.map(t => t.id);

  log(`输出: 计划ID=${planId}, 任务数=${res.data.data.taskCount}`, 'green');
}

// ============================================
// Step 3: 查看学习任务
// ============================================
async function step3_viewTasks() {
  log('\n[Step 3] 查看生成的学习路径', 'yellow');

  const res = await axios.get(
    `${BASE_URL}/plan/${planId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const tasks = res.data.data.tasks;
  log(`输出: 共${tasks.length}个任务`);

  tasks.forEach((t, i) => {
    const stage = t.difficulty === 1 ? '基础' : t.difficulty === 2 ? '进阶' : '应用';
    log(`  ${i+1}. [${stage}] ${t.name} - ${t.estimated_time}分钟`, 'blue');
  });
}

// ============================================
// Step 4: 完成部分任务
// ============================================
async function step4_completeTasks() {
  log('\n[Step 4] 完成部分学习任务', 'yellow');

  // 模拟完成任务1
  log(`完成任务1: ${taskIds[0]}, 用时40分钟, 评分85分`);
  await axios.post(
    `${BASE_URL}/task/${taskIds[0]}/complete`,
    { actualTime: 40, qualityScore: 85, planId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 模拟完成任务2
  log(`完成任务2: ${taskIds[1]}, 用时50分钟, 评分80分`);
  await axios.post(
    `${BASE_URL}/task/${taskIds[1]}/complete`,
    { actualTime: 50, qualityScore: 80, planId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 模拟完成任务3
  log(`完成任务3: ${taskIds[2]}, 用时65分钟, 评分78分`);
  await axios.post(
    `${BASE_URL}/task/${taskIds[2]}/complete`,
    { actualTime: 65, qualityScore: 78, planId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 开始任务4
  log(`开始任务4: ${taskIds[3]}`);
  await axios.post(
    `${BASE_URL}/task/${taskIds[3]}/start`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  log('输出: 3个任务已完成, 1个进行中', 'green');
}

// ============================================
// Step 5: 查看学习数据分析
// ============================================
async function step5_viewAnalysis() {
  log('\n[Step 5] 查看学习数据分析', 'yellow');

  const res = await axios.get(
    `${BASE_URL}/plan`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const plan = res.data.data.find(p => p.id == planId);
  log(`输出: 完成率=${plan?.taskStats?.completed || 3}/${plan?.taskStats?.total || 8}`);

  // 查看具体统计
  const statsRes = await axios.get(
    `${BASE_URL}/task/${planId}/stats`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const stats = statsRes.data.data;
  log(`  总任务: ${stats.total}, 已完成: ${stats.completed}, 进行中: ${stats.inProgress}`, 'blue');
}

// ============================================
// Step 6: 风险评估
// ============================================
async function step6_evaluateRisk() {
  log('\n[Step 6] 系统计算学习风险', 'yellow');
  log('输入: 时间偏差=2.7%, 完成率=37.5%, 质量分=81');

  // 直接调用核心Agent进行评估
  const res = await axios.post(
    `${BASE_URL}/agent/evaluate`,
    {
      timeDeviation: 2.7,
      completionRate: 0.375,
      score: 81
    }
  );

  const evaluation = res.data.data.evaluation;
  log(`输出: 风险等级=${evaluation.level}, 风险指数=${evaluation.score}%`, 'green');

  log('  维度分析:', 'blue');
  log(`    - 时间维度: ${evaluation.dimensions.time.score}分 (${evaluation.dimensions.time.status})`);
  log(`    - 进度维度: ${evaluation.dimensions.progress.score}分 (${evaluation.dimensions.progress.status})`);
  log(`    - 质量维度: ${evaluation.dimensions.quality.score}分 (${evaluation.dimensions.quality.status})`);
}

// ============================================
// Step 7: 动机干预建议
// ============================================
async function step7_getAdvice() {
  log('\n[Step 7] 系统给出动机干预建议', 'yellow');

  const res = await axios.post(
    `${BASE_URL}/agent/advice`,
    {
      riskLevel: '中风险',
      goal: 'Python数据分析学习计划',
      taskCount: 8
    }
  );

  const advice = res.data.data;
  log(`输出: 风险等级=${advice.riskLevel}`, 'green');
  log(`  干预类型: ${advice.intervention.type}`);
  log(`  标题: ${advice.intervention.title}`);
  log(`  内容: ${advice.intervention.content}`, 'blue');

  log('  建议措施:', 'blue');
  advice.generalAdvice.tips.forEach((tip, i) => {
    log(`    ${i+1}. ${tip}`);
  });
}

// 运行演示
runDemo();
