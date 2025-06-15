import { Router } from 'express';
import { Reward, ExchangeRecord, PointsHistory } from '../models';

const router = Router();

//获取用户积分
router.get('/user/points/:user', async (req, res) => {
  const { user } = req.params;
  try {
    const records = await PointsHistory.find({ user });
    const points = records.reduce((sum, r) => sum + r.pointsChange, 0);
    res.json({ user, points });
  } catch (error) {
    console.error('获取用户积分失败:', error);
    res.status(500).json({ error: '无法获取用户积分' });
  }
});

// 创建新奖励
router.post('/', async (req, res) => {
  try {
    const { id, name, description, pointsCost, stock, imageUrl, txHash, blockNumber } = req.body;
    
    // 创建奖励记录
    const reward = new Reward({
      id,
      name,
      description,
      pointsCost,
      stock,
      imageUrl,
      status: stock > 0 ? 0 : 1, // AVAILABLE or SOLD_OUT
      txHash,
      blockNumber,
      timestamp: Math.floor(Date.now() / 1000)
    });
    
    await reward.save();
    res.status(201).json({ success: true, reward });
  } catch (error) {
    console.error('创建奖励错误:', error);
    res.status(500).json({ success: false, error: '无法创建奖励' });
  }
});

// 更新奖励库存
router.put('/stock/:id', async (req, res) => {
  try {
    const { newStock, txHash, blockNumber } = req.body;
    
    const reward = await Reward.findOne({ id: Number(req.params.id) });
    if (!reward) {
      return res.status(404).json({ success: false, error: '奖励不存在' });
    }
    
    reward.stock = newStock;
    reward.status = newStock > 0 ? 0 : 1; // AVAILABLE or SOLD_OUT
    reward.txHash = txHash;
    reward.blockNumber = blockNumber;
    reward.timestamp = Math.floor(Date.now() / 1000);
    
    await reward.save();
    res.json({ success: true, reward });
  } catch (error) {
    console.error('更新奖励库存错误:', error);
    res.status(500).json({ success: false, error: '无法更新奖励库存' });
  }
});

// 兑换奖励
router.post('/exchange', async (req, res) => {
  try {
    const { rewardId, user, exchangeId, pointsCost, title, txHash, blockNumber } = req.body;
    
    // 更新奖励库存
    const reward = await Reward.findOne({ id: Number(rewardId) });
    if (!reward) {
      return res.status(404).json({ success: false, error: '奖励不存在' });
    }
    
    // 创建兑换记录
    const exchangeRecord = new ExchangeRecord({
      id: exchangeId,
      rewardId,
      user,
      timestamp: Math.floor(Date.now() / 1000),
      txHash,
      blockNumber
    });
    
    // 创建积分历史，确保pointsChange为负数
    const pointsHistory = new PointsHistory({
      id: await PointsHistory.countDocuments({ user }),
      user,
      timestamp: Math.floor(Date.now() / 1000),
      pointsChange: -Math.abs(pointsCost), // 确保是负数
      title,
      type: 'reward',
      status: 'exchanged',
      txHash,
      blockNumber
    });
    
    await exchangeRecord.save();
    await pointsHistory.save();
    
    res.status(201).json({ success: true, exchangeRecord, pointsHistory });
  } catch (error) {
    console.error('兑换奖励错误:', error);
    res.status(500).json({ success: false, error: '无法兑换奖励' });
  }
});
// 获取全部奖励列表
router.get('/', async (req, res) => {
  try {
    const rewards = await Reward.find({});
    res.json(rewards);
  } catch (error) {
    console.error('获取奖励失败:', error);
    res.status(500).json({ error: '无法获取奖励' });
  }
});
// 获取用户已兑换的奖励
router.get('/exchanged/:user', async (req, res) => {
  try {
    const { user } = req.params;
    
    // 查找该用户的所有兑换记录
    const exchangeRecords = await ExchangeRecord.find({ user });
    
    // 获取所有相关的奖励信息
    const exchangedRewards = await Promise.all(
      exchangeRecords.map(async (record) => {
        const reward = await Reward.findOne({ id: record.rewardId });
        if (reward) {
          return {
            id: reward.id,
            name: reward.name,
            description: reward.description,
            pointsCost: reward.pointsCost,
            imageUrl: reward.imageUrl,
            timestamp: record.timestamp
          };
        }
        return null;
      })
    );
    
    // 过滤掉 null 值（如果某些奖励已被删除）
    const validRewards = exchangedRewards.filter(reward => reward !== null);
    
    res.json(validRewards);
  } catch (error) {
    console.error('获取用户兑换奖励记录失败:', error);
    res.status(500).json({ error: '无法获取用户兑换奖励记录' });
  }
});
export default router; 