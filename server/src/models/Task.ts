import mongoose from 'mongoose';

// 定义Task模型的Schema
const TaskSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  creator: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  points: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false },
  assignee: { type: String, default: null },
  status: { 
    type: Number, 
    enum: [0, 1, 2, 3, 4], // CREATED, ASSIGNED, SUBMITTED, APPROVED, REJECTED
    default: 0 
  },
  proof: { type: String, default: '' },
  deadline: { type: Number, required: true },
  txHash: { type: String, required: true }, // 交易哈希
  blockNumber: { type: Number, required: true }, // 区块号
  timestamp: { type: Number, required: true } // 时间戳
});

const Task = mongoose.model('Task', TaskSchema);

export default Task; 