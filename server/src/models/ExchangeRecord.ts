import mongoose from 'mongoose';

// 定义ExchangeRecord模型的Schema
const ExchangeRecordSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  rewardId: { type: Number, required: true },
  user: { type: String, required: true },
  timestamp: { type: Number, required: true },
  txHash: { type: String, required: true }, // 交易哈希
  blockNumber: { type: Number, required: true } // 区块号
});

// 创建复合索引确保唯一性
ExchangeRecordSchema.index({ rewardId: 1, id: 1 }, { unique: true });

const ExchangeRecord = mongoose.model('ExchangeRecord', ExchangeRecordSchema);

export default ExchangeRecord; 