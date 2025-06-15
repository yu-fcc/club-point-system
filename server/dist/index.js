"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const web3_1 = __importDefault(require("web3"));
// 加载环境变量
dotenv_1.default.config();
const app = (0, express_1.default)();
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 默认端口
const PORT = process.env.PORT || 3001;
// Web3 初始化
const web3Provider = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const web3 = new web3_1.default(web3Provider);
// 读取合约地址
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
// 路由
app.get('/', (req, res) => {
    res.json({ message: '欢迎使用社团积分系统API' });
});
// 获取区块链状态
app.get('/api/blockchain/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blockNumber = yield web3.eth.getBlockNumber();
        res.json({
            status: 'connected',
            network: yield web3.eth.net.getNetworkType(),
            blockNumber
        });
    }
    catch (error) {
        console.error('获取区块链状态错误:', error);
        res.status(500).json({ status: 'error', message: '无法连接到区块链' });
    }
}));
// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`区块链连接: ${web3Provider}`);
});
