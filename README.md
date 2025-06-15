# 社团积分系统

一个基于区块链的去中心化、透明且激励公平的社团活动积分系统。

## 项目结构

```
club-points-system/
├── client/                 # React前端
│   ├── public/             # 静态资源
│   └── src/                # 源代码
│       ├── contracts/      # 合约ABI
│       └── services/       # 服务
├── server/                 # Node.js后端
│   └── src/                # 源代码
└── contracts/              # 智能合约
```

## 功能特性

- 首页连接钱包  
- 发布任务
- 领取社团任务  
- 基础区块链存储功能
- 查看任务与积分状况
- 完成任务提交
- 领取积分
- 用户查看贡献记录
- 查看任务领取情况
- 查看任务完成状态
- 查看积分是否到账

## 快速开始

### 前端

1. 进入客户端目录
   ```
   cd client
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 启动开发服务器
   ```
   npm start
   ```

### 后端

1. 进入服务器目录
   ```
   cd server
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 启动开发服务器
   ```
   npm run dev
   ```

### 智能合约

使用Truffle或Hardhat部署智能合约到测试网或本地开发网络。

1. 安装Truffle（如果未安装）
   ```
   npm install -g truffle
   ```

2. 编译合约
   ```
   truffle compile
   ```

3. 部署合约
   ```
   truffle migrate
   ```

## 技术栈

- 前端：React.js, TypeScript, Web3.js
- 后端：Node.js, Express
- 区块链：Solidity, Truffle/Hardhat

## 许可证

MIT 