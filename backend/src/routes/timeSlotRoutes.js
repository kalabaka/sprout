const express = require('express');
const router = express.Router();
const TimeSlotController = require('../controllers/TimeSlotController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, TimeSlotController.getSlots);
router.post('/', authMiddleware, TimeSlotController.saveSlots);
router.post('/reset', authMiddleware, TimeSlotController.resetSlots);

module.exports = router;
