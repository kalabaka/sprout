<template>
  <div class="course-editor-container">
    <div class="header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1>课表管理</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          Excel导入
        </el-button>
        <el-button type="success" @click="showAddCourseDialog">
          <el-icon><Plus /></el-icon>
          添加课程
        </el-button>
        <el-dropdown trigger="click" @command="handleMoreAction">
          <el-button>
            更多操作
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="clear" style="color: #F56C6C;">
                <el-icon><Delete /></el-icon>
                清空课表
              </el-dropdown-item>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>
                导出课表
              </el-dropdown-item>
              <el-dropdown-item command="print">
                <el-icon><Printer /></el-icon>
                打印课表
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-card class="semester-select-card" shadow="hover">
      <div class="semester-select">
        <span class="label">当前学期：</span>
        <el-select v-model="selectedSemesterId" placeholder="请选择学期" @change="loadSchedule">
          <el-option
            v-for="semester in semesters"
            :key="semester.id"
            :label="semester.name"
            :value="semester.id"
          />
        </el-select>
        <el-button text type="primary" @click="showSemesterDialog = true">
          管理学期
        </el-button>
        <div class="batch-actions" v-if="selectedSchedules.length > 0">
          <span class="selected-count">已选 {{ selectedSchedules.length }} 个时间安排</span>
          <el-button type="danger" size="small" @click="batchDeleteCourses">
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="schedule-card" shadow="hover">
      <div class="schedule-table">
        <div class="schedule-header">
          <div class="time-column">时间</div>
          <div v-for="day in weekDays" :key="day.value" class="day-column">
            {{ day.label }}
          </div>
        </div>

        <div class="schedule-body">
          <div v-for="timeSlot in timeSlots" :key="timeSlot.id" class="schedule-row">
            <div class="time-cell" @click="editTimeSlot(timeSlot)">
              <div class="time-label">{{ timeSlot.label }}</div>
              <div class="time-range">{{ timeSlot.range }}</div>
              <el-icon class="time-edit-icon"><Edit /></el-icon>
            </div>
            <div
              v-for="day in weekDays"
              :key="day.value"
              class="schedule-cell"
              @click="handleCellClick(day.value, timeSlot)"
            >
              <div
              v-for="course in getCellCourses(day.value, timeSlot)"
              :key="course.scheduleId"
              class="course-card"
              :class="{ 'selected': isScheduleSelected(course.scheduleId) }"
              :style="{ backgroundColor: course.color }"
              @click.stop="editCourse(course)"
            >
              <div class="course-checkbox" @click.stop="toggleScheduleSelection(course.scheduleId)">
                <el-checkbox :model-value="isScheduleSelected(course.scheduleId)" />
              </div>
              <div class="course-name">{{ course.name }}</div>
              <div class="course-info">{{ course.classroom }}</div>
              <div class="course-weeks">{{ course.startWeek }}-{{ course.endWeek }}周</div>
              <div class="course-actions">
                <el-button
                  text
                  size="small"
                  @click.stop="deleteCourse(course)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="showCourseDialog" :title="isEditing ? '编辑课程' : '添加课程'" width="500px">
      <el-form :model="courseForm" :rules="courseRules" ref="courseFormRef" label-width="100px">
        <el-form-item label="课程名称" prop="name">
          <el-input v-model="courseForm.name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="授课教师" prop="teacher">
          <el-input v-model="courseForm.teacher" placeholder="请输入授课教师" />
        </el-form-item>
        <el-form-item label="上课地点" prop="classroom">
          <el-input v-model="courseForm.classroom" placeholder="请输入上课地点" />
        </el-form-item>
        <el-form-item label="课程颜色" prop="color">
          <el-color-picker v-model="courseForm.color" />
        </el-form-item>
        <div class="form-row">
          <div class="form-label">上课时间</div>
          <el-row :gutter="10">
            <el-col :span="12">
              <el-form-item prop="dayOfWeek">
                <el-select v-model="courseForm.dayOfWeek" placeholder="星期">
                  <el-option
                    v-for="day in weekDays"
                    :key="day.value"
                    :label="day.label"
                    :value="day.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item prop="timeSlot">
                <el-select v-model="courseForm.timeSlot" placeholder="节次">
                  <el-option
                    v-for="slot in timeSlots"
                    :key="slot.id"
                    :label="slot.label"
                    :value="slot.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <el-form-item label="周次类型" prop="weekType">
          <el-radio-group v-model="courseForm.weekType">
            <el-radio value="every">每周</el-radio>
            <el-radio value="odd">单周</el-radio>
            <el-radio value="even">双周</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="起止周">
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="12">
              <el-input-number v-model="courseForm.startWeek" :min="1" :max="25" style="width: 100%" />
            </el-col>
            <el-col :span="12">
              <el-input-number v-model="courseForm.endWeek" :min="1" :max="25" style="width: 100%" />
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCourseDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCourse">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showImportDialog" title="Excel导入课表" width="600px">
      <div class="import-content">
        <el-form label-width="80px">
          <el-form-item label="选择学期" required>
            <el-select v-model="importSemesterId" placeholder="请选择要导入的学期" style="width: 100%">
              <el-option
                v-for="semester in semesters"
                :key="semester.id"
                :label="semester.name"
                :value="semester.id"
              />
            </el-select>
            <div v-if="semesters.length === 0" class="no-semester-tip">
              <el-text type="warning">暂无学期，请先点击"管理学期"创建学期</el-text>
            </div>
          </el-form-item>
        </el-form>

        <el-alert
          title="导入说明"
          type="info"
          :closable="false"
          class="import-tip"
        >
          <p>支持格式：</p>
          <ul>
            <li>第一列为时间段（如：上午/下午/晚上）</li>
            <li>第二列为节次（如：12节、34节）</li>
            <li>第3-9列分别为周一至周日</li>
            <li>课程信息格式：课程名(节次)</li>
          </ul>
        </el-alert>

        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          drag
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将Excel文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传xlsx/xls文件，且不超过5MB
            </div>
          </template>
        </el-upload>

        <div v-if="previewData.length > 0" class="preview-section">
          <h4>预览数据 (共{{ previewTotal }}门课程)</h4>
          <el-table 
            :data="previewData" 
            row-key="tempId"
            max-height="400" 
            border 
            stripe
          >
            <el-table-column prop="name" label="课程名称" width="160" />
            <el-table-column prop="teacher" label="教师" width="100" />
            <el-table-column prop="classroom" label="教室" width="160" />
            <el-table-column label="周次" width="90">
              <template #default="{ row }">
                {{ row.weeksDisplay || '全学期' }}
              </template>
            </el-table-column>
            <el-table-column label="星期" width="70">
              <template #default="{ row }">
                周{{ ['一','二','三','四','五','六','日'][row.dayOfWeek-1] }}
              </template>
            </el-table-column>
            <el-table-column label="时间" width="110">
              <template #default="{ row }">
                {{ row.startTime }}-{{ row.endTime }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :disabled="previewData.length === 0 || !importSemesterId">
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSemesterDialog" title="学期管理" width="800px">
      <div class="semester-management">
        <el-button type="primary" @click="openAddSemesterDialog" class="add-semester-btn">
          <el-icon><Plus /></el-icon>
          添加学期
        </el-button>

        <el-table :data="semesters" style="width: 100%">
          <el-table-column prop="name" label="学期名称" />
          <el-table-column label="起止日期">
            <template #default="{ row }">
              {{ row.start_date }} 至 {{ row.end_date }}
            </template>
          </el-table-column>
          <el-table-column prop="total_weeks" label="总周数" />
          <el-table-column label="当前学期">
            <template #default="{ row }">
              <el-tag v-if="row.is_current" type="success">是</el-tag>
              <el-tag v-else type="info">否</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button
                text
                type="primary"
                @click="setCurrentSemester(row)"
                :disabled="!!row.is_current"
              >
                设为当前
              </el-button>
              <el-button text type="primary" @click="editSemester(row)">
                编辑
              </el-button>
              <el-button text type="danger" @click="deleteSemester(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="showAddSemesterDialog" :title="isEditingSemester ? '编辑学期' : '添加学期'" width="500px">
      <el-form :model="semesterForm" :rules="semesterRules" ref="semesterFormRef" label-width="100px">
        <el-form-item label="学期名称" prop="name">
          <el-input v-model="semesterForm.name" placeholder="如：2025-2026第二学期" />
        </el-form-item>
        <el-form-item label="开学日期" prop="start_date">
          <el-date-picker
            v-model="semesterForm.start_date"
            type="date"
            placeholder="选择开学日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker
            v-model="semesterForm.end_date"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="总周数" prop="total_weeks">
          <el-input-number v-model="semesterForm.total_weeks" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="设为当前">
          <el-switch v-model="semesterForm.is_current" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddSemesterDialog = false">取消</el-button>
        <el-button type="primary" @click="submitSemester">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTimeSlotDialog" title="时间段设置" width="600px">
      <div class="time-slot-settings">
        <p class="settings-tip">设置每节课的时间段，修改后将在课表中生效</p>
        <el-table :data="timeSlotForm" style="width: 100%">
          <el-table-column prop="label" label="节次名称" width="120">
            <template #default="{ row }">
              <el-input v-model="row.label" placeholder="如：第1-2节" />
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="140">
            <template #default="{ row }">
              <el-time-select
                v-model="row.start_time"
                :max-time="row.end_time"
                placeholder="开始时间"
                start="06:00"
                step="00:05"
                end="23:00"
              />
            </template>
          </el-table-column>
          <el-table-column label="结束时间" width="140">
            <template #default="{ row }">
              <el-time-select
                v-model="row.end_time"
                :min-time="row.start_time"
                placeholder="结束时间"
                start="06:00"
                step="00:05"
                end="23:00"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ $index }">
              <el-button
                text
                type="danger"
                @click="removeTimeSlot($index)"
                :disabled="timeSlotForm.length <= 1"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" text @click="addTimeSlot" style="margin-top: 10px">
          <el-icon><Plus /></el-icon>
          添加时间段
        </el-button>
      </div>
      <template #footer>
        <el-button @click="resetTimeSlots">恢复默认</el-button>
        <el-button @click="showTimeSlotDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTimeSlots">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { courseApi, semesterApi, timeSlotApi } from '../api'

const router = useRouter()

const weekDays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
]

const defaultTimeSlots = [
  { id: 1, label: '第1-2节', range: '08:00-09:40' },
  { id: 2, label: '第3-4节', range: '10:00-11:40' },
  { id: 3, label: '第5-6节', range: '14:00-15:40' },
  { id: 4, label: '第7-8节', range: '16:00-17:40' },
  { id: 5, label: '第9-10节', range: '19:00-20:40' }
]

const timeSlots = ref([...defaultTimeSlots])
const showTimeSlotDialog = ref(false)
const timeSlotForm = ref([])

const semesters = ref([])
const selectedSemesterId = ref(null)
const importSemesterId = ref(null)
const scheduleData = ref([])
const selectedSchedules = ref([])

const showCourseDialog = ref(false)
const showImportDialog = ref(false)
const showSemesterDialog = ref(false)
const showAddSemesterDialog = ref(false)

const isEditing = ref(false)
const isEditingSemester = ref(false)

const courseFormRef = ref(null)
const semesterFormRef = ref(null)
const uploadRef = ref(null)

const courseForm = reactive({
  id: null,
  name: '',
  teacher: '',
  classroom: '',
  color: '#409EFF',
  dayOfWeek: 1,
  timeSlot: 1,
  weekType: 'every',
  startWeek: 1,
  endWeek: 20,
  scheduleId: null
})

const semesterForm = reactive({
  id: null,
  name: '',
  start_date: '',
  end_date: '',
  total_weeks: 20,
  is_current: false
})

const previewData = ref([])
const previewTotal = ref(0)
const uploadedFile = ref(null)

const courseRules = {
  name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  dayOfWeek: [{ required: true, message: '请选择星期', trigger: 'change' }],
  timeSlot: [{ required: true, message: '请选择节次', trigger: 'change' }]
}

const semesterRules = {
  name: [{ required: true, message: '请输入学期名称', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开学日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  total_weeks: [{ required: true, message: '请输入总周数', trigger: 'blur' }]
}

const loadSemesters = async () => {
  try {
    const res = await semesterApi.getAll()
    if (res.code === 200) {
      semesters.value = res.data || []
      const current = semesters.value.find(s => s.is_current)
      if (current) {
        selectedSemesterId.value = current.id
        await loadSchedule()
      }
    }
  } catch (error) {
    console.error('加载学期失败:', error)
  }
}

const loadSchedule = async () => {
  if (!selectedSemesterId.value) return

  try {
    const res = await courseApi.getAll(selectedSemesterId.value)
    if (res.code === 200) {
      scheduleData.value = res.data || []
    }
  } catch (error) {
    console.error('加载课表失败:', error)
  }
}

const getCellCourses = (dayOfWeek, timeSlot) => {
  const courses = []
  
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null
    const time = String(timeStr).trim()
    const match = time.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    return parseInt(match[1]) * 60 + parseInt(match[2])
  }
  
  const slotTimeRange = {
    1: { start: 8 * 60, end: 9 * 60 + 40 },
    2: { start: 10 * 60, end: 11 * 60 + 40 },
    3: { start: 14 * 60, end: 15 * 60 + 40 },
    4: { start: 16 * 60, end: 17 * 60 + 40 },
    5: { start: 19 * 60, end: 20 * 60 + 40 }
  }
  
  const slotRange = slotTimeRange[timeSlot.id]
  if (!slotRange) return courses
  
  scheduleData.value.forEach(course => {
    if (course.schedules && course.schedules.length > 0) {
      course.schedules.forEach(schedule => {
        if (schedule.day_of_week === dayOfWeek) {
          const courseStart = timeToMinutes(schedule.start_time)
          const courseEnd = timeToMinutes(schedule.end_time)
          
          if (courseStart !== null && courseEnd !== null) {
            if (courseStart < slotRange.end && courseEnd > slotRange.start) {
              courses.push({
                ...course,
                scheduleId: schedule.id,
                dayOfWeek: schedule.day_of_week,
                startTime: schedule.start_time,
                endTime: schedule.end_time,
                weekType: schedule.week_type,
                startWeek: course.start_week,
                endWeek: course.end_week
              })
            }
          }
        }
      })
    }
  })
  return courses
}

const handleCellClick = (dayOfWeek, timeSlot) => {
  isEditing.value = false
  resetCourseForm()
  courseForm.dayOfWeek = dayOfWeek
  courseForm.timeSlot = timeSlot.id
  showCourseDialog.value = true
}

const showAddCourseDialog = () => {
  isEditing.value = false
  resetCourseForm()
  showCourseDialog.value = true
}

const resetCourseForm = () => {
  courseForm.id = null
  courseForm.name = ''
  courseForm.teacher = ''
  courseForm.classroom = ''
  courseForm.color = '#409EFF'
  courseForm.dayOfWeek = 1
  courseForm.timeSlot = 1
  courseForm.weekType = 'every'
  courseForm.startWeek = 1
  courseForm.endWeek = 20
  courseForm.scheduleId = null
}

const editCourse = (course) => {
  isEditing.value = true
  courseForm.id = course.id
  courseForm.name = course.name
  courseForm.teacher = course.teacher
  courseForm.classroom = course.classroom
  courseForm.color = course.color
  courseForm.dayOfWeek = course.dayOfWeek
  
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null
    const time = String(timeStr).trim()
    const match = time.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    return parseInt(match[1]) * 60 + parseInt(match[2])
  }
  
  const courseStart = timeToMinutes(course.startTime)
  const courseEnd = timeToMinutes(course.endTime)
  
  courseForm.timeSlot = timeSlots.value.find(s => {
    const [start, end] = s.range.split('-')
    const slotStart = timeToMinutes(start)
    const slotEnd = timeToMinutes(end)
    if (slotStart === null || slotEnd === null) return false
    return courseStart !== null && courseEnd !== null && 
           courseStart < slotEnd && courseEnd > slotStart
  })?.id || 1
  
  courseForm.weekType = course.weekType || 'every'
  courseForm.startWeek = course.startWeek || 1
  courseForm.endWeek = course.endWeek || 20
  courseForm.scheduleId = course.scheduleId
  showCourseDialog.value = true
}

const deleteCourse = async (course) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除课程「${course.name}」吗？删除后不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    
    await courseApi.delete(course.id)
    ElMessage.success('删除成功')
    selectedSchedules.value = selectedSchedules.value.filter(id => id !== course.scheduleId)
    await loadSchedule()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const isScheduleSelected = (scheduleId) => {
  return selectedSchedules.value.includes(scheduleId)
}

const toggleScheduleSelection = (scheduleId) => {
  const index = selectedSchedules.value.indexOf(scheduleId)
  if (index > -1) {
    selectedSchedules.value.splice(index, 1)
  } else {
    selectedSchedules.value.push(scheduleId)
  }
}

const clearSelection = () => {
  selectedSchedules.value = []
}

const batchDeleteCourses = async () => {
  if (selectedSchedules.value.length === 0) {
    ElMessage.warning('请先选择要删除的课程')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedSchedules.value.length} 个时间安排吗？删除后不可恢复。`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    
    for (const scheduleId of selectedSchedules.value) {
      await courseApi.deleteSchedule(scheduleId)
    }
    ElMessage.success('批量删除成功')
    selectedSchedules.value = []
    await loadSchedule()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleMoreAction = (command) => {
  switch (command) {
    case 'clear':
      clearSchedule()
      break
    case 'export':
      exportSchedule()
      break
    case 'print':
      printSchedule()
      break
  }
}

const clearSchedule = async () => {
  if (!selectedSemesterId.value) {
    ElMessage.warning('请先选择学期')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要清空当前学期的所有课程吗？此操作不可恢复。',
      '清空课表确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const res = await courseApi.clearCourses(selectedSemesterId.value)
    if (res.code === 200) {
      ElMessage.success(`已清空 ${res.data.deletedCount} 门课程`)
      selectedSchedules.value = []
      await loadSchedule()
    } else {
      ElMessage.error(res.message || '清空课表失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空课表失败')
    }
  }
}

const exportSchedule = async () => {
  if (!selectedSemesterId.value) {
    ElMessage.warning('请先选择学期')
    return
  }
  
  try {
    ElMessage.info('正在导出课表...')
    
    const blob = await courseApi.exportExcel(selectedSemesterId.value, 'standard')
    
    const semester = semesters.value.find(s => s.id === selectedSemesterId.value)
    const filename = `${semester?.name || '课表'}.xlsx`
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('课表导出成功')
  } catch (error) {
    console.error('导出课表失败:', error)
    ElMessage.error('导出课表失败')
  }
}

const printSchedule = () => {
  window.print()
}

const submitCourse = async () => {
  try {
    if (!selectedSemesterId.value) {
      ElMessage.warning('请先选择学期')
      return
    }
    
    await courseFormRef.value.validate()
    
    const timeSlot = timeSlots.value.find(s => s.id === courseForm.timeSlot)
    const [startTime, endTime] = timeSlot.range.split('-')
    
    if (isEditing.value && courseForm.id) {
      await courseApi.update(courseForm.id, {
        name: courseForm.name,
        teacher: courseForm.teacher,
        classroom: courseForm.classroom,
        color: courseForm.color,
        start_week: courseForm.startWeek,
        end_week: courseForm.endWeek
      })
      
      if (courseForm.scheduleId) {
        await courseApi.updateSchedule(courseForm.scheduleId, {
          day_of_week: courseForm.dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          week_type: courseForm.weekType
        })
      }
      
      ElMessage.success('更新成功')
    } else {
      const courseRes = await courseApi.create({
        semester_id: selectedSemesterId.value,
        name: courseForm.name,
        teacher: courseForm.teacher,
        classroom: courseForm.classroom,
        color: courseForm.color,
        start_week: courseForm.startWeek,
        end_week: courseForm.endWeek
      })
      
      if (courseRes.code === 200 && courseRes.data.id) {
        await courseApi.addSchedule(courseRes.data.id, {
          day_of_week: courseForm.dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          week_type: courseForm.weekType
        })
      }
      
      ElMessage.success('添加成功')
    }
    
    showCourseDialog.value = false
    await loadSchedule()
  } catch (error) {
    console.error('提交失败:', error)
    const errorMsg = error?.response?.data?.message || error?.message || '操作失败'
    ElMessage.error(errorMsg)
  }
}

const handleFileChange = async (file) => {
  uploadedFile.value = file.raw
  
  const formData = new FormData()
  formData.append('file', file.raw)
  
  try {
    const res = await courseApi.previewExcel(formData)
    console.log('预览响应:', res)
    if (res.code === 200) {
      const courses = res.data.courses || []
      previewData.value = courses.map((course, index) => ({
        ...course,
        tempId: `preview-${Date.now()}-${index}`,
        weeksDisplay: course.weeks 
          ? `${course.weeks.start}-${course.weeks.end}周` 
          : '全学期'
      }))
      previewTotal.value = res.data.total || courses.length
      if (previewData.value.length === 0) {
        ElMessage.warning(res.data.error || '未能从Excel中解析出课程，请检查文件格式')
      } else {
        ElMessage.success(`成功解析${previewTotal.value}门课程`)
      }
    } else {
      ElMessage.error(res.message || '预览失败')
    }
  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败，请检查文件格式')
  }
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const confirmImport = async () => {
  if (!uploadedFile.value || !importSemesterId.value) {
    ElMessage.warning('请选择学期并上传文件')
    return
  }
  
  try {
    const existingRes = await courseApi.getAll(importSemesterId.value)
    const hasExistingCourses = existingRes.code === 200 && existingRes.data && existingRes.data.length > 0
    
    if (hasExistingCourses) {
      await ElMessageBox.confirm(
        '该学期已有课程数据，继续导入将覆盖现有数据，是否继续？',
        '导入确认',
        {
          type: 'warning',
          confirmButtonText: '确定覆盖',
          cancelButtonText: '取消'
        }
      )
      
      await courseApi.clearCourses(importSemesterId.value)
    }
    
    const formData = new FormData()
    formData.append('file', uploadedFile.value)
    formData.append('semester_id', importSemesterId.value)
    
    const res = await courseApi.uploadExcel(formData)
    if (res.code === 200) {
      ElMessage.success(res.message)
      showImportDialog.value = false
      previewData.value = []
      previewTotal.value = 0
      uploadedFile.value = null
      importSemesterId.value = null
      uploadRef.value?.clearFiles()
      await loadSchedule()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败')
    }
  }
}

const openAddSemesterDialog = () => {
  isEditingSemester.value = false
  semesterForm.id = null
  semesterForm.name = ''
  semesterForm.start_date = ''
  semesterForm.end_date = ''
  semesterForm.total_weeks = 20
  semesterForm.is_current = false
  showAddSemesterDialog.value = true
}

const editSemester = (semester) => {
  isEditingSemester.value = true
  semesterForm.id = semester.id
  semesterForm.name = semester.name
  
  if (semester.start_date) {
    const startDate = new Date(semester.start_date)
    semesterForm.start_date = startDate.toISOString().split('T')[0]
  } else {
    semesterForm.start_date = ''
  }
  
  if (semester.end_date) {
    const endDate = new Date(semester.end_date)
    semesterForm.end_date = endDate.toISOString().split('T')[0]
  } else {
    semesterForm.end_date = ''
  }
  
  semesterForm.total_weeks = semester.total_weeks
  semesterForm.is_current = semester.is_current
  showAddSemesterDialog.value = true
}

const setCurrentSemester = async (semester) => {
  try {
    await semesterApi.setCurrent(semester.id)
    ElMessage.success('设置成功')
    await loadSemesters()
  } catch (error) {
    ElMessage.error('设置失败')
  }
}

const deleteSemester = async (semester) => {
  try {
    await ElMessageBox.confirm('确定要删除这个学期吗？相关课程也会被删除', '提示', {
      type: 'warning'
    })
    
    await semesterApi.delete(semester.id)
    ElMessage.success('删除成功')
    await loadSemesters()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const submitSemester = async () => {
  try {
    await semesterFormRef.value.validate()
    
    const data = {
      name: semesterForm.name,
      start_date: semesterForm.start_date,
      end_date: semesterForm.end_date,
      total_weeks: semesterForm.total_weeks,
      is_current: semesterForm.is_current
    }
    
    if (isEditingSemester.value && semesterForm.id) {
      await semesterApi.update(semesterForm.id, data)
      ElMessage.success('更新成功')
    } else {
      await semesterApi.create(data)
      ElMessage.success('添加成功')
    }
    
    showAddSemesterDialog.value = false
    await loadSemesters()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败')
  }
}

const goBack = () => {
  router.push('/home')
}

const loadTimeSlots = async () => {
  try {
    const res = await timeSlotApi.getSlots()
    if (res.code === 200 && res.data && res.data.length > 0) {
      timeSlots.value = res.data.map((slot, index) => ({
        id: index + 1,
        label: slot.label,
        range: `${slot.start_time}-${slot.end_time}`
      }))
    }
  } catch (error) {
    console.error('加载时间段配置失败:', error)
  }
}

const openTimeSlotDialog = () => {
  timeSlotForm.value = timeSlots.value.map(slot => {
    const [start_time, end_time] = slot.range.split('-')
    return {
      label: slot.label,
      start_time,
      end_time,
      slot_order: slot.id
    }
  })
  showTimeSlotDialog.value = true
}

const editTimeSlot = (slot) => {
  openTimeSlotDialog()
}

const addTimeSlot = () => {
  const lastSlot = timeSlotForm.value[timeSlotForm.value.length - 1]
  timeSlotForm.value.push({
    label: `第${timeSlotForm.value.length * 2 + 1}-${timeSlotForm.value.length * 2 + 2}节`,
    start_time: '',
    end_time: '',
    slot_order: timeSlotForm.value.length + 1
  })
}

const removeTimeSlot = (index) => {
  timeSlotForm.value.splice(index, 1)
  timeSlotForm.value.forEach((slot, i) => {
    slot.slot_order = i + 1
  })
}

const saveTimeSlots = async () => {
  try {
    for (const slot of timeSlotForm.value) {
      if (!slot.label || !slot.start_time || !slot.end_time) {
        ElMessage.warning('请填写完整的时间段信息')
        return
      }
    }
    
    const slots = timeSlotForm.value.map((slot, index) => ({
      slot_order: index + 1,
      label: slot.label,
      start_time: slot.start_time,
      end_time: slot.end_time
    }))
    
    const res = await timeSlotApi.saveSlots(slots)
    if (res.code === 200) {
      timeSlots.value = slots.map(slot => ({
        id: slot.slot_order,
        label: slot.label,
        range: `${slot.start_time}-${slot.end_time}`
      }))
      showTimeSlotDialog.value = false
      ElMessage.success('保存成功')
    }
  } catch (error) {
    console.error('保存时间段配置失败:', error)
    ElMessage.error('保存失败')
  }
}

const resetTimeSlots = async () => {
  try {
    const res = await timeSlotApi.resetSlots()
    if (res.code === 200) {
      timeSlots.value = [...defaultTimeSlots]
      timeSlotForm.value = defaultTimeSlots.map(slot => {
        const [start_time, end_time] = slot.range.split('-')
        return {
          label: slot.label,
          start_time,
          end_time,
          slot_order: slot.id
        }
      })
      ElMessage.success('已恢复默认设置')
    }
  } catch (error) {
    console.error('重置时间段配置失败:', error)
    ElMessage.error('重置失败')
  }
}

onMounted(() => {
  loadSemesters()
  loadTimeSlots()
})
</script>

<style scoped>
.course-editor-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header h1 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.semester-select-card {
  margin-bottom: 20px;
}

.semester-select {
  display: flex;
  align-items: center;
  gap: 16px;
}

.semester-select .label {
  font-weight: 500;
  color: #303133;
}

.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 18px;
}

.form-label {
  width: 100px;
  text-align: right;
  padding-right: 12px;
  font-weight: 700;
  color: #606266;
  line-height: 32px;
}

.form-row .el-row {
  flex: 1;
}

.schedule-card {
  border-radius: 12px;
}

.schedule-table {
  width: 100%;
  overflow-x: auto;
}

.schedule-header {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px 8px 0 0;
}

.time-column,
.day-column {
  flex: 1;
  min-width: 120px;
  padding: 16px;
  text-align: center;
  font-weight: 500;
  color: #303133;
  border-right: 1px solid #ebeef5;
}

.time-column {
  min-width: 100px;
  background: #ecf5ff;
}

.day-column:last-child {
  border-right: none;
}

.schedule-body {
  border: 1px solid #ebeef5;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.schedule-row {
  display: flex;
  border-bottom: 1px solid #ebeef5;
}

.schedule-row:last-child {
  border-bottom: none;
}

.time-cell {
  min-width: 100px;
  padding: 12px;
  background: #fafafa;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
}

.time-cell:hover {
  background: #f0f0f0;
}

.time-edit-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 12px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.2s;
}

.time-cell:hover .time-edit-icon {
  opacity: 1;
}

.time-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.time-range {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.schedule-cell {
  flex: 1;
  min-width: 120px;
  min-height: 80px;
  padding: 8px;
  border-right: 1px solid #ebeef5;
  cursor: pointer;
  transition: background-color 0.3s;
}

.schedule-cell:hover {
  background-color: #f5f7fa;
}

.schedule-cell:last-child {
  border-right: none;
}

.course-card {
  padding: 8px;
  border-radius: 6px;
  color: #fff;
  margin-bottom: 4px;
  position: relative;
  cursor: pointer;
}

.course-card.selected {
  box-shadow: 0 0 0 2px #409EFF, 0 0 0 4px rgba(64, 158, 255, 0.3);
}

.course-checkbox {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 1;
}

.course-checkbox :deep(.el-checkbox) {
  height: 16px;
}

.course-checkbox :deep(.el-checkbox__inner) {
  background-color: rgba(255, 255, 255, 0.9) !important;
  border-color: #dcdfe6 !important;
  width: 16px !important;
  height: 16px !important;
}

.course-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #fff !important;
  border-color: #409EFF !important;
}

.course-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  border-color: #409EFF !important;
  transform: rotate(45deg) scaleY(1) !important;
  left: 5px !important;
  top: 2px !important;
}

.course-card:hover .course-actions {
  opacity: 1;
}

.course-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  padding-left: 20px;
}

.course-info {
  font-size: 12px;
  opacity: 0.9;
}

.course-weeks {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 2px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.selected-count {
  color: #409EFF;
  font-weight: 500;
}

.course-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.course-actions .el-button {
  padding: 2px;
  color: #fff;
}

.import-content {
  padding: 20px 0;
}

.no-semester-tip {
  margin-top: 8px;
}

.import-tip {
  margin-bottom: 20px;
}

.import-tip ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.import-tip li {
  margin: 4px 0;
}

.preview-section {
  margin-top: 20px;
}

.preview-section h4 {
  margin-bottom: 12px;
  color: #303133;
}

.semester-management {
  padding: 20px 0;
}

.add-semester-btn {
  margin-bottom: 16px;
}

.time-slot-settings {
  padding: 10px 0;
}

.settings-tip {
  color: #909399;
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
