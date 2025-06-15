import { Router } from 'express';
import { Appeal } from '../models';

const router = Router();

// 创建申诉
router.post('/', async (req, res) => {
  try {
    const { id, user, pointsChange, reason, txHash, blockNumber } = req.body;
    
    const appeal = new Appeal({
      id,
      user,
      pointsChange,
      reason,
      resolved: false,
      approved: false,
      timestamp: Math.floor(Date.now() / 1000),
      txHash,
      blockNumber
    });
    
    await appeal.save();
    res.status(201).json({ success: true, appeal });
  } catch (error) {
    console.error('创建申诉错误:', error);
    res.status(500).json({ success: false, error: '无法创建申诉' });
  }
});

// 处理申诉
router.put('/resolve/:id', async (req, res) => {
  try {
    const { approve, txHash } = req.body;
    
    const appeal = await Appeal.findOne({ id: Number(req.params.id) });
    if (!appeal) {
      return res.status(404).json({ success: false, error: '申诉不存在' });
    }
    
    appeal.resolved = true;
    appeal.approved = approve;
    appeal.resolveTxHash = txHash;
    
    await appeal.save();
    res.json({ success: true, appeal });
  } catch (error) {
    console.error('处理申诉错误:', error);
    res.status(500).json({ success: false, error: '无法处理申诉' });
  }
});
//获取所有申诉
router.get('/', async (req, res) => {
  try {
    // 按时间戳降序排序，最新的申诉在前
    const appeals = await Appeal.find().sort({ timestamp: -1 });
    res.json(appeals);
  } catch (error) {
    console.error('获取申诉记录失败:', error);
    res.status(500).json({ error: '无法获取申诉记录' });
  }
});
export default router; 