<template>
  <div class="home-page">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <div class="logo-wrapper">
          <span class="logo-icon">🌱</span>
          <span class="logo-text">新芽学习</span>
        </div>
      </div>

      <div class="header-center">
        <div class="search-wrapper">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索学习计划..."
            class="search-input"
            clearable
            @input="doSearch"
            @keyup.enter="doSearch"
          />
          <el-button class="search-btn" @click="doSearch">搜索</el-button>
        </div>
        <div class="nav-links">
          <el-button text class="nav-btn" @click="goToHome">
            <el-icon><HomeFilled /></el-icon>
            首页
          </el-button>
          <el-button text class="nav-btn" @click="goToDashboard">
            <el-icon><DataAnalysis /></el-icon>
            学习仪表盘
          </el-button>
          <el-dropdown trigger="click" @command="handleTaskCommand">
            <el-button text class="nav-btn">
              <el-icon><List /></el-icon>
              任务管理
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="ddl">
                  <el-icon><Clock /></el-icon>
                  DDL 任务
                </el-dropdown-item>
                <el-dropdown-item command="exams">
                  <el-icon><Document /></el-icon>
                  考试管理
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button text class="nav-btn" @click="goToPlans">
            <el-icon><List /></el-icon>
            学习计划
          </el-button>
          <el-button text class="nav-btn" @click="goToCourseEditor">
            <el-icon><Calendar /></el-icon>
            课表管理
          </el-button>
          <el-button text class="nav-btn" @click="goToDataCenter">
            <el-icon><DataLine /></el-icon>
            数据中心
          </el-button>
          <el-button text class="nav-btn" @click="goToStudyStats">
            <el-icon><TrendCharts /></el-icon>
            学习统计
          </el-button>
          <el-button text class="nav-btn" @click="goToBadgeWall">
            <el-icon><Medal /></el-icon>
            勋章墙
          </el-button>
          <el-button text class="nav-btn" @click="goToNotifications">
            <el-icon><Bell /></el-icon>
            消息中心
          </el-button>
        </div>
      </div>

      <div class="header-right">
        <NotificationBell />

        <el-dropdown trigger="click">
          <div class="user-info">
            <el-avatar :size="36" :src="avatarUrl" class="avatar">
              {{ !avatarUrl ? (username?.charAt(0) || 'U') : '' }}
            </el-avatar>
            <span class="username">{{ username || '用户' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$router.push('/profile')">
                <el-icon><User /></el-icon>
                个人设置
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 智能助手干预建议 -->
      <el-card v-if="intervention.show" shadow="hover" class="intervention-card" :class="'intervention-' + intervention.level">
        <div class="intervention-header">
          <el-avatar :size="32" class="intervention-avatar">
            <span>AI</span>
          </el-avatar>
          <div class="intervention-title">
            <span class="title-text">智能助手建议</span>
            <el-tag :type="intervention.tagType" size="small">{{ intervention.level }}</el-tag>
          </div>
          <el-button text @click="dismissIntervention" class="dismiss-btn">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="intervention-content">
          <p>{{ intervention.message }}</p>
        </div>
        <div class="intervention-actions">
          <el-button type="primary" size="small" @click="adoptIntervention">
            <el-icon><Check /></el-icon>
            采纳建议
          </el-button>
          <el-button size="small" @click="dismissIntervention">忽略</el-button>
        </div>
      </el-card>

      <!-- 左侧栏 -->
      <aside class="left-sidebar">
        <!-- 今日学习任务 -->
        <el-card shadow="hover" class="task-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <div class="title-icon">
                  <el-icon><Calendar /></el-icon>
                </div>
                <span>今日学习任务</span>
              </div>
              <el-tag size="small" effect="dark" type="primary">
                {{ completedCount }}/{{ filteredTasks.length }}
              </el-tag>
            </div>
          </template>

          <!-- 进度条 -->
          <div class="today-progress">
            <div class="progress-header">
              <span>学习进度</span>
              <span class="progress-value">{{ todayProgress }}%</span>
            </div>
            <el-progress
              :percentage="todayProgress"
              :stroke-width="10"
              :show-text="false"
              :color="progressColor"
            />
          </div>

          <!-- 任务列表 -->
          <div class="task-list">
            <TransitionGroup name="task">
              <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="task-item"
                :class="{
                  completed: task.status === 2,
                  active: task.status === 1
                }"
              >
                <el-checkbox
                  :model-value="task.status === 2"
                  @change="handleTaskComplete(task)"
                  class="task-checkbox"
                />
                <div class="task-content">
                  <span class="task-name">{{ task.name }}</span>
                  <div class="task-meta">
                    <span class="task-time">
                      <el-icon><Timer /></el-icon>
                      {{ task.estimated_time || 60 }}min
                    </span>
                    <el-tag size="small" :type="getDifficultyType(task.difficulty)" effect="plain">
                      {{ getDifficultyText(task.difficulty) }}
                    </el-tag>
                  </div>
                </div>
                <el-button
                  v-if="task.status === 0"
                  type="primary"
                  size="small"
                  class="start-btn"
                  @click.stop="startTask(task)"
                >
                  开始
                </el-button>
              </div>
            </TransitionGroup>

            <div v-if="filteredTasks.length === 0" class="empty-tip">
              <el-icon :size="40"><CircleCheck /></el-icon>
              <p>今日任务已完成！</p>
            </div>
          </div>
        </el-card>

        <!-- 本周学习进度 -->
        <el-card shadow="hover" class="progress-card" @click="showWeekProgress = true">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <div class="title-icon orange">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <span>本周学习进度</span>
              </div>
              <el-icon class="expand-icon"><ArrowRight /></el-icon>
            </div>
          </template>

          <div class="week-progress">
            <div v-for="course in weekCourses" :key="course.name" class="course-item">
              <div class="course-header">
                <div class="course-info">
                  <span class="course-icon">{{ course.icon }}</span>
                  <span class="course-name">{{ course.name }}</span>
                </div>
                <span class="course-percent">{{ course.percent }}%</span>
              </div>
              <el-progress
                :percentage="course.percent"
                :stroke-width="8"
                :show-text="false"
                :color="course.color"
              />
            </div>
          </div>
        </el-card>
      </aside>

      <!-- 中间栏 -->
      <main class="center-content">
        <!-- AI学习助手 -->
        <el-card shadow="hover" class="ai-card">
          <template #header>
            <div class="card-header ai-header">
              <div class="header-title">
                <el-avatar :size="40" class="ai-avatar">
                  <span>AI</span>
                </el-avatar>
                <div class="ai-title">
                  <span class="ai-name">学习助手</span>
                  <span class="ai-status">
                    <span class="status-dot"></span>
                    在线
                  </span>
                </div>
              </div>
              <el-button text @click="clearChat" class="clear-btn">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>

          <!-- 推荐卡片 -->
          <div class="recommend-section" v-if="chatMessages.length <= 1">
            <div class="recommend-title">今日推荐</div>
            <div class="recommend-cards">
              <div
                v-for="card in recommendCards"
                :key="card.title"
                class="recommend-card"
                @click="sendQuickMessage(card.prompt)"
              >
                <span class="card-icon">{{ card.icon }}</span>
                <span class="card-title">{{ card.title }}</span>
              </div>
            </div>
          </div>

          <!-- 对话区域 -->
          <div class="chat-messages" ref="chatContainer">
            <TransitionGroup name="message">
              <div
                v-for="(msg, index) in chatMessages"
                :key="index"
                class="message"
                :class="msg.role"
              >
                <el-avatar v-if="msg.role === 'assistant'" :size="32" class="message-avatar ai">
                  AI
                </el-avatar>
                <el-avatar v-else :size="32" :src="avatarUrl" class="message-avatar user">
                  {{ !avatarUrl ? (username?.charAt(0) || 'U') : '' }}
                </el-avatar>

                <div class="message-content">
                  <div class="message-bubble">
                    <p v-for="(line, i) in msg.content.split('\n')" :key="i">{{ line }}</p>
                  </div>
                  <span class="message-time">{{ msg.time }}</span>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <!-- 快捷功能 -->
          <div class="quick-actions" v-if="chatMessages.length > 1">
            <el-button
              v-for="action in quickActions"
              :key="action.label"
              size="small"
              class="quick-btn"
              @click="sendQuickMessage(action.prompt)"
            >
              {{ action.icon }} {{ action.label }}
            </el-button>
          </div>

          <!-- 输入区域 -->
          <div class="chat-input">
            <el-input
              v-model="chatInput"
              placeholder="向AI助手提问..."
              @keyup.enter="sendMessage"
              class="input-field"
            >
              <template #prefix>
                <el-icon><ChatLineSquare /></el-icon>
              </template>
            </el-input>
            <el-button
              type="primary"
              :disabled="!chatInput.trim()"
              @click="sendMessage"
              class="send-btn"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </div>
        </el-card>
      </main>

      <!-- 本周学习进度详情弹窗 -->
      <el-dialog v-model="showWeekProgress" title="本周学习进度详情" width="500px">
        <div class="week-progress-detail">
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in weekProgressDetail"
              :key="index"
              :timestamp="item.date"
              :type="item.type"
              placement="top"
            >
              <div class="timeline-content">
                <div class="timeline-title">{{ item.title }}</div>
                <div class="timeline-desc">{{ item.description }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-dialog>

      <!-- 学习成就详情弹窗 -->
      <el-dialog v-model="showAchievements" title="学习成就" width="500px">
        <div class="achievements-detail">
          <el-row :gutter="20">
            <el-col :span="12" v-for="item in achievementsDetail" :key="item.label">
              <div class="achievement-detail-item">
                <div class="detail-icon" :style="{ background: item.bgColor }">{{ item.icon }}</div>
                <div class="detail-info">
                  <div class="detail-value">{{ item.value }}</div>
                  <div class="detail-label">{{ item.label }}</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-dialog>

      <!-- 右侧栏 -->
      <aside class="right-sidebar">
        <!-- 学习日历 -->
        <el-card shadow="hover" class="calendar-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <div class="title-icon green">
                  <el-icon><Calendar /></el-icon>
                </div>
                <span>{{ currentMonthName }} 月历</span>
              </div>
              <div class="calendar-nav">
                <el-button text @click="prevMonth">
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <span class="current-month">{{ currentYear }}年{{ currentMonth + 1 }}月</span>
                <el-button text @click="nextMonth">
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </template>

          <div class="calendar">
            <!-- 周标题 -->
            <div class="calendar-header">
              <span v-for="day in weekDays" :key="day" class="week-day">{{ day }}</span>
            </div>
            <!-- 日期格子 -->
            <div class="calendar-grid">
              <div
                v-for="(day, index) in calendarDays"
                :key="index"
                class="calendar-day"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  'today': day.isToday,
                  'has-task': day.hasTask,
                  'selected': selectedDate === day.fullDate
                }"
                @click="selectDate(day)"
              >
                <span class="day-number">{{ day.date }}</span>
                <div v-if="day.hasTask && day.isCurrentMonth" class="task-indicator">
                  <span class="task-dot" :class="{ completed: day.completed }"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 选中日期的任务 -->
          <div v-if="selectedDateTasks.length > 0" class="selected-tasks">
            <div class="tasks-header">
              <span class="date-label">{{ formatSelectedDate }}</span>
              <el-tag size="small">{{ selectedDateTasks.length }}个任务</el-tag>
            </div>
            <div class="tasks-list">
              <div v-for="task in selectedDateTasks" :key="task.id" class="task-preview">
                <el-checkbox :model-value="task.status === 2" />
                <span>{{ task.name }}</span>
              </div>
            </div>
          </div>

          <!-- 图例 -->
          <div class="calendar-legend">
            <span class="legend-item">
              <span class="legend-dot active"></span>
              今日
            </span>
            <span class="legend-item">
              <span class="legend-dot pending"></span>
              待完成
            </span>
            <span class="legend-item">
              <span class="legend-dot done"></span>
              已完成
            </span>
          </div>
        </el-card>

        <!-- 学习成就 -->
        <el-card shadow="hover" class="achievement-card" @click="showAchievements = true">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <div class="title-icon purple">
                  <el-icon><Trophy /></el-icon>
                </div>
                <span>学习成就</span>
              </div>
              <el-icon class="expand-icon"><ArrowRight /></el-icon>
            </div>
          </template>

          <div class="achievement-grid">
            <div v-for="achievement in achievements" :key="achievement.label" class="achievement-item">
              <div class="achievement-icon" :style="{ background: achievement.bgColor }">
                {{ achievement.icon }}
              </div>
              <div class="achievement-info">
                <span class="achievement-value">{{ achievement.value }}</span>
                <span class="achievement-label">{{ achievement.label }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </aside>
    </div>
  </div>
</template>

<script>
import { planApi, taskApi, qaApi, userApi } from '../api'
import { removeToken } from '../utils/token'
import NotificationBell from '../components/NotificationBell.vue'

export default {
  name: 'Home',
  components: {
    NotificationBell
  },
  data() {
    return {
      searchKeyword: '',
      username: '',
      avatarUrl: '',
      todayTasks: [],
      selectedDate: new Date().toISOString().split('T')[0],
      weekCourses: [],
      currentDate: new Date(),
      selectedDateTasks: [],
      weekDays: ['日', '一', '二', '三', '四', '五', '六'],
      calendarDays: [],
      achievements: [],
      totalStats: {
        totalTime: 0,
        streakDays: 0,
        completedTasks: 0,
        totalPoints: 0
      },
      chatMessages: [
        {
          role: 'assistant',
          content: '你好！我是新芽AI学习助手 🤖\n\n我可以帮你：\n• 制定个性化学习计划\n• 分析学习进度和效果\n• 解答学习中的问题\n• 提供学习建议和技巧\n\n有什么可以帮你的吗？',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      ],
      showWeekProgress: false,
      showAchievements: false,
      weekProgressDetail: [],
      achievementsDetail: [],
      chatInput: '',
      recommendCards: [
        { icon: '📋', title: '制定学习计划', prompt: '帮我制定一个Python学习计划' },
        { icon: '💡', title: '学习建议', prompt: '给我一些学习建议' },
        { icon: '📊', title: '进度分析', prompt: '分析我的学习进度' }
      ],
      quickActions: [
        { icon: '📋', label: '制定计划', prompt: '帮我制定一个学习计划' },
        { icon: '💡', label: '学习建议', prompt: '给我一些学习建议' },
        { icon: '📊', label: '进度分析', prompt: '分析我的学习进度' }
      ],
      // 干预建议
      intervention: {
        show: false,
        level: '低风险',
        message: '',
        tagType: 'success',
        action: ''
      }
    }
  },
  computed: {
    filteredTasks() {
      if (!this.searchKeyword) return this.todayTasks
      const keyword = this.searchKeyword.toLowerCase()
      return this.todayTasks.filter(task =>
        task.name?.toLowerCase().includes(keyword) ||
        task.planName?.toLowerCase().includes(keyword)
      )
    },
    completedCount() {
      return this.filteredTasks.filter(t => t.status === 2).length
    },
    todayProgress() {
      if (this.filteredTasks.length === 0) return 0
      return Math.round((this.completedCount / this.filteredTasks.length) * 100)
    },
    progressColor() {
      if (this.todayProgress >= 80) return '#67C23A'
      if (this.todayProgress >= 50) return '#E6A23C'
      return '#409EFF'
    },
    currentYear() {
      return this.currentDate.getFullYear()
    },
    currentMonth() {
      return this.currentDate.getMonth()
    },
    currentMonthName() {
      const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
      return months[this.currentMonth]
    },
    formatSelectedDate() {
      if (!this.selectedDate) return ''
      const date = new Date(this.selectedDate)
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },
  mounted() {
    this.generateCalendar()
    this.fetchData()
    this.loadUserInfo()
  },
  methods: {
    loadUserInfo() {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      // 优先使用昵称，没有则用用户名
      this.username = user.nickname || user.username || '用户'
      // 加载头像URL，添加完整路径
      const avatarUrl = user.avatar_url || ''
      this.avatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:3000${avatarUrl}`) : ''
    },
    async fetchData() {
      try {
        const plansRes = await planApi.getPlans()
        const plans = plansRes.data || []

        const allTasks = []
        for (const plan of plans) {
          try {
            const tasksRes = await taskApi.getTasks(plan.id)
            const tasks = tasksRes.data || []
            allTasks.push(...tasks.map(t => ({ ...t, planName: plan.name })))
          } catch (e) {
            console.error('获取任务失败:', e)
          }
        }

        // 今日任务
        this.todayTasks = allTasks.filter(t => t.status !== 2).slice(0, 6)

        // 计算本周学习进度 (按计划分组)
        this.calculateWeekProgress(plans, allTasks)

        // 计算学习成就
        this.calculateAchievements(allTasks)

        // 更新日历任务
        this.updateCalendarTasks()

        // 选中日期的任务
        this.selectedDateTasks = allTasks.filter(t => {
          if (!t.deadline) return false
          return t.deadline.split('T')[0] === this.selectedDate
        })
      } catch (error) {
        console.error('获取数据失败:', error)
      }
    },
    calculateWeekProgress(plans, tasks) {
      // 按计划计算每个计划的完成进度
      const progressColors = ['#409EFF', '#E6A23C', '#67C23A', '#9B59B6', '#F56C6C']
      const icons = ['📚', '💻', '🗣️', '🎨', '📊']

      this.weekCourses = plans.map((plan, index) => {
        const planTasks = tasks.filter(t => t.plan_id === plan.id)
        const completed = planTasks.filter(t => t.status === 2).length
        const total = planTasks.length || 1
        const percent = Math.round((completed / total) * 100)

        return {
          name: plan.name || '学习计划',
          percent: percent,
          color: progressColors[index % progressColors.length],
          icon: icons[index % icons.length]
        }
      })

      // 生成本周进度详情（基于已完成任务）
      const completedTasks = tasks.filter(t => t.status === 2)
      const today = new Date()
      const weekDays = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        weekDays.push(date.toISOString().split('T')[0])
      }

      this.weekProgressDetail = weekDays.map((date, index) => {
        const dayTasks = completedTasks.filter(t => t.completed_at && t.completed_at.startsWith(date))
        const types = ['info', 'primary', 'success', 'warning']
        return {
          date: date,
          title: dayTasks.length > 0 ? `完成${dayTasks.length}个任务` : '暂无任务',
          description: dayTasks.length > 0 ? dayTasks.slice(0, 2).map(t => t.name).join('、') : '休息日',
          type: types[index % types.length]
        }
      })

      // 如果没有计划，显示默认数据
      if (this.weekCourses.length === 0) {
        this.weekCourses = [
          { name: '暂无学习计划', percent: 0, color: '#909399', icon: '📚' }
        ]
        this.weekProgressDetail = []
      }
    },
    calculateAchievements(tasks) {
      const completedTasks = tasks.filter(t => t.status === 2)
      const totalTime = tasks.reduce((sum, t) => sum + (t.actual_time || 0), 0)

      // 计算学习时长（小时）
      const hours = Math.round(totalTime / 60 * 10) / 10

      // 计算连续学习天数（基于完成任务的时间）
      const uniqueDays = new Set()
      completedTasks.forEach(t => {
        if (t.completed_at) {
          uniqueDays.add(t.completed_at.split('T')[0])
        }
      })
      const streakDays = uniqueDays.size || 1

      // 计算学习积分（每完成一个任务+10分）
      const totalPoints = completedTasks.length * 10

      this.totalStats = {
        totalTime: hours,
        streakDays: streakDays,
        completedTasks: completedTasks.length,
        totalPoints: totalPoints
      }

      this.achievements = [
        {
          icon: '⏱️',
          value: `${hours}小时`,
          label: '学习时长',
          bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)'
        },
        {
          icon: '🔥',
          value: `${streakDays}天`,
          label: '连续学习',
          bgColor: 'linear-gradient(135deg, #ff6b6b, #ffa500)'
        },
        {
          icon: '✓',
          value: `${completedTasks.length}个`,
          label: '完成任务',
          bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)'
        },
        {
          icon: '⭐',
          value: `${totalPoints}分`,
          label: '学习积分',
          bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)'
        }
      ]

      // 成就详情（弹窗用）
      this.achievementsDetail = [
        { icon: '🔥', value: `${streakDays}天`, label: '连续学习', bgColor: 'linear-gradient(135deg, #ff6b6b, #ffa500)' },
        { icon: '⏱️', value: `${hours}小时`, label: '总学习时长', bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)' },
        { icon: '✓', value: `${completedTasks.length}个`, label: '完成任务', bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)' },
        { icon: '⭐', value: `${totalPoints}分`, label: '学习积分', bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)' },
        { icon: '🎯', value: `${Math.floor(completedTasks.length / 5)}个`, label: '达成目标', bgColor: 'linear-gradient(135deg, #E6A23C, #F0C78A)' },
        { icon: '🏆', value: `${Math.floor(completedTasks.length / 10)}个`, label: '获得成就', bgColor: 'linear-gradient(135deg, #F56C6C, #F89898)' }
      ]

      // 如果没有任务，显示默认数据
      if (tasks.length === 0) {
        this.achievements = [
          { icon: '⏱️', value: '0小时', label: '学习时长', bgColor: 'linear-gradient(135deg, #409EFF, #67C23A)' },
          { icon: '🔥', value: '0天', label: '连续学习', bgColor: 'linear-gradient(135deg, #ff6b6b, #ffa500)' },
          { icon: '✓', value: '0个', label: '完成任务', bgColor: 'linear-gradient(135deg, #67C23A, #85CE61)' },
          { icon: '⭐', value: '0分', label: '学习积分', bgColor: 'linear-gradient(135deg, #9B59B6, #C39BD3)' }
        ]
      }
    },
    updateCalendarTasks() {
      this.calendarDays.forEach(day => {
        if (day.isCurrentMonth) {
          day.hasTask = Math.random() > 0.4
          day.completed = Math.random() > 0.6
        }
      })
    },
    selectDate(day) {
      this.selectedDate = day.fullDate
      // 从所有任务中筛选选中日期的任务
      this.selectedDateTasks = this.getTasksForDate()
    },
    getTasksForDate() {
      // 这里可以从后端获取指定日期的任务
      // 暂时使用模拟数据
      if (Math.random() > 0.5) {
        return [
          { id: 1, name: 'Python基础语法', status: 0 },
          { id: 2, name: '数据结构练习', status: 0 }
        ]
      }
      return []
    },
    generateCalendar() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const today = new Date()

      const days = []

      // 上月天数
      const prevMonthDays = new Date(year, month, 0).getDate()
      const prevMonth = month === 0 ? 12 : month
      const prevMonthYear = month === 0 ? year - 1 : year
      for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevMonthDays - i
        days.push({
          date: d,
          fullDate: `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          currentMonth: false,
          isToday: false,
          hasTask: Math.random() > 0.7
        })
      }

      // 当月天数
      for (let i = 1; i <= daysInMonth; i++) {
        const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        days.push({
          date: i,
          fullDate: fullDate,
          currentMonth: true,
          isToday: i === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
          hasTask: [3, 5, 8, 12, 15, 20, 25].includes(i)
        })
      }

      // 下月天数补齐
      const remaining = 42 - days.length
      const nextMonth = month === 11 ? 1 : month + 2
      const nextMonthYear = month === 11 ? year + 1 : year
      for (let i = 1; i <= remaining; i++) {
        days.push({
          date: i,
          fullDate: `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
          currentMonth: false,
          isToday: false,
          hasTask: Math.random() > 0.7
        })
      }

      this.calendarDays = days
    },
    prevMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
      this.generateCalendar()
    },
    nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
      this.generateCalendar()
    },
    getDifficultyType(difficulty) {
      const types = { 1: 'success', 2: 'warning', 3: 'danger' }
      return types[difficulty] || 'info'
    },
    getDifficultyText(difficulty) {
      const texts = { 1: '简单', 2: '中等', 3: '困难' }
      return texts[difficulty] || '简单'
    },
    async handleTaskComplete(task) {
      try {
        await taskApi.completeTask(task.id, {
          actualTime: task.estimated_time || 60,
          qualityScore: 85
        })
        this.$message.success('任务完成！')
        this.fetchData()
      } catch (error) {
        this.$message.error('操作失败')
      }
    },
    async startTask(task) {
      try {
        await taskApi.startTask(task.id)
        this.$message.success('开始学习！')
        this.fetchData()
      } catch (error) {
        this.$message.error('操作失败')
      }
    },
    sendQuickMessage(prompt) {
      this.chatInput = prompt
      this.sendMessage()
    },
    sendMessage() {
      if (!this.chatInput.trim()) return

      const userMsg = {
        role: 'user',
        content: this.chatInput,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      this.chatMessages.push(userMsg)

      const input = this.chatInput
      this.chatInput = ''

      // 滚动到底部
      this.$nextTick(() => {
        const container = this.$refs.chatContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })

      // 调用后端API获取AI回复
      qaApi.ask(null, input)
        .then(res => {
          const responseText = res.data?.answer || '抱歉，我无法回答这个问题。'
          this.chatMessages.push({
            role: 'assistant',
            content: responseText,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          })
          this.$nextTick(() => {
            if (this.$refs.chatContainer) {
              this.$refs.chatContainer.scrollTop = this.$refs.chatContainer.scrollHeight
            }
          })
        })
        .catch(error => {
          console.error('AI回复失败:', error)
          // 显示更详细的错误信息
          const errMsg = error.response?.data?.message || error.message || '未知错误'
          this.chatMessages.push({
            role: 'assistant',
            content: `抱歉，发生了错误: ${errMsg}。请确保已登录后重试。`,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          })
        })
    },
    clearChat() {
      this.chatMessages = [
        {
          role: 'assistant',
          content: '对话已清空，有什么可以帮你的？',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    },
    goToDashboard() {
      this.$router.push('/dashboard')
    },
    goToHome() {
      this.$router.push('/home')
    },
    goToPlans() {
      this.$router.push('/plans')
    },
    goToCourseEditor() {
      this.$router.push('/course-editor')
    },
    doSearch() {
      const keyword = this.searchKeyword?.trim() || ''
      this.$forceUpdate()
    },
    goToAnalysis() {
      this.$router.push('/analysis')
    },
    goToDataCenter() {
      this.$router.push('/data-center')
    },
    goToStudyStats() {
      this.$router.push('/study-stats')
    },
    goToBadgeWall() {
      this.$router.push('/badge-wall')
    },
    goToNotifications() {
      this.$router.push('/notifications')
    },
    handleTaskCommand(command) {
      const routes = {
        'ddl': '/tasks/ddl',
        'exams': '/tasks/exams'
      }
      this.$router.push(routes[command] || '/home')
    },
    // 显示干预建议
    showIntervention(data) {
      if (!data) return

      const level = data.level || '低风险'
      const levelMap = {
        '高风险': { tagType: 'danger', levelText: '高风险' },
        '中风险': { tagType: 'warning', levelText: '中风险' },
        '低风险': { tagType: 'success', levelText: '良好' }
      }

      const map = levelMap[level] || levelMap['低风险']

      this.intervention = {
        show: true,
        level: map.levelText,
        message: data.message || data.suggestions?.[0] || '你的学习状态很棒！',
        tagType: map.tagType,
        action: data.action || ''
      }
    },
    // 采纳建议
    adoptIntervention() {
      if (this.intervention.action === 'replan') {
        this.$router.push('/plans')
      } else if (this.intervention.action === 'dataCenter') {
        this.$router.push('/data-center')
      } else {
        this.$message.success('已采纳建议')
      }
      this.dismissIntervention()
    },
    // 关闭建议
    dismissIntervention() {
      this.intervention.show = false
    },
    handleLogout() {
      removeToken()
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
/* 全局样式 */
.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%);
}

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  flex: 0 0 auto;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #409EFF, #67C23A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  max-width: 700px;
}

.search-wrapper {
  flex: 1;
  max-width: 320px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px 0 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-btn {
  border-radius: 0 20px 20px 0;
  background: #409EFF;
  border-color: #409EFF;
  color: #fff;
}

.search-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-btn {
  font-size: 14px;
  color: #606266;
}

.nav-btn:hover {
  color: #409EFF;
}

.header-right {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 24px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f7fa;
}

.avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 14px;
}

.username {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  display: grid;
  grid-template-columns: 300px 1fr 380px;
  gap: 20px;
  padding: 20px 32px;
  max-width: 1600px;
  margin: 0 auto;
}

/* 干预建议卡片 */
.intervention-card {
  grid-column: 1 / -1;
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.3s;
}

.intervention-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.intervention-card.intervention-高风险,
.intervention-danger {
  border-color: #F56C6C;
  background: linear-gradient(135deg, #FEF0F0, #FFF5F5);
}

.intervention-card.intervention-中风险,
.intervention-warning {
  border-color: #E6A23C;
  background: linear-gradient(135deg, #FDF6EC, #FFFAF0);
}

.intervention-card.intervention-低风险,
.intervention-良好 {
  border-color: #67C23A;
  background: linear-gradient(135deg, #F0F9EB, #F5FFF0);
}

.intervention-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.intervention-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 600;
}

.intervention-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.intervention-title .title-text {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.dismiss-btn {
  color: #909399;
}

.intervention-content {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  margin-bottom: 12px;
}

.intervention-content p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.intervention-actions {
  display: flex;
  gap: 10px;
}

.intervention-actions .el-button {
  border-radius: 20px;
}

/* 卡片通用样式 */
:deep(.el-card) {
  border: none;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

:deep(.el-card:hover) {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f5f7fa;
}

:deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expand-icon {
  color: #909399;
  font-size: 14px;
  transition: transform 0.3s;
}

.progress-card:hover .expand-icon,
.achievement-card:hover .expand-icon {
  transform: translateX(4px);
  color: #409EFF;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.title-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409EFF, #67C23A);
  border-radius: 10px;
  color: #fff;
}

.title-icon.orange {
  background: linear-gradient(135deg, #E6A23C, #F56C6C);
}

.title-icon.green {
  background: linear-gradient(135deg, #67C23A, #409EFF);
}

.title-icon.purple {
  background: linear-gradient(135deg, #9B59B6, #E1BEE7);
}

/* 左侧栏 */
.left-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 任务卡片 */
.task-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.today-progress {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f5f7fa;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.progress-value {
  font-weight: 600;
  color: #409EFF;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s;
}

.task-item:hover {
  background: #f5f7fa;
}

.task-item.active {
  background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
  border: 1px solid #409EFF;
}

.task-item.completed {
  opacity: 0.6;
}

.task-checkbox :deep(.el-checkbox__inner) {
  border-radius: 50%;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-name {
  display: block;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item.completed .task-name {
  text-decoration: line-through;
  color: #909399;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.start-btn {
  border-radius: 16px;
}

.empty-tip {
  text-align: center;
  padding: 30px 20px;
  color: #67C23A;
}

.empty-tip .el-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-tip p {
  margin: 0;
  font-size: 14px;
}

/* 进度卡片 */
.progress-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.week-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.course-icon {
  font-size: 16px;
}

.course-name {
  font-size: 13px;
  color: #606266;
}

.course-percent {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

/* 中间栏 */
.center-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* AI助手卡片 */
.ai-card {
  height: calc(100vh - 104px);
  display: flex;
  flex-direction: column;
}

/* 日历卡片 */
.calendar-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-month {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  min-width: 80px;
  text-align: center;
}

.calendar {
  margin-top: 8px;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.week-day {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.calendar-day:hover {
  background: #f5f7fa;
}

.calendar-day.other-month {
  color: #dcdfe6;
}

.calendar-day.today {
  background: linear-gradient(135deg, #409EFF, #67C23A);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.calendar-day.selected {
  border: 2px solid #409EFF;
}

.task-indicator {
  position: absolute;
  bottom: 4px;
}

.task-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #409EFF;
}

.task-dot.completed {
  background: #67C23A;
}

.calendar-day.today .task-dot {
  background: #fff;
}

/* 选中日期任务 */
.selected-tasks {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f7fa;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.date-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 13px;
  color: #606266;
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.active {
  background: #409EFF;
}

.legend-dot.pending {
  background: #E6A23C;
}

.legend-dot.done {
  background: #67C23A;
}

/* 成就卡片 */
.achievement-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.week-progress-detail {
  padding: 10px 0;
}

.timeline-content {
  padding: 8px 0;
}

.timeline-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.timeline-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.achievements-detail {
  padding: 10px 0;
}

.achievement-detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.achievement-detail-item .detail-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.achievement-detail-item .detail-info {
  flex: 1;
}

.achievement-detail-item .detail-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.achievement-detail-item .detail-label {
  font-size: 13px;
  color: #909399;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s;
}

.achievement-item:hover {
  transform: scale(1.02);
}

.achievement-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
}

.achievement-info {
  display: flex;
  flex-direction: column;
}

.achievement-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.achievement-label {
  font-size: 12px;
  color: #909399;
}

/* 右侧栏 */
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-header {
  padding-bottom: 12px;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.ai-title {
  display: flex;
  flex-direction: column;
}

.ai-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #67C23A;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67C23A;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.clear-btn {
  color: #909399;
}

/* 推荐卡片 */
.recommend-section {
  padding: 12px 0;
  border-bottom: 1px solid #f5f7fa;
  margin-bottom: 12px;
}

.recommend-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
}

.recommend-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommend-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f5f7fa, #fff);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.recommend-card:hover {
  background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
  border-color: #409EFF;
  transform: translateX(4px);
}

.card-icon {
  font-size: 18px;
}

.card-title {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

/* 对话区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  max-height: 400px;
}

.message {
  display: flex;
  gap: 10px;
}

.message.assistant {
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  font-size: 11px;
}

.message-avatar.ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-avatar.user {
  background: linear-gradient(135deg, #409EFF, #67C23A);
}

.message-content {
  max-width: 85%;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-bubble p {
  margin: 0 0 4px;
}

.message-bubble p:last-child {
  margin-bottom: 0;
}

.message.assistant .message-bubble {
  background: #f5f7fa;
  color: #303133;
  border-bottom-left-radius: 4px;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #409EFF, #67C23A);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #c0c4cc;
  margin-top: 4px;
  display: block;
}

.message.user .message-time {
  text-align: right;
}

/* 快捷功能 */
.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid #f5f7fa;
  margin-top: auto;
}

.quick-btn {
  border-radius: 16px;
  background: #f5f7fa;
  border: none;
}

/* 输入区域 */
.chat-input {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
  margin-top: auto;
}

.input-field :deep(.el-input__wrapper) {
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.send-btn {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  padding: 0;
}

/* 动画 */
.task-enter-active,
.task-leave-active {
  transition: all 0.3s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.message-enter-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

/* 响应式 */
@media (max-width: 1400px) {
  .main-content {
    grid-template-columns: 280px 1fr 340px;
    padding: 16px 24px;
  }
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }

  .right-sidebar {
    grid-column: span 2;
  }

  .ai-card {
    height: 500px;
  }

  .calendar-card {
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    padding: 12px 16px;
  }

  .right-sidebar {
    grid-column: span 1;
  }

  .ai-card {
    height: 400px;
  }

  .header {
    padding: 12px 16px;
  }

  .header-center {
    display: none;
  }

  .username {
    display: none;
  }
}
</style>
