import axios from 'axios';

// 设置基础URL，可以从环境变量中读取
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 任务相关API
export const taskAPI = {
  // 同步创建任务数据到MongoDB
  syncTaskCreation: async (data: any) => {
    try {
      const response = await api.post('/tasks', data);
      if (!response.data.success) {
        throw new Error(response.data.error || '创建任务失败');
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('创建任务失败');
    }
  },
  
  // 同步任务分配数据到MongoDB
  syncTaskAssignment: async (taskId: number, data: any) => {
    return await api.put(`/tasks/assign/${taskId}`, data);
  },
  
  // 同步任务提交数据到MongoDB
  syncTaskSubmission: async (taskId: number, data: any) => {
    return await api.put(`/tasks/submit/${taskId}`, data);
  },
  
  // 同步任务批准数据到MongoDB
  syncTaskApproval: async (taskId: number, data: any) => {
    return await api.put(`/tasks/approve/${taskId}`, data);
  },

  rejectTask: async (taskId: number) => {
    return await api.put(`/tasks/reject/${taskId}`);
  }
};

// 奖励相关API
export const rewardAPI = {
  // 同步创建奖励数据到MongoDB
  syncRewardCreation: async (data: any) => {
    return await api.post('/rewards', data);
  },
  
  // 同步更新奖励库存数据到MongoDB
  syncRewardStockUpdate: async (rewardId: number, data: any) => {
    return await api.put(`/rewards/stock/${rewardId}`, data);
  },
  
  // 同步奖励兑换数据到MongoDB
  syncRewardExchange: async (data: any) => {
    return await api.post('/rewards/exchange', data);
  }
};

// 申诉相关API
export const appealAPI = {
  // 同步创建申诉数据到MongoDB
  syncAppealCreation: async (data: any) => {
    return await api.post('/appeals', data);
  },
  
  // 同步申诉处理数据到MongoDB
  syncAppealResolution: async (appealId: number, data: any) => {
    return await api.put(`/appeals/resolve/${appealId}`, data);
  }
};

// 积分历史相关API
export const pointsAPI = {
  // 同步积分历史数据到MongoDB
  syncPointsHistory: async (data: any) => {
    return await api.post('/points/history', data);
  }
};

export default {
  taskAPI,
  rewardAPI,
  appealAPI,
  pointsAPI
}; 