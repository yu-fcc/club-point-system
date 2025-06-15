import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { web3Service } from '../../services/web3Service';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalRewards: 0,
    pendingAppeals: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();

    // 添加快捷键监听
    const handleKeyPress = (event: KeyboardEvent) => {
      // 按下 Alt + T 跳转到任务管理页面
      if (event.altKey && event.key.toLowerCase() === 't') {
        navigate('/admin/tasks');
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyPress);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate]);

  const loadStats = async () => {
    try {
      const taskCount = await web3Service.getTaskCount();
      const rewardCount = await web3Service.getRewardCount();
      const pendingAppealsCount = await web3Service.getPendingAppealsCount();
      
      setStats({
        totalTasks: taskCount,
        totalRewards: rewardCount,
        pendingAppeals: pendingAppealsCount
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>管理控制台</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>总任务数</h3>
          <p>{stats.totalTasks}</p>
        </div>
        <div className="stat-card">
          <h3>总奖励数</h3>
          <p>{stats.totalRewards}</p>
        </div>
        <div className="stat-card">
          <h3>待处理申诉</h3>
          <p>{stats.pendingAppeals}</p>
        </div>
      </div>

      <div className="quick-actions">
        <button 
          className="action-button"
          onClick={() => navigate('/admin/tasks')}
        >
          任务管理
          <span className="shortcut-hint">Alt + T</span>
        </button>
        <button 
          className="action-button"
          onClick={() => navigate('/admin/rewards')}
        >
          奖励管理
        </button>
        <button 
          className="action-button"
          onClick={() => navigate('/admin/appeals')}
        >
          申诉管理
        </button>
      </div>

      <div className="shortcut-tips">
        <h3>快捷键提示</h3>
        <p>Alt + T：快速跳转到任务管理页面</p>
      </div>
    </div>
  );
};

export default AdminDashboard; 