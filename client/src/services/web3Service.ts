import { ethers, ContractInterface } from 'ethers';
import TaskContractABI from '../contracts/TaskContract.json';
import { taskAPI, rewardAPI, appealAPI, pointsAPI } from './apiService';

// 添加 window.ethereum 的类型声明
declare global {
  interface Window {
    ethereum: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// 这里应该替换为您部署的合约地址
const CONTRACT_ADDRESS = '0x016c58B79ed74424C968B31d6FeBf2e38418F87D';

export enum TaskStatus {
  CREATED = 0,
  ASSIGNED = 1,
  SUBMITTED = 2,
  COMPLETED = 3
}

export interface Task {
  id: number;
  creator: string;
  title: string;
  description: string;
  points: number;
  isCompleted: boolean;
  assignee: string;
  status: TaskStatus;
  deadline: number;
  timestamp: number;
  createdAt?: number;
  proof?: string;
  proofFiles?: string[];
}

export interface PointsHistory {
  id: number;
  timestamp: number;
  pointsChange: number;
  title: string;
  type: string;
  status: string;
}

export interface Appeal {
  id: number;
  user: string;
  pointsChange: number;
  reason: string;
  resolved: boolean;
  approved: boolean;
}

export class Web3Service {
  private provider: ethers.providers.Web3Provider | null = null;
  private contract: ethers.Contract | null = null;
  private account: string | null = null;

  async init() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请安装MetaMask钱包');
      }

      // 请求用户授权
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error('用户拒绝了钱包连接请求:', error);
        throw new Error('请授权访问您的钱包');
      }

      // 初始化 provider
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // 获取用户账户
      const accounts = await this.provider.listAccounts();
      if (accounts.length === 0) {
        throw new Error('未检测到钱包账户');
      }
      this.account = accounts[0];

      // 初始化合约
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        TaskContractABI as ContractInterface,
        this.provider
      );

      // 监听账户变化
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.account = null;
        } else {
          this.account = accounts[0];
        }
      });

      // 监听链变化
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('初始化Web3服务失败:', error);
      throw error;
    }
  }

  async createTask(title: string, description: string, points: number, deadline: number) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.createTask(title, description, points, deadline);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 获取当前任务ID
      const taskCount = await this.contract!.getTaskCount();
      const taskId = taskCount.toNumber() - 1;
      
      // 同步到后端MongoDB
      await taskAPI.syncTaskCreation({
        id: taskId,
        creator: this.account,
        title,
        description,
        points,
        deadline,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('创建任务错误:', error);
      throw error;
    }
  }

  async getTasks() {
    if (!this.contract) await this.init();
    
    try {
      // 获取任务总数
      const taskCount = await this.contract!.getTaskCount();
      console.log('任务总数:', taskCount.toNumber());
      
      const tasks: Task[] = [];
      
      // 遍历获取每个任务
      for (let i = 0; i < taskCount.toNumber(); i++) {
        try {
          console.log('正在获取任务:', i);
          const task = await this.contract!.tasks(i);
          console.log('获取到的任务数据:', task);
          
          // 确保所有必要的字段都存在
          if (!task || !task.id) {
            console.error('任务数据不完整:', task);
            continue;
          }
          
          // 直接将状态转换为 TaskStatus 枚举
          const status = typeof task.status === 'number' ? task.status :
                        typeof task.status === 'string' ? parseInt(task.status) :
                        task.status && typeof task.status.toNumber === 'function' ? task.status.toNumber() :
                        TaskStatus.CREATED;

          tasks.push({
            id: task.id.toNumber(),
            creator: task.creator,
            title: task.title || '',
            description: task.description || '',
            points: task.points ? task.points.toNumber() : 0,
            isCompleted: task.isCompleted || false,
            assignee: task.assignee || '0x0000000000000000000000000000000000000000',
            status: status as TaskStatus,
            deadline: task.deadline ? task.deadline.toNumber() : 0,
            timestamp: task.timestamp ? task.timestamp.toNumber() : 0,
            createdAt: task.createdAt ? task.createdAt.toNumber() : 0
          });
          
          console.log('处理后的任务数据:', tasks[tasks.length - 1]);
        } catch (error) {
          console.error(`获取任务 ${i} 失败:`, error);
        }
      }
      
      console.log('最终获取到的所有任务:', tasks);
      return tasks;
    } catch (error) {
      console.error('获取任务列表错误:', error);
      throw error;
    }
  }

  async assignTask(taskId: number) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.assignTask(taskId);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 同步到后端MongoDB
      await taskAPI.syncTaskAssignment(taskId, {
        assignee: this.account,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('领取任务错误:', error);
      throw error;
    }
  }

  async submitTask(taskId: number, proof: string) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.submitTask(taskId, proof);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 同步到后端MongoDB
      await taskAPI.syncTaskSubmission(taskId, {
        proof,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('提交任务错误:', error);
      throw error;
    }
  }

  async approveTask(taskId: number) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.approveTask(taskId);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 获取任务信息，用于添加积分历史
      const task = await this.contract!.tasks(taskId);
      
      // 同步到后端MongoDB
      await taskAPI.syncTaskApproval(taskId, {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      // 同时添加积分历史记录
      await pointsAPI.syncPointsHistory({
        user: task.assignee,
        pointsChange: task.points.toNumber(),
        title: task.title,
        type: 'task',
        status: 'finished',
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('批准任务错误:', error);
      throw error;
    }
  }

  async getUserPoints() {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const points = await this.contract!.userPoints(this.account);
      return points.toNumber();
    } catch (error) {
      console.error('获取用户积分错误:', error);
      return 0;
    }
  }

  async getAccount() {
    if (!this.account) {
      await this.init();
    }
    return this.account;
  }

  // Add reward related methods
  async createReward(name: string, description: string, pointsCost: number, stock: number, imageUrl: string) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.createReward(name, description, pointsCost, stock, imageUrl);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 获取当前奖励ID
      const rewardCount = await this.contract!.getRewardCount();
      const rewardId = rewardCount.toNumber() - 1;
      
      // 同步到后端MongoDB
      await rewardAPI.syncRewardCreation({
        id: rewardId,
        name,
        description,
        pointsCost,
        stock,
        imageUrl,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('创建奖励错误:', error);
      throw error;
    }
  }

  async getRewards() {
    if (!this.contract) await this.init();
    
    try {
      const rewardCount = await this.contract!.getRewardCount();
      const rewards = [];
      
      for (let i = 0; i < rewardCount.toNumber(); i++) {
        const reward = await this.contract!.getReward(i);
        rewards.push({
          id: i,
          name: reward[0],
          description: reward[1],
          pointsCost: reward[2].toNumber(),
          stock: reward[3].toNumber(),
          imageUrl: reward[4],
          status: reward[5]
        });
      }
      
      return rewards;
    } catch (error) {
      console.error('Get rewards error:', error);
      throw error;
    }
  }

  async exchangeReward(rewardId: number) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      
      // 先获取奖励信息
      const reward = await this.getReward(rewardId);
      const records = await this.getRewardExchangeRecords(rewardId);
      const exchangeId = records.length;
      
      const tx = await contractWithSigner.exchangeReward(rewardId);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 同步到后端MongoDB
      await rewardAPI.syncRewardExchange({
        rewardId,
        user: this.account,
        exchangeId,
        pointsCost: reward.pointsCost,
        title: reward.name,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('兑换奖励错误:', error);
      throw error;
    }
  }

  async updateRewardStock(rewardId: number, newStock: number) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.updateRewardStock(rewardId, newStock);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 同步到后端MongoDB
      await rewardAPI.syncRewardStockUpdate(rewardId, {
        newStock,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('更新奖励库存错误:', error);
      throw error;
    }
  }

  async getRewardExchangeRecords(rewardId: number) {
    if (!this.contract) await this.init();
    
    try {
      return await this.contract!.getRewardExchangeRecords(rewardId);
    } catch (error) {
      console.error('Get reward exchange records error:', error);
      throw error;
    }
  }

  async getTaskCount() {
    if (!this.contract) await this.init();
    
    try {
      const count = await this.contract!.getTaskCount();
      return count.toNumber();
    } catch (error) {
      console.error('获取任务总数失败:', error);
      return 0;
    }
  }

  async getRewardCount() {
    if (!this.contract) await this.init();
    
    try {
      const count = await this.contract!.getRewardCount();
      return count.toNumber();
    } catch (error) {
      console.error('获取奖励总数失败:', error);
      return 0;
    }
  }

  async getReward(rewardId: number) {
    if (!this.contract) await this.init();
    
    try {
      const reward = await this.contract!.rewards(rewardId);
      return {
        name: reward.name,
        description: reward.description,
        pointsCost: reward.pointsCost.toNumber(),
        stock: reward.stock.toNumber(),
        imageUrl: reward.imageUrl,
        status: reward.status
      };
    } catch (error) {
      console.error('获取奖励详情失败:', error);
      throw error;
    }
  }

  async getUserPointsHistory(): Promise<PointsHistory[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // 获取用户的所有任务记录
      const tasks = await this.getTasks();
      const userTasks = tasks.filter(task => task.assignee === this.account);
      
      // 获取用户的所有奖励兑换记录
      const rewards = await this.getRewards();
      const userRewards = await Promise.all(
        rewards.map(async (reward) => {
          const records = await this.getRewardExchangeRecords(reward.id);
          const hasUserRecord = records.some((record: any) => record.user === this.account);
          return hasUserRecord ? reward : null;
        })
      );
      const filteredRewards = userRewards.filter((reward): reward is NonNullable<typeof reward> => reward !== null);

      // 合并并格式化记录
      const history: PointsHistory[] = [];

      // 添加任务记录
      userTasks.forEach(task => {
        history.push({
          id: task.id,
          timestamp: task.timestamp * 1000,
          pointsChange: task.points,
          title: task.title,
          type: 'task',
          status: task.status === TaskStatus.COMPLETED ? 'completed' : 'pending'
        });
      });

      // 添加奖励兑换记录
      filteredRewards.forEach(reward => {
        if (reward) {
          history.push({
            id: reward.id,
            timestamp: Date.now(), // 使用当前时间作为兑换时间
            pointsChange: -reward.pointsCost, // 负值表示消耗积分
            title: reward.name,
            type: 'reward',
            status: 'completed'
          });
        }
      });

      // 按时间戳排序
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting user points history:', error);
      throw error;
    }
  }

  async createAppeal(pointsChange: number, reason: string) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.createAppeal(pointsChange, reason);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 获取当前申诉ID
      const appealCount = await this.contract!.getAppealCount();
      const appealId = appealCount.toNumber() - 1;
      
      // 同步到后端MongoDB
      await appealAPI.syncAppealCreation({
        id: appealId,
        user: this.account,
        pointsChange,
        reason,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      });
      
      return tx;
    } catch (error) {
      console.error('创建申诉错误:', error);
      throw error;
    }
  }

  async getUserAppeals(): Promise<Appeal[]> {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const [ids, timestamps, pointsChanges, reasons, resolveds, approveds] = await this.contract!.getUserAppeals(this.account);
      
      // Map the arrays to Appeal objects
      return ids.map((id: any, index: number) => ({
        id: id.toNumber(),
        user: this.account!,
        pointsChange: pointsChanges[index].toNumber(),
        reason: reasons[index],
        resolved: resolveds[index],
        approved: approveds[index]
      }));
    } catch (error) {
      console.error('获取申诉记录错误:', error);
      throw error;
    }
  }

  async getAllAppeals(): Promise<Appeal[]> {
    if (!this.contract) await this.init();
    
    try {
      // 查询所有申诉创建事件
      const appealCreatedEvents = await this.contract!.queryFilter(this.contract!.filters.AppealCreated());
      
      // 查询所有申诉解决事件
      const appealResolvedEvents = await this.contract!.queryFilter(this.contract!.filters.AppealResolved());
      
      // 将事件映射成 Appeal 对象
      const appeals: Appeal[] = await Promise.all(
        appealCreatedEvents.map(async (event) => {
          const [appealId, user, pointsChange, reason] = event.args!;
          
          // 查找对应的 resolved 事件
          const resolvedEvent = appealResolvedEvents.find(
            (e) => e.args![0].toString() === appealId.toString()
          );
          
          let resolved = false;
          let approved = false;
          
          // 尝试从合约获取 appeal 详情
          try {
            const appealData = await this.contract!.appeals(appealId);
            
            // 检查数据结构，确保字段存在
            resolved = appealData && typeof appealData.resolved !== 'undefined' ? appealData.resolved : false;
            approved = appealData && typeof appealData.approved !== 'undefined' ? appealData.approved : false;
          } catch (error) {
            console.error('获取申诉详情失败:', error);
            // 如果无法从合约获取，则使用事件判断
            if (resolvedEvent) {
              resolved = true;
              approved = resolvedEvent.args![1];
            }
          }
          
          return {
            id: appealId.toNumber(),
            user,
            pointsChange: pointsChange.toNumber(),
            reason,
            resolved,
            approved
          };
        })
      );
      
      // 按 ID 排序，最新的在前面
      return appeals.sort((a, b) => b.id - a.id);
    } catch (error) {
      console.error('获取所有申诉记录错误:', error);
      throw error;
    }
  }

  async resolveAppeal(appealId: number, approve: boolean) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      const tx = await contractWithSigner.resolveAppeal(appealId, approve);
      
      // 获取交易收据
      const receipt = await tx.wait();
      
      // 同步到后端MongoDB
      await appealAPI.syncAppealResolution(appealId, {
        approve,
        txHash: receipt.transactionHash
      });
      
      return tx;
    } catch (error) {
      console.error('处理申诉错误:', error);
      throw error;
    }
  }

  async isAdmin(address: string): Promise<boolean> {
    try {
      if (!this.contract) {
        console.log('合约未初始化，正在初始化...');
        await this.init();
      }
      
      if (!this.contract) {
        console.error('合约初始化失败');
        return false;
      }

      console.log('正在检查管理员状态，地址:', address);
      const isAdmin = await this.contract.isAdmin(address);
      console.log('管理员状态检查结果:', isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
      }
      return false;
    }
  }

  async addAdmin(address: string) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      return await contractWithSigner.addAdmin(address);
    } catch (error) {
      console.error('添加管理员错误:', error);
      throw error;
    }
  }

  async removeAdmin(address: string) {
    if (!this.contract || !this.account) await this.init();
    
    try {
      const signer = this.provider!.getSigner();
      const contractWithSigner = this.contract!.connect(signer);
      return await contractWithSigner.removeAdmin(address);
    } catch (error) {
      console.error('移除管理员错误:', error);
      throw error;
    }
  }

  async getPendingAppealsCount(): Promise<number> {
    if (!this.contract) await this.init();
    
    try {
      const allAppeals = await this.getAllAppeals();
      return allAppeals.filter(appeal => !appeal.resolved).length;
    } catch (error) {
      console.error('获取待处理申诉数量失败:', error);
      throw error;
    }
  }

  // 添加公共方法获取合约和账户信息
  getContract() {
    return this.contract;
  }
}

export const web3Service = new Web3Service(); 