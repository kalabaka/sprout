const TimeSlotModel = require('../models/TimeSlotModel');
const { success, fail } = require('../utils/response');

class TimeSlotController {
  static async getSlots(req, res) {
    try {
      const userId = req.user.userId;
      let slots = await TimeSlotModel.findByUserId(userId);
      
      if (slots.length === 0) {
        slots = TimeSlotModel.getDefaultSlots();
      }
      
      res.json(success(slots));
    } catch (error) {
      console.error('获取时间段配置失败:', error);
      res.status(500).json(fail('获取时间段配置失败'));
    }
  }

  static async saveSlots(req, res) {
    try {
      const userId = req.user.userId;
      const { slots } = req.body;
      
      if (!slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json(fail('请提供有效的时间段配置'));
      }
      
      for (const slot of slots) {
        if (!slot.label || !slot.start_time || !slot.end_time) {
          return res.status(400).json(fail('时间段配置不完整'));
        }
      }
      
      const count = await TimeSlotModel.batchCreate(userId, slots);
      res.json(success({ count }, '保存成功'));
    } catch (error) {
      console.error('保存时间段配置失败:', error);
      res.status(500).json(fail('保存时间段配置失败'));
    }
  }

  static async resetSlots(req, res) {
    try {
      const userId = req.user.userId;
      await TimeSlotModel.deleteByUserId(userId);
      const defaultSlots = TimeSlotModel.getDefaultSlots();
      res.json(success(defaultSlots, '已重置为默认配置'));
    } catch (error) {
      console.error('重置时间段配置失败:', error);
      res.status(500).json(fail('重置时间段配置失败'));
    }
  }
}

module.exports = TimeSlotController;
