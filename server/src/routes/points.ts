import { Router } from 'express';
import { PointsHistory } from '../models';

const router = Router();

// 添加积分历史记录（用于任务完成时）
router.post('/history', async (req, res) => {
  try {
    const { user, pointsChange, title, type, status, txHash, blockNumber } = req.body;
    
    const pointsHistory = new PointsHistory({
      id: await PointsHistory.countDocuments({ user }),
      user,
      timestamp: Math.floor(Date.now() / 1000),
      pointsChange,
      title,
      type, // "task" or "reward"
      status, // "finished" or "exchanged"
      txHash,
      blockNumber
    });
    
    await pointsHistory.save();
    res.status(201).json({ success: true, pointsHistory });
  } catch (error) {
    console.error('添加积分历史记录错误:', error);
    res.status(500).json({ success: false, error: '无法添加积分历史记录' });
  }
});
//获取用户的所有积分
router.get('/history/:user', async (req, res) => {
  const { user } = req.params; // 从URL参数中获取用户ID
  try {
    // 从 PointsHistory 集合中查找所有属于该用户的记录
    // 可以选择按时间戳排序，以便最新记录在前或在后
    const history = await PointsHistory.find({ user }).sort({ timestamp: -1 }); // -1 表示降序，获取最新记录

    res.json(history); // 返回该用户的历史记录列表
  } catch (error) {
    console.error('后端获取用户积分历史记录失败:', error);
    res.status(500).json({ success: false, error: '无法获取用户积分历史记录' });
  }
});

export default router; 