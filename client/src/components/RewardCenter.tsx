import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { web3Service } from '../services/web3Service'; 
import './RewardCenter.css';

interface Reward {
  id: number; 
  name: string;
  description: string;
  pointsCost: number;
  stock: number;
  imageUrl: string;
  status: number;
}

interface RewardCenterProps {
  onRefresh?: () => void;
}

const CURRENT_USER_ID = 'user123'; 

const RewardCenter: React.FC<RewardCenterProps> = ({ onRefresh }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [exchangingRewards, setExchangingRewards] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadRewardsAndPoints();
  }, []);

  const loadRewardsAndPoints = async () => {
    try {
      setLoading(true);
     
      const rewardsResponse = await axios.get('http://localhost:3001/api/rewards');
      console.log('获取奖励数据:', rewardsResponse.data);
      setRewards(rewardsResponse.data);

      console.log('尝试从链上获取用户积分...');
      const points = await web3Service.getUserPoints(); 
      console.log('从链上获取到用户积分:', points);
      setUserPoints(points);

    } catch (error) {
      console.error('加载奖励信息或积分失败:', error);
     
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误信息:', error.response.data);
        } else if (error.request) {
          console.error('没有收到响应:', error.request);
        } else {
          console.error('请求配置错误:', error.message);
        }
      } else {
        console.error('从链上加载积分失败:', error); 
        alert('无法加载用户积分，请确保钱包已连接并切换到正确的网络和账户。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = async (rewardId: number) => {
    try {
      setExchangingRewards(prev => ({ ...prev, [rewardId]: true }));
      
      const txReceipt = await web3Service.exchangeReward(rewardId);
      
      if (!txReceipt) {
        throw new Error('兑换失败，未收到交易收据');
      }

      try {
        await axios.post('http://localhost:3001/api/rewards/exchange', {
          rewardId,
          txHash: txReceipt.transactionHash,
          blockNumber: txReceipt.blockNumber
        });
      } catch (apiError) {
        console.error('后端API调用失败:', apiError);
      }

      await loadRewardsAndPoints();
      
      if (onRefresh) {
        onRefresh();
      }
      
      alert('兑换成功！');
    } catch (error) {
      console.error('兑换奖励失败:', error);
      if (error instanceof Error && error.message === '兑换失败，未收到交易收据') {
        alert('兑换失败，请稍后重试');
      }
    } finally {
      setExchangingRewards(prev => ({ ...prev, [rewardId]: false }));
    }
  };

  const handleImageError = (rewardId: number) => {
    setImageErrors(prev => ({ ...prev, [rewardId]: true }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="reward-center">
      <div className="reward-header">
        <h2>兑换中心</h2>
        <div className="user-points">
          当前积分: <span>{userPoints}</span>
        </div>
      </div>

      <div className="rewards-grid">
        {rewards.map((reward) => (
          <div key={reward.id} className="reward-card">
            <div className="reward-image-container">
              {imageErrors[reward.id] ? (
                <div className="image-error-placeholder">
                  <span>图片加载失败</span>
                </div>
              ) : (
                <img
                  src={reward.imageUrl}
                  alt={reward.name}
                  className="reward-image"
                  onError={() => handleImageError(reward.id)}
                />
              )}
              {reward.stock <= 0 && <div className="sold-out-overlay">已售罄</div>}
            </div>
            <div className="reward-info">
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <div className="reward-footer">
                <span className="points-cost">{reward.pointsCost} 积分</span>
                <span className={`stock ${reward.stock <= 0 ? 'out-of-stock' : ''}`}>
                  库存: {reward.stock}
                </span>
              </div>
              <button
                className={`exchange-button ${exchangingRewards[reward.id] ? 'exchanging' : ''}`}
                onClick={() => handleExchange(reward.id)}
                disabled={exchangingRewards[reward.id] || userPoints < reward.pointsCost || reward.stock <= 0}
              >
                {exchangingRewards[reward.id] ? '兑换中...' : reward.stock <= 0 ? '已售罄' : '立即兑换'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RewardCenter;