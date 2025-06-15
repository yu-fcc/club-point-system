import React, { useState, useEffect } from 'react';
import { web3Service } from '../../services/web3Service';
import { ipfsService } from '../../services/ipfsService';
import './AdminRewards.css';

interface Reward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  stock: number;
  imageUrl: string;
  status: string;
}

const AdminRewards: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    pointsCost: 0,
    stock: 0,
    imageUrl: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const allRewards = await web3Service.getRewards();
      setRewards(allRewards);
      setError(null);
    } catch (error) {
      console.error('加载奖励列表失败:', error);
      setError('加载奖励列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
    }
  };

  const handleCreateReward = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedImage) {
      alert('请选择一张图片');
      return;
    }

    try {
      setUploading(true);
      
      // 确保文件大小不超过限制（例如 10MB）
      if (selectedImage.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        return;
      }

      // 确保文件类型是图片
      if (!selectedImage.type.startsWith('image/')) {
        alert('请选择有效的图片文件');
        return;
      }

      // 上传图片到IPFS
      const imageUrl = await ipfsService.uploadFile(selectedImage);
      console.log('文件上传到 IPFS 成功:', {
        fileName: selectedImage.name,
        fileType: selectedImage.type,
        fileSize: selectedImage.size,
        ipfsUrl: imageUrl
      });
      
      // 创建奖励
      await web3Service.createReward(
        newReward.name,
        newReward.description,
        newReward.pointsCost,
        newReward.stock,
        imageUrl
      );
      
      // 重置表单
      setNewReward({
        name: '',
        description: '',
        pointsCost: 0,
        stock: 0,
        imageUrl: '',
      });
      setSelectedImage(null);
      setShowCreateForm(false);
      
      // 重新加载奖励列表
      await loadRewards();
    } catch (error) {
      console.error('创建奖励失败:', error);
      alert('创建奖励失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStock = async (rewardId: number, newStock: number) => {
    try {
      await web3Service.updateRewardStock(rewardId, newStock);
      await loadRewards();
    } catch (error) {
      console.error('更新库存失败:', error);
      alert('更新库存失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="admin-rewards">
        <div className="loading-spinner"></div>
        <p>正在加载奖励列表...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-rewards">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadRewards}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-rewards">
      <div className="rewards-header">
        <h2>奖励管理</h2>
        <button 
          className="create-button"
          onClick={() => setShowCreateForm(true)}
        >
          创建新奖励
        </button>
      </div>

      {showCreateForm && (
        <div className="create-reward-form">
          <h3>创建新奖励</h3>
          <form onSubmit={handleCreateReward}>
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                value={newReward.name}
                onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={newReward.description}
                onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>所需积分</label>
              <input
                type="number"
                value={newReward.pointsCost}
                onChange={(e) => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) })}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label>库存数量</label>
              <input
                type="number"
                value={newReward.stock}
                onChange={(e) => setNewReward({ ...newReward, stock: parseInt(e.target.value) })}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label>图片</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
              />
              {selectedImage && (
                <div className="image-preview">
                  <img 
                    src={URL.createObjectURL(selectedImage)} 
                    alt="预览" 
                  />
                </div>
              )}
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={uploading}
              >
                {uploading ? '上传中...' : '创建奖励'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rewards-list">
        {rewards.map((reward) => (
          <div key={reward.id} className="reward-card">
            <div className="reward-image">
              <img src={reward.imageUrl} alt={reward.name} />
            </div>
            <div className="reward-info">
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <div className="reward-details">
                <span>所需积分: {reward.pointsCost}</span>
                <span>库存: {reward.stock}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRewards; 