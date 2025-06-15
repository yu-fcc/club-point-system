import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { web3Service } from '../services/web3Service'; 
import axios from 'axios'; 
import './PointsHistory.css';


interface BackendPointsHistory {
  _id: string; 
  id: number; 
  user: string; 
  timestamp: number; 
  pointsChange: number;
  title: string;
  type: 'task' | 'reward' | string; 
  status: 'finished' | 'exchanged' | string;
  txHash?: string; 
  blockNumber?: number; 

}


const PointsHistoryPage: React.FC = () => {
 
  const [history, setHistory] = useState<BackendPointsHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
 
  const [selectedRecord, setSelectedRecord] = useState<BackendPointsHistory | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const navigate = useNavigate();

  const MAX_APPEAL_REASON_LENGTH = 500;

  useEffect(() => {
   
    const initializeAndLoad = async () => {
      try {
        
        await web3Service.init();
        await loadHistory(); 
      } catch (err) {
       
        setError('初始化或连接钱包失败，无法加载历史记录。'); 
        console.error('Initialization error:', err);
        setLoading(false);
      }
    };
    initializeAndLoad();

    

  }, []); 

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

     
      const currentAccount = await web3Service.getAccount(); 
      if (!currentAccount) {
        setError('未连接钱包，请连接您的钱包以查看历史记录。');
        setLoading(false);
        return;
      }

      
      console.log(`尝试从后端获取用户 ${currentAccount} 的积分历史记录...`);
      
      const response = await axios.get(`http://localhost:3001/api/points/history/${currentAccount}`);
      console.log('从后端获取到积分历史记录:', response.data);
      
      setHistory(response.data);

    } catch (err) {
      console.error('加载积分历史记录失败:', err);
     
      if (axios.isAxiosError(err)) {
        console.error('Axios错误详情:', err.message, err.response?.status, err.response?.data);
        
        if (err.response?.status === 404) {
             setError('无法获取历史记录：该账户没有记录或后端API路径错误。');
        } else {
             setError(`加载积分历史记录失败: ${err.message}`);
        }
      } else if (err instanceof Error && err.message.includes('钱包')) { 
         setError(`钱包错误: ${err.message}`);
      }
      else {
           console.error('其他加载错误:', err);
           setError('加载积分历史记录失败，请检查控制台错误。');
      }
    } finally {
      setLoading(false);
    }
  };

  
  const handleAppealClick = (record: BackendPointsHistory) => {
    setSelectedRecord(record);
    setShowAppealModal(true);
  };

  const handleAppealSubmit = async () => {
    if (!selectedRecord || !appealReason.trim()) {
      alert('请填写申诉理由');
      return;
    }

    if (appealReason.length > MAX_APPEAL_REASON_LENGTH) {
      alert(`申诉理由不能超过${MAX_APPEAL_REASON_LENGTH}字`);
      return;
    }

    try {
      setSubmittingAppeal(true);

      
      await web3Service.init(); 
     
      const pointsChangeValue = Math.floor(Math.abs(selectedRecord.pointsChange));

      await web3Service.createAppeal(pointsChangeValue, appealReason);

      alert('申诉提交成功！');
      setShowAppealModal(false);
      setAppealReason('');
      setSelectedRecord(null);
     
      await loadHistory();
    } catch (error) {
      console.error('提交申诉失败:', error);
      const errorMessage = error instanceof Error ? error.message : '提交申诉失败，请重试';
      alert(errorMessage);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  
  const formatDate = (timestamp: number) => {
   
     const date = new Date(timestamp); 
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
      <div className="points-history-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="points-history-container">
        <div className="error-state">
          <p>{error}</p>
          {/* 修改这里：调用 web3Service.init() 来触发钱包连接 */}
           {error.includes('钱包') ? ( // 如果错误信息包含"钱包"字样
               <button className="connect-wallet-button" onClick={async () => {
                  setError(null); 
                  setLoading(true); 
                  try {
                      await web3Service.init(); 
                      await loadHistory(); 
                  } catch (err) {
                       console.error('连接钱包失败:', err);
                       setError('连接钱包失败，请重试。');
                       setLoading(false);
                  }
               }}>
                 连接钱包
               </button>
           ) : (
               <button className="retry-button" onClick={loadHistory}>
                 重试加载历史记录
               </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="points-history-container">
      <div className="points-history-header">
        <h2>我的积分详情</h2>
        <button className="back-button" onClick={() => navigate('/user')}>
          返回
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>暂无积分变动记录</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((record) => (
            
            <div key={record._id || record.id} className="history-item">
              <div className="history-item-header">
                <span className="history-title">{record.title}</span>
              </div>
              <div className="history-item-details">
                {/* 根据你的 type 字段值显示类型 */}
                <span className="history-type">{record.type === 'task' ? '任务奖励' : record.type === 'reward' ? '奖励兑换' : record.type}</span>
                <span className={`history-points ${record.pointsChange > 0 ? 'positive' : 'negative'}`}>
                  {record.pointsChange > 0 ? '+' : ''}{record.pointsChange}
                </span>
              </div>
              <div className="history-item-footer">
                {/* 注意时间戳单位，如果后端是秒，前端需要乘以1000 */}
                <span className="history-time">{formatDate(record.timestamp * 1000)}</span>
                {/* 修改条件，例如总是显示申诉按钮 */}
                <button
                  className="appeal-button"
                  onClick={() => handleAppealClick(record)}
                >
                  申诉
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAppealModal && (
        <div className="modal-overlay">
          <div className="appeal-modal">
            <h3>积分申诉</h3>
            <div className="appeal-content">
              <p>
                <strong>积分变动：</strong>
                <span className={selectedRecord && selectedRecord.pointsChange > 0 ? 'positive' : 'negative'}>
                  {selectedRecord && selectedRecord.pointsChange > 0 ? '+' : ''}{selectedRecord?.pointsChange}
                </span>
              </p>
              <p>
                <strong>事件：</strong>
                {selectedRecord?.title}
              </p>
              <div className="appeal-reason">
                <label htmlFor="appealReason">申诉理由：</label>
                <textarea
                  id="appealReason"
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="请详细描述您的申诉理由..."
                  rows={4}
                  maxLength={MAX_APPEAL_REASON_LENGTH}
                />
                <div className="character-count">
                  {appealReason.length}/{MAX_APPEAL_REASON_LENGTH}
                </div>
              </div>
            </div>
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowAppealModal(false);
                  setAppealReason('');
                  setSelectedRecord(null);
                }}
              >
                取消
              </button>
              <button
                className="submit-button"
                onClick={handleAppealSubmit}
                disabled={submittingAppeal || !appealReason.trim()}
              >
                {submittingAppeal ? '提交中...' : '提交申诉'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsHistoryPage;