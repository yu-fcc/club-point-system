import mongoose from 'mongoose';

// 定义Appeal模型的Schema
const AppealSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  user: { type: String, required: true },
  pointsChange: { type: Number, required: true },
  reason: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  timestamp: { type: Number, required: true },
  txHash: { type: String, required: true }, // 交易哈希
  blockNumber: { type: Number, required: true }, // 区块号
  resolveTxHash: { type: String, default: null } // 处理申诉的交易哈希
});

const Appeal = mongoose.model('Appeal', AppealSchema);

export default Appeal; 