/**
 * 用户配置路由
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件(jpeg/jpg/png/gif/webp)'));
    }
  }
});

router.get('/me', authMiddleware, profileController.getProfile);
router.put('/me', authMiddleware, profileController.updateProfile);
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), profileController.uploadAvatar);

router.get('/learning-prefs', authMiddleware, profileController.getLearningPrefs);
router.put('/learning-prefs', authMiddleware, profileController.updateLearningPrefs);

router.post('/mastered-topics', authMiddleware, profileController.saveMasteredTopics);

router.get('/knowledge/subjects/:subject', authMiddleware, profileController.getSubjectKnowledge);
router.get('/recommended-path/:subject', authMiddleware, profileController.getRecommendedPath);

module.exports = router;