const { pool } = require('./src/config/database');

async function testData() {
  try {
    const [rows] = await pool.execute('SELECT id, name, subject, tags FROM knowledge_points LIMIT 3');
    console.log('查询结果:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Subject: ${row.subject}`);
      
      // 检查 tags 的类型
      console.log(`  Tags type: ${typeof row.tags}`);
      console.log(`  Tags is array: ${Array.isArray(row.tags)}`);
      
      if (typeof row.tags === 'string') {
        try {
          const parsed = JSON.parse(row.tags);
          console.log(`  Parsed successfully: ${JSON.stringify(parsed)}`);
        } catch (e) {
          console.log(`  Parse Error: ${e.message}`);
        }
      } else if (Array.isArray(row.tags)) {
        console.log(`  Already an array: ${JSON.stringify(row.tags)}`);
      }
    });
    
    // 测试 PlanningAgent
    const KnowledgeModel = require('./src/models/KnowledgeModel');
    const points = await KnowledgeModel.findBySubject('Java');
    console.log(`\nJava 知识点数量: ${points.length}`);
    if (points.length > 0) {
      console.log(`第一个知识点: ${points[0].name}`);
      console.log(`Tags: ${JSON.stringify(points[0].tags)}`);
    }
  } catch (error) {
    console.error('查询失败:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

testData();
