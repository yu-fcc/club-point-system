import mongoose from 'mongoose';

// 定义PointsHistory模型的Schema
const PointsHistorySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  user: { type: String, required: true },
  timestamp: { type: Number, required: true },
  pointsChange: { type: Number, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true }, // "task" or "reward"
  status: { type: String, required: true },
  txHash: { type: String, required: true }, // 交易哈希
  blockNumber: { type: Number, required: true } // 区块号
});

// 创建复合索引确保唯一性
PointsHistorySchema.index({ user: 1, id: 1 }, { unique: true });

const PointsHistory = mongoose.model('PointsHistory', PointsHistorySchema);

export default PointsHistory; 