import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Web3 from 'web3';
import connectDB from './config/db';
import routes from './routes';

// 加载环境变量
dotenv.config();

// 连接到MongoDB
connectDB();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 默认端口
const PORT = process.env.PORT || 3001;

// Web3 初始化
const web3Provider = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const web3 = new Web3(web3Provider);

// 读取合约地址
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// API路由
app.use('/api', routes);

// 基本路由
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用社团积分系统API' });
});

// 获取区块链状态
app.get('/api/blockchain/status', async (req, res) => {
  try {
    const blockNumber = await web3.eth.getBlockNumber();
    res.json({ 
      status: 'connected',
      network: await web3.eth.net.getNetworkType(),
      blockNumber
    });
  } catch (error) {
    console.error('获取区块链状态错误:', error);
    res.status(500).json({ status: 'error', message: '无法连接到区块链' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`区块链连接: ${web3Provider}`);
}); 