require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');
const logger = require('../config/logger');

const quizData = [
  {
    name: '变量与数据类型',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: '以下哪个是Java的基本数据类型？',
      options: ['A. int', 'B. String', 'C. ArrayList', 'D. HashMap'],
      correct: 'A',
      explanation: 'int是Java的8种基本数据类型之一，String、ArrayList、HashMap都是引用类型'
    },
    pass_score: 60
  },
  {
    name: '运算符',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: '表达式 5 % 2 的结果是？',
      options: ['A. 2', 'B. 2.5', 'C. 1', 'D. 0'],
      correct: 'C',
      explanation: '%是取模运算符，5除以2商2余1，所以结果是1'
    },
    pass_score: 60
  },
  {
    name: '条件判断',
    subject: 'Java',
    quiz: {
      type: 'true_false',
      question: 'if语句必须要有else分支？',
      correct: false,
      explanation: 'if语句可以单独使用，else分支是可选的'
    },
    pass_score: 60
  },
  {
    name: '循环语句',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: '以下哪个循环至少执行一次？',
      options: ['A. for', 'B. while', 'C. do-while', 'D. foreach'],
      correct: 'C',
      explanation: 'do-while循环先执行循环体再判断条件，因此至少执行一次'
    },
    pass_score: 60
  },
  {
    name: '数组',
    subject: 'Java',
    quiz: {
      type: 'fill_blank',
      question: '获取数组长度的属性是 ___',
      keywords: ['length'],
      match_mode: 'any',
      explanation: 'Java中通过数组.length属性获取数组长度'
    },
    pass_score: 60
  },
  {
    name: '类与对象',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: '创建对象使用的关键字是？',
      options: ['A. class', 'B. new', 'C. create', 'D. object'],
      correct: 'B',
      explanation: 'Java中使用new关键字创建对象实例'
    },
    pass_score: 60
  },
  {
    name: '封装',
    subject: 'Java',
    quiz: {
      type: 'true_false',
      question: 'private修饰的方法可以在类外部调用？',
      correct: false,
      explanation: 'private修饰的成员只能在类内部访问，不能在类外部调用'
    },
    pass_score: 60
  },
  {
    name: '继承',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: 'Java是否支持多继承？',
      options: ['A. 支持', 'B. 不支持', 'C. 只支持接口多继承', 'D. 只支持类多继承'],
      correct: 'C',
      explanation: 'Java类不支持多继承，但接口可以多继承，一个类可以实现多个接口'
    },
    pass_score: 60
  },
  {
    name: '多态',
    subject: 'Java',
    quiz: {
      type: 'fill_blank',
      question: '多态的三种实现方式之一是：___（提示：重写、重载或接口）',
      keywords: ['重写', '重载', '接口', 'override', 'overload', 'interface'],
      match_mode: 'any',
      explanation: '多态的三种实现方式：方法重写、方法重载、接口实现'
    },
    pass_score: 60
  },
  {
    name: '抽象类',
    subject: 'Java',
    quiz: {
      type: 'true_false',
      question: '抽象类可以被实例化？',
      correct: false,
      explanation: '抽象类不能被直接实例化，必须通过子类继承后创建子类实例'
    },
    pass_score: 60
  },
  {
    name: '接口',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: 'Java 8之后，接口中可以包含？',
      options: ['A. 只有抽象方法', 'B. 抽象方法和默认方法', 'C. 只有默认方法', 'D. 只有静态方法'],
      correct: 'B',
      explanation: 'Java 8开始，接口可以包含抽象方法、默认方法(default)和静态方法'
    },
    pass_score: 60
  },
  {
    name: '异常处理',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: 'finally块的作用是？',
      options: ['A. 捕获异常', 'B. 抛出异常', 'C. 无论是否异常都执行', 'D. 声明异常'],
      correct: 'C',
      explanation: 'finally块中的代码无论是否发生异常都会执行，通常用于资源清理'
    },
    pass_score: 60
  },
  {
    name: '集合框架',
    subject: 'Java',
    quiz: {
      type: 'single_choice',
      question: 'ArrayList和LinkedList的主要区别是？',
      options: ['A. 底层实现不同', 'B. 线程安全性不同', 'C. 存储类型不同', 'D. 没有区别'],
      correct: 'A',
      explanation: 'ArrayList底层是数组，LinkedList底层是链表，这决定了它们的性能特点不同'
    },
    pass_score: 60
  },
  {
    name: '字符串',
    subject: 'Java',
    quiz: {
      type: 'true_false',
      question: 'String对象创建后可以被修改？',
      correct: false,
      explanation: 'String是不可变对象，一旦创建就不能修改，任何修改操作都会返回新的String对象'
    },
    pass_score: 60
  },
  {
    name: '泛型',
    subject: 'Java',
    quiz: {
      type: 'fill_blank',
      question: '泛型的通配符是 ___',
      keywords: ['?', '问号'],
      match_mode: 'any',
      explanation: 'Java泛型使用?作为通配符，表示未知类型'
    },
    pass_score: 60
  }
];

async function insertQuizData() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    let updated = 0;
    let notFound = 0;
    
    for (const item of quizData) {
      const [rows] = await connection.execute(
        'SELECT id FROM knowledge_points WHERE name = ? AND subject = ?',
        [item.name, item.subject]
      );
      
      if (rows.length > 0) {
        const kpId = rows[0].id;
        await connection.execute(
          `UPDATE knowledge_points 
           SET has_quiz = TRUE, 
               quiz_data = ?, 
               quiz_pass_score = ? 
           WHERE id = ?`,
          [JSON.stringify(item.quiz), item.pass_score, kpId]
        );
        logger.info(`更新知识点题目: ${item.name}`);
        updated++;
      } else {
        logger.warn(`知识点不存在: ${item.name} (${item.subject})`);
        notFound++;
      }
    }
    
    await connection.commit();
    logger.info(`预设题目数据插入完成: 更新${updated}条, 未找到${notFound}条`);
    return { updated, notFound };
  } catch (error) {
    await connection.rollback();
    logger.error('插入预设题目失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  insertQuizData()
    .then((result) => {
      logger.info('预设题目脚本执行完成:', result);
      process.exit(0);
    })
    .catch((err) => {
      logger.error('预设题目脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { insertQuizData, quizData };
