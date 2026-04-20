const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/overview', StatsController.getOverview);

router.get('/distribution', StatsController.getDistribution);

router.get('/trend', StatsController.getTrend);

module.exports = router;
