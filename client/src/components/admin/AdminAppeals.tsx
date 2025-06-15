import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { web3Service } from '../../services/web3Service';
import './AdminAppeals.css';

interface Appeal {
  id: number;
  user: string;
  pointsChange: number;
  reason: string;
  resolved: boolean;
  approved: boolean;
  timestamp: number;
  txHash?: string;
  resolveTxHash?: string;
}

const AdminAppeals: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 将 filter 的初始值从 'all' 修改为 'pending'
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/appeals');
      setAppeals(response.data.map((appeal: any) => ({
          ...appeal,
          id: appeal.id
      })));
      setError(null);
    } catch (error) {
      console.error('加载申诉记录失败:', error);
      setError('加载申诉记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAppeal = async (appealId: number, approve: boolean) => {
    try {
      setProcessingId(appealId);

      const txReceipt = await web3Service.resolveAppeal(appealId, approve);

      if (!txReceipt) {
         console.error('链上处理申诉失败，未返回交易收据。');
         alert('链上处理申诉失败，请稍后重试。');
         setProcessingId(null);
         return;
      }

      await axios.put(`http://localhost:3001/api/appeals/resolve/${appealId}`, {
        approve,
        txHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber
      });

      await loadAppeals();

      alert(approve ? '申诉已通过' : '申诉已拒绝');
    } catch (error) {
      console.error('处理申诉失败:', error);
      alert('处理申诉失败，请稍后重试');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAppeals = appeals.filter(appeal => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !appeal.resolved;
    return appeal.resolved;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className="admin-appeals-page">
        <div className="loading-spinner"></div>
        <p>正在加载申诉记录...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-appeals-page">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadAppeals}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-appeals-page">
      <div className="appeals-header">
        <h2>申诉管理</h2>
        <div className="filter-controls">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-button ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            待处理
          </button>
          <button
            className={`filter-button ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            已处理
          </button>
        </div>
      </div>

      {filteredAppeals.length === 0 ? (
        <div className="empty-state">
          <p>暂无申诉记录</p>
        </div>
      ) : (
        <div className="appeals-list">
          {filteredAppeals.map((appeal) => (
            <div key={`appeal-${appeal.id}-${appeal.timestamp}`} className="appeal-card">
              <div className="appeal-header">
                <span className="appeal-id">申诉 #{appeal.id}</span>
                <span className={`appeal-status ${appeal.resolved ? 'resolved' : 'pending'}`}>
                  {appeal.resolved ? '已处理' : '待处理'}
                </span>
              </div>

              <div className="appeal-info">
                <div className="info-item">
                  <label>用户地址:</label>
                  <span>{appeal.user}</span>
                </div>
                <div className="info-item">
                  <label>积分变更:</label>
                  <span className={`points-change ${appeal.pointsChange >= 0 ? 'positive' : 'negative'}`}>
                    {appeal.pointsChange >= 0 ? '+' : ''}{appeal.pointsChange}
                  </span>
                </div>
                <div className="info-item">
                  <label>申诉原因:</label>
                  <p className="appeal-reason">{appeal.reason}</p>
                </div>
                <div className="info-item">
                  <label>申请时间:</label>
                  <span>{formatDate(appeal.timestamp)}</span>
                </div>
                {appeal.txHash && (
                  <div className="info-item">
                    <label>申请交易哈希:</label>
                    <span className="tx-hash">{appeal.txHash}</span>
                  </div>
                )}
                 {appeal.resolveTxHash && appeal.resolved && (
                  <div className="info-item">
                    <label>处理交易哈希:</label>
                    <span className="tx-hash">{appeal.resolveTxHash}</span>
                  </div>
                 )}
              </div>

              {!appeal.resolved && (
                <div className="appeal-actions">
                  <button
                    className="action-button approve-button"
                    onClick={() => handleResolveAppeal(appeal.id, true)}
                    disabled={processingId === appeal.id}
                  >
                    {processingId === appeal.id ? '处理中...' : '通过'}
                  </button>
                  <button
                    className="action-button reject-button"
                    onClick={() => handleResolveAppeal(appeal.id, false)}
                    disabled={processingId === appeal.id}
                  >
                    {processingId === appeal.id ? '处理中...' : '拒绝'}
                  </button>
                </div>
              )}

              {appeal.resolved && (
                <div className="appeal-result">
                  <span className={`result ${appeal.approved ? 'approved' : 'rejected'}`}>
                    {appeal.approved ? '已通过' : '已拒绝'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAppeals;