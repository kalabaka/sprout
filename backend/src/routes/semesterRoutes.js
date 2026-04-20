/**
 * 学期路由
 * 路由前缀: /api/semester
 */
const express = require('express');
const router = express.Router();
const SemesterController = require('../controllers/SemesterController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', SemesterController.create);
router.get('/current', SemesterController.getCurrent);
router.get('/', SemesterController.getAll);
router.put('/:id', SemesterController.update);
router.post('/:id/set-current', SemesterController.setCurrent);
router.delete('/:id', SemesterController.delete);

module.exports = router;
