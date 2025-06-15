import { Router } from 'express';
import { Task } from '../models';

const router = Router();

// 创建新任务
router.post('/', async (req, res) => {
  try {
    const { id, creator, title, description, points, deadline, txHash, blockNumber } = req.body;
    
    // 创建任务记录
    const task = new Task({
      id,
      creator,
      title,
      description,
      points,
      isCompleted: false,
      status: 0, // CREATED
      deadline,
      txHash,
      blockNumber,
      timestamp: Math.floor(Date.now() / 1000)
    });
    
    await task.save();
    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ success: false, error: '无法创建任务' });
  }
});

// 分配任务
router.put('/assign/:id', async (req, res) => {
  try {
    const { assignee, txHash, blockNumber } = req.body;
    
    const task = await Task.findOne({ id: Number(req.params.id) });
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    task.assignee = assignee;
    task.status = 1; // ASSIGNED
    task.txHash = txHash;
    task.blockNumber = blockNumber;
    task.timestamp = Math.floor(Date.now() / 1000);
    
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    console.error('分配任务错误:', error);
    res.status(500).json({ success: false, error: '无法分配任务' });
  }
});

// 提交任务
router.put('/submit/:id', async (req, res) => {
  try {
    const { proof, txHash, blockNumber } = req.body;
    
    const task = await Task.findOne({ id: Number(req.params.id) });
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    task.proof = proof;
    task.status = 2; // SUBMITTED
    task.txHash = txHash;
    task.blockNumber = blockNumber;
    task.timestamp = Math.floor(Date.now() / 1000);
    
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    console.error('提交任务错误:', error);
    res.status(500).json({ success: false, error: '无法提交任务' });
  }
});

// 完成任务
router.put('/approve/:id', async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;
    
    const task = await Task.findOne({ id: Number(req.params.id) });
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    task.isCompleted = true;
    task.status = 3; // COMPLETED
    task.txHash = txHash;
    task.blockNumber = blockNumber;
    task.timestamp = Math.floor(Date.now() / 1000);
    
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    console.error('完成任务错误:', error);
    res.status(500).json({ success: false, error: '无法完成任务' });
  }
});

// 拒绝任务
router.put('/reject/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ id: Number(req.params.id) });
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    task.status = 4; // REJECTED
    task.timestamp = Math.floor(Date.now() / 1000);
    
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    console.error('拒绝任务错误:', error);
    res.status(500).json({ success: false, error: '无法拒绝任务' });
  }
});

// 获取所有任务
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ timestamp: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ success: false, error: '无法获取任务列表' });
  }
});

export default router; 