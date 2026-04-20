/**
 * 课程路由
 * 路由前缀: /api/courses
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const CourseController = require('../controllers/CourseController');
const authMiddleware = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式'));
    }
  }
});

router.use(authMiddleware);

router.get('/export', CourseController.exportExcel);
router.post('/', CourseController.create);
router.get('/schedules/week', CourseController.getWeekSchedule);
router.get('/schedules/day', CourseController.getDaySchedule);
router.get('/schedules/full', CourseController.getFullSchedule);
router.post('/upload-excel', upload.single('file'), CourseController.uploadExcel);
router.post('/preview-excel', upload.single('file'), CourseController.previewExcel);
router.delete('/batch', CourseController.batchDelete);
router.delete('/clear', CourseController.clearCourses);
router.get('/', CourseController.getAll);
router.put('/:id', CourseController.update);
router.delete('/:id', CourseController.delete);
router.post('/:courseId/schedules', CourseController.addSchedule);
router.put('/schedules/:scheduleId', CourseController.updateSchedule);
router.delete('/schedules/:scheduleId', CourseController.deleteSchedule);

module.exports = router;
