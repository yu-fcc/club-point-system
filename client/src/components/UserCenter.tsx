import React, { useState, useEffect, useRef } from 'react';
import { web3Service, Task, TaskStatus, Appeal } from '../services/web3Service';
import { useNavigate } from 'react-router-dom';
import './UserCenter.css';
import axios from 'axios';
import { ipfsService } from '../services/ipfsService';

interface TaskWithDetails extends Task {
  parsedDescription: string;
  requirements: string;
  proof?: string;
}

interface FilePreview {
  type: 'image' | 'document' | 'video';
  url: string;
  name: string;
  size: string;
}

interface ProofData {
  text: string;
  fileInfo: Array<{
    name: string;
    type: string;
    size: string;
  }>;
  timestamp: number;
}

interface ExchangedReward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  timestamp: number;
}

const UserCenter: React.FC = () => {
  const [assignedTasks, setAssignedTasks] = useState<TaskWithDetails[]>([]);
  const [userAppeals, setUserAppeals] = useState<Appeal[]>([]);
  const [exchangedRewards, setExchangedRewards] = useState<ExchangedReward[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [activeTab, setActiveTab] = useState('assigned');
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [proofText, setProofText] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // 新增：筛选和搜索状态
  const [filterStatus, setFilterStatus] = useState<string>('1');
  const [searchText, setSearchText] = useState<string>('');

  // 将parseTaskDescription函数提前到useEffect和loadAllTasks之前
  const parseTaskDescription = (description: string): { parsedDescription: string; requirements: string } => {
    const requirementsMatch = description.match(/任务要求：([\s\S]*?)(?=\n|$)/);
    const requirements = requirementsMatch ? requirementsMatch[1].trim() : '';
    const parsedDescription = description.replace(/任务要求：[\s\S]*$/, '').trim();
    return { parsedDescription, requirements };
  };

  useEffect(() => {
    loadUserData();
  }, [refreshTrigger]);

  const loadUserData = async () => {
    try {
      console.log('开始加载用户数据...');
      const tasks = await web3Service.getTasks();
      const account = await web3Service.getAccount();
      const points = await web3Service.getUserPoints();
      
      console.log('获取到账户:', account);
      console.log('获取到积分:', points);
      console.log('获取到任务:', tasks.length);
      
      if (account) {
        const assigned = tasks
          .filter(task => task.assignee.toLowerCase() === account.toLowerCase())
          .map(task => ({
            ...task,
            ...parseTaskDescription(task.description)
          }));
        
        setAssignedTasks(assigned);
        setUserPoints(points);
        
        // 加载用户申诉记录
        console.log('开始加载用户申诉记录...');
        try {
          const appeals = await web3Service.getUserAppeals();
          console.log('获取到的申诉记录:', appeals);
          setUserAppeals(appeals);
        } catch (error) {
          console.error('加载申诉记录失败:', error);
        }

        // 加载用户兑换的奖励 - 从后端获取
        console.log('开始加载用户兑换的奖励 (从后端)...');
        try {
          // 1. 获取兑换记录
          const response = await axios.get(`http://localhost:3001/api/rewards/exchanged/${account}`);
          const backendExchangedRewards = response.data;

          // 2. 获取所有奖励信息
          const allRewardsResp = await axios.get('http://localhost:3001/api/rewards');
          const allRewards = allRewardsResp.data;

          // 3. 合并信息
          const formattedExchangedRewards: ExchangedReward[] = backendExchangedRewards.map((reward: any) => {
            const fullReward = allRewards.find((r: any) => r.id === reward.rewardId || r.id === reward.id);
            return {
              id: reward.rewardId || reward.id,
              name: fullReward?.name || reward.name || '',
              description: fullReward?.description || reward.description || '',
              pointsCost: reward.pointsCost,
              imageUrl: fullReward?.imageUrl || reward.imageUrl || '',
              timestamp: reward.timestamp
            };
          });

          setExchangedRewards(formattedExchangedRewards);
        } catch (error) {
          console.error('加载兑换奖励记录失败:', error);
        }
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.CREATED:
        return '待领取';
      case TaskStatus.ASSIGNED:
        return '进行中';
      case TaskStatus.SUBMITTED:
        return '待审核';
      case TaskStatus.COMPLETED:
        return '已完成';
      default:
        return '未知状态';
    }
  };

  const getStatusClass = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.CREATED:
        return 'status-created';
      case TaskStatus.ASSIGNED:
        return 'status-assigned';
      case TaskStatus.SUBMITTED:
        return 'status-submitted';
      case TaskStatus.COMPLETED:
        return 'status-completed';
      default:
        return '';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file: File): 'image' | 'document' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: File[] = [];
    const newPreviews: FilePreview[] = [];

    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`文件 ${file.name} 大小超过限制（50MB）`);
        return;
      }

      newFiles.push(file);
      const fileType = getFileType(file);
      let previewUrl = '';

      if (fileType === 'image') {
        previewUrl = URL.createObjectURL(file);
      } else if (fileType === 'video') {
        previewUrl = URL.createObjectURL(file);
      } else {
        previewUrl = getFileIcon(file.name);
      }

      newPreviews.push({
        type: fileType,
        url: previewUrl,
        name: file.name,
        size: formatFileSize(file.size)
      });
    });

    setProofFiles(prev => [...prev, ...newFiles]);
    setFilePreviews(prev => [...prev, ...newPreviews]);
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'doc':
      case 'docx':
        return '📄';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📑';
      case 'pdf':
        return '📕';
      default:
        return '📁';
    }
  };

  const removeFile = (index: number) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      const preview = prev[index];
      if (preview.type === 'image' || preview.type === 'video') {
        URL.revokeObjectURL(preview.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitTask = async (taskId: number) => {
    try {
      if (!proofText.trim() && proofFiles.length === 0) {
        alert('请提供任务完成凭证（文本说明或文件）');
        return;
      }

      // 显示加载提示
      const submitButton = document.querySelector('.submit-button') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';
      }

      // 上传所有文件到 IPFS
      const uploadedFiles = await Promise.all(
        proofFiles.map(async (file) => {
          try {
            // 使用 ipfsService 上传文件到 IPFS
            const fileUrl = await ipfsService.uploadFile(file);
            console.log('文件上传到 IPFS 成功:', {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              ipfsUrl: fileUrl
            });
            return {
              name: file.name,
              type: file.type,
              size: formatFileSize(file.size),
              url: fileUrl // 这里保存 IPFS URL
            };
          } catch (error) {
            console.error(`上传文件 ${file.name} 失败:`, error);
            throw new Error(`上传文件 ${file.name} 失败`);
          }
        })
      );

      // 构建提交数据
      const proof = JSON.stringify({
        text: proofText.slice(0, 500), // 限制文本长度为500字符
        fileInfo: uploadedFiles,
        timestamp: Date.now()
      });

      await web3Service.submitTask(taskId, proof);
      
      alert('任务提交成功！');
      loadUserData();
      setShowModal(false);
      setProofText('');
      setProofFiles([]);
      setFilePreviews([]);
    } catch (error) {
      console.error('提交任务失败:', error);
      alert('提交任务失败，请重试。可能的原因：\n1. 网络问题\n2. 智能合约调用失败\n3. Gas 费用不足');
    } finally {
      // 恢复按钮状态
      const submitButton = document.querySelector('.submit-button') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '提交任务';
      }
    }
  };

  const openTaskDetails = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setShowModal(true);
    setProofText('');
    setProofFiles([]);
    setFilePreviews([]);
  };

  const renderTaskSubmissionForm = () => {
    if (!selectedTask || selectedTask.status !== TaskStatus.ASSIGNED) {
      return null;
    }

    return (
      <div className="task-submission-form">
        <h3>提交任务完成凭证</h3>
        <div className="form-group">
          <label>完成说明：</label>
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            placeholder="请详细描述任务完成情况..."
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>上传文件：</label>
          <input
            type="file"
            accept="image/*,video/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
          />
          <button 
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </button>
          <div className="file-list">
            {filePreviews.map((preview, index) => (
              <div key={index} className="file-preview">
                {preview.type === 'image' && (
                  <img src={preview.url} alt={preview.name} />
                )}
                {preview.type === 'video' && (
                  <video src={preview.url} controls />
                )}
                {preview.type === 'document' && (
                  <div className="document-preview">
                    <span className="file-icon">{preview.url}</span>
                  </div>
                )}
                <div className="file-info">
                  <span className="file-name">{preview.name}</span>
                  <span className="file-size">{preview.size}</span>
                </div>
                <button 
                  className="remove-file"
                  onClick={() => removeFile(index)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getAppealStatusText = (resolved: boolean, approved: boolean) => {
    if (!resolved) return '处理中';
    return approved ? '已通过' : '已驳回';
  };

  const getAppealStatusClass = (resolved: boolean, approved: boolean) => {
    if (!resolved) return 'status-submitted';
    return approved ? 'status-completed' : 'status-created';
  };

  const handleViewPointsHistory = () => {
    navigate('/history');
  };

  // 新增：筛选后的任务
  const filteredAssignedTasks = assignedTasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || String(task.status) === filterStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (task.parsedDescription && task.parsedDescription.toLowerCase().includes(searchText.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="user-center">
      <div className="user-center-header">
        <h2>个人中心</h2>
        <div className="points-display">
          <span className="points-label">当前积分：</span>
          <span className="points-value">{userPoints}</span>
          <button className="points-history-button" onClick={() => navigate('/history')}>
            积分详情
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned')}
        >
          我的任务
        </button>
        <button
          className={`tab-button ${activeTab === 'appeals' ? 'active' : ''}`}
          onClick={() => setActiveTab('appeals')}
        >
          我的申诉
        </button>
        <button
          className={`tab-button ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          我的奖励
        </button>
      </div>

      <div className="tasks-container">
        {activeTab === 'assigned' ? (
          <>
            {/* 筛选区 */}
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="status-filter"
                style={{ padding: '6px 12px', borderRadius: '6px' }}
              >
                <option value="all">所有状态</option>
                <option value="0">待领取</option>
                <option value="1">待完成</option>
                <option value="2">待审核</option>
                <option value="3">已完成</option>
                <option value="4">已拒绝</option>
              </select>
              <input
                type="text"
                placeholder="搜索任务..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="search-input"
                style={{ padding: '6px 12px', borderRadius: '6px', minWidth: '200px' }}
              />
            </div>
            {/* 任务列表 */}
            {filteredAssignedTasks.length > 0 ? (
              <div className="task-list">
                {filteredAssignedTasks
                  .sort((a, b) => b.id - a.id)
                  .map((task, index) => (
                    <div 
                      key={`assigned-${task.id}-${index}`} 
                      className="task-item" 
                      onClick={() => openTaskDetails(task)}
                    >
                      <div className="task-info">
                        <h3>{task.title}</h3>
                        <div className="task-meta">
                          <span>截止日期：{formatDate(task.deadline)}</span>
                          <span className="separator">|</span>
                          <span>积分奖励：{task.points}</span>
                          <span className="separator">|</span>
                          <span className={`status ${getStatusClass(task.status)}`}>{getStatusText(task.status)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state">暂无符合条件的任务</div>
            )}
          </>
        ) : activeTab === 'appeals' ? (
          <div className="appeals-list">
            {userAppeals.map(appeal => (
              <div key={appeal.id} className="appeal-item">
                <div className="appeal-info">
                  <h3>申诉 #{appeal.id}</h3>
                  <p>{appeal.reason}</p>
                  <div className="appeal-meta">
                    <span className={`status ${getAppealStatusClass(appeal.resolved, appeal.approved)}`}>
                      {getAppealStatusText(appeal.resolved, appeal.approved)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rewards-list">
            {exchangedRewards.map(reward => (
              <div key={reward.id} className="reward-item">
                <img src={reward.imageUrl} alt={reward.name} className="reward-image" />
                <div className="reward-info">
                  <h3>{reward.name}</h3>
                  <p>{reward.description}</p>
                  <div className="reward-meta">
                    <span>消耗积分：{reward.pointsCost}</span>
                    <span className="timestamp">
                      {new Date(reward.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTask.title}</h2>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="task-detail-item">
                <label>任务描述：</label>
                <p>{selectedTask.parsedDescription}</p>
              </div>
              <div className="task-detail-item">
                <label>任务要求：</label>
                <p>{selectedTask.requirements}</p>
              </div>
              <div className="task-detail-meta">
                <div className="meta-item">
                  <label>截止日期</label>
                  <span>{formatDate(selectedTask.deadline)}</span>
                </div>
                <div className="meta-item">
                  <label>积分奖励</label>
                  <span>{selectedTask.points}</span>
                </div>
                <div className="meta-item">
                  <label>状态</label>
                  <span className={`status ${getStatusClass(selectedTask.status)}`}>
                    {getStatusText(selectedTask.status)}
                  </span>
                </div>
              </div>
              {renderTaskSubmissionForm()}
            </div>
            <div className="modal-footer">
              {selectedTask.status === TaskStatus.ASSIGNED && (
                <button
                  className="submit-button"
                  onClick={() => handleSubmitTask(selectedTask.id)}
                >
                  提交任务
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCenter;