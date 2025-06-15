import React, { useState, useEffect } from 'react';
import { web3Service } from '../../services/web3Service';
import './AdminSettings.css';

const AdminSettings: React.FC = () => {
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      // 这里需要实现获取所有管理员地址的逻辑
      // 由于合约中没有直接获取所有管理员的方法，我们需要通过事件或其他方式实现
      const currentAccount = await web3Service.getAccount();
      if (currentAccount) {
        const isAdmin = await web3Service.isAdmin(currentAccount);
        if (isAdmin) {
          setAdmins([currentAccount]);
        }
      }
    } catch (error) {
      console.error('加载管理员列表失败:', error);
      setError('加载管理员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminAddress) {
      setError('请输入管理员地址');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await web3Service.addAdmin(newAdminAddress);
      setNewAdminAddress('');
      await loadAdmins();
    } catch (error) {
      console.error('添加管理员失败:', error);
      setError('添加管理员失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (address: string) => {
    if (!window.confirm('确定要移除这个管理员吗？')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await web3Service.removeAdmin(address);
      await loadAdmins();
    } catch (error) {
      console.error('移除管理员失败:', error);
      setError('移除管理员失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-settings">
      <h2>管理员设置</h2>
      
      <div className="add-admin-section">
        <h3>添加新管理员</h3>
        <div className="add-admin-form">
          <input
            type="text"
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
            placeholder="输入管理员钱包地址"
          />
          <button 
            onClick={handleAddAdmin}
            disabled={loading}
          >
            {loading ? '处理中...' : '添加管理员'}
          </button>
        </div>
      </div>

      <div className="admin-list-section">
        <h3>管理员列表</h3>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="admin-list">
            {admins.map((address) => (
              <div key={address} className="admin-item">
                <span className="admin-address">{address}</span>
                <button
                  onClick={() => handleRemoveAdmin(address)}
                  disabled={loading}
                  className="remove-button"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default AdminSettings; 