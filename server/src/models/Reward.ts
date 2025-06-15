import mongoose from 'mongoose';

// 定义Reward模型的Schema
const RewardSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  stock: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  status: { 
    type: Number, 
    enum: [0, 1], // AVAILABLE, SOLD_OUT
    default: 0 
  },
  txHash: { type: String },
  blockNumber: { type: Number },
  timestamp: { type: Number, required: true } // 时间戳
});

const Reward = mongoose.model('Reward', RewardSchema);

export default Reward; 