import { defineStore } from 'pinia'
import { studySessionApi, taskApi } from '../api'
import router from '../router'

export const useTimerStore = defineStore('timer', {
  state: () => ({
    isRunning: false,
    isPaused: false,
    taskId: null,
    taskName: '',
    courseName: '',
    planId: null,
    startTime: null,
    elapsedSeconds: 0,
    sessionId: null,
    showCard: false,
    timer: null,
    needRefresh: false
  }),

  getters: {
    formattedTime: (state) => {
      const hours = Math.floor(state.elapsedSeconds / 3600)
      const minutes = Math.floor((state.elapsedSeconds % 3600) / 60)
      const seconds = state.elapsedSeconds % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    },

    currentTask: (state) => {
      return {
        id: state.taskId,
        name: state.taskName,
        courseName: state.courseName,
        planId: state.planId
      }
    }
  },

  actions: {
    async startTimer(task, initialElapsedSeconds = 0) {
      console.log('startTimer called with task:', JSON.stringify(task, null, 2))
      
      const taskId = Number(task?.id)
      
      if (this.isRunning && this.taskId !== taskId) {
        return { success: false, message: '请先结束当前任务' }
      }

      if (!task || !task.id) {
        console.error('任务数据无效:', task)
        return { success: false, message: '任务数据无效，缺少任务ID' }
      }

      if (this.isRunning && this.taskId === taskId) {
        if (this.isPaused) {
          this.isPaused = false
          this.startTicking()
          this.updatePageTitle()
        }
        return { success: true }
      }

      try {
        const payload = {
          taskId: taskId,
          taskName: task.name,
          courseName: task.courseName || '',
          planId: task.planId || null
        }
        console.log('Sending payload:', JSON.stringify(payload, null, 2))
        
        const res = await studySessionApi.start(payload)
        console.log('API response:', res)

        if (res.code === 200 || res.success) {
          this.isRunning = true
          this.isPaused = false
          this.taskId = taskId
          this.taskName = task.name
          this.courseName = task.courseName || ''
          this.planId = task.planId || null
          this.startTime = new Date().toISOString()
          this.elapsedSeconds = initialElapsedSeconds
          this.sessionId = res.data?.sessionId || res.data?.id
          this.showCard = true

          this.startTicking()
          this.updatePageTitle()

          return { success: true }
        }

        return { success: false, message: res.message || '开始计时失败' }
      } catch (error) {
        console.error('开始计时失败:', error)
        return { success: false, message: error.message || '开始计时失败' }
      }
    },

    pauseTimer() {
      if (!this.isRunning || this.isPaused) return

      this.isPaused = true
      this.stopTicking()
      this.updatePageTitle()
    },

    async pauseTimerWithSave() {
      if (!this.isRunning || this.isPaused) return

      const currentElapsedSeconds = this.elapsedSeconds
      this.stopTicking()

      if (this.taskId) {
        try {
          await taskApi.pauseTask(this.taskId, currentElapsedSeconds)
          console.log('暂停任务已保存, 已用时:', currentElapsedSeconds, '秒')
        } catch (error) {
          console.error('保存暂停状态失败:', error)
        }
      }

      this.isPaused = true
      this.updatePageTitle()
      this.needRefresh = true
    },

    resumeTimer() {
      if (!this.isRunning || !this.isPaused) return

      this.isPaused = false
      this.startTicking()
      this.updatePageTitle()
    },

    async resumeTimerWithSave() {
      if (!this.isRunning || !this.isPaused) return

      if (this.taskId) {
        try {
          await taskApi.resumeTask(this.taskId)
          console.log('恢复任务已保存')
        } catch (error) {
          console.error('保存恢复状态失败:', error)
        }
      }

      this.isPaused = false
      this.startTicking()
      this.updatePageTitle()
      this.needRefresh = true
    },

    async stopTimer() {
      if (!this.isRunning) return

      try {
        const actualMinutes = Math.ceil(this.elapsedSeconds / 60)

        await studySessionApi.stop({
          sessionId: this.sessionId,
          actualMinutes
        })
      } catch (error) {
        console.error('保存学习记录失败:', error)
      }

      this.resetTimer()
      this.resetPageTitle()
      this.needRefresh = true
    },

    startTicking() {
      if (this.timer) {
        clearInterval(this.timer)
      }

      this.timer = setInterval(() => {
        this.elapsedSeconds++
        this.updatePageTitle()
      }, 1000)
    },

    stopTicking() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    resetTimer() {
      this.stopTicking()
      this.isRunning = false
      this.isPaused = false
      this.taskId = null
      this.taskName = ''
      this.courseName = ''
      this.planId = null
      this.startTime = null
      this.elapsedSeconds = 0
      this.sessionId = null
      this.showCard = false
    },

    locateTask() {
      if (this.planId) {
        router.push(`/plan/${this.planId}?taskId=${this.taskId}`)
      }
    },

    updatePageTitle() {
      if (this.isRunning && !this.isPaused) {
        document.title = `[${this.formattedTime}] 新芽学习规划系统`
      } else if (this.isPaused) {
        document.title = `[⏸ ${this.formattedTime}] 新芽学习规划系统`
      }
    },

    resetPageTitle() {
      document.title = '新芽学习规划系统'
    },

    async checkActiveSession() {
      try {
        const res = await studySessionApi.getActive()

        if (res.code === 200 && res.data) {
          const session = res.data

          this.isRunning = true
          this.isPaused = session.status === 'paused'
          this.taskId = session.taskId
          this.taskName = session.taskName || ''
          this.courseName = session.courseName || ''
          this.planId = session.planId
          this.startTime = session.startTime
          this.sessionId = session.id
          this.showCard = true

          if (session.elapsedSeconds) {
            this.elapsedSeconds = session.elapsedSeconds
          } else if (session.startTime) {
            const startTime = new Date(session.startTime)
            const now = new Date()
            this.elapsedSeconds = Math.floor((now - startTime) / 1000)
          }

          if (!this.isPaused) {
            this.startTicking()
          }
          this.updatePageTitle()
        }
      } catch (error) {
        console.error('检查活跃会话失败:', error)
      }
    }
  }
})
