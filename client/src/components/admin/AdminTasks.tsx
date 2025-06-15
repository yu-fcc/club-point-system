import React, { useState, useEffect, useRef } from 'react';
import { Task, web3Service } from '../../services/web3Service';
import { taskAPI } from '../../services/apiService';
import axios from 'axios';
import TaskDetailModal from './TaskDetailModal';
import './AdminTasks.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: '',
    deadline: '',
    requirements: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
      
      await web3Service.createTask(
        formData.title,
        `${formData.description}\n\n任务要求：${formData.requirements}`,
        parseInt(formData.points),
        deadlineTimestamp
      );

      alert('任务发布成功！');
      
      setFormData({
        title: '',
        description: '',
        points: '',
        deadline: '',
        requirements: ''
      });
      onClose();
      
      onSuccess();
    } catch (err) {
      console.error('发布任务错误:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('发布任务失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>发布新任务</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-row">
            <div className="form-group">
              <label>任务标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入任务标题"
                required
              />
            </div>
            <div className="form-group">
              <label>积分奖励</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                placeholder="请输入积分数量"
                required
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label>任务描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请详细描述任务内容、要求和完成标准"
              required
            />
          </div>

          <div className="form-group">
            <label>任务要求</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="请详细说明完成任务需要满足的要求，例如：需要完成的具体工作内容、提交的材料、达到的标准等"
              required
            />
          </div>

          <div className="form-group">
            <label>截止时间</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-button">
              取消
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '发布中...' : '发布任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: '0',
    search: ''
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [approvingTask, setApprovingTask] = useState<number | null>(null);
  const [rejectingTask, setRejectingTask] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/tasks');
      console.log('获取任务列表:', response.data);
      setTasks(response.data.tasks);
      setError(null);
    } catch (error) {
      console.error('加载任务列表失败:', error);
      setError('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return '待领取';
      case 1:
        return '待完成';
      case 2:
        return '待审核';
      case 3:
        return '已通过';
      case 4:
        return '未通过';
      default:
        return '未知状态';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0:
        return 'status-created';
      case 1:
        return 'status-assigned';
      case 2:
        return 'status-submitted';
      case 3:
        return 'status-completed';
      case 4:
        return 'status-rejected';
      default:
        return '';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter.status === 'all' || task.status === parseInt(filter.status);
    const matchesSearch = task.title.toLowerCase().includes(filter.search.toLowerCase()) ||
                         task.description.toLowerCase().includes(filter.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleApproveTask = async (taskId: number) => {
    try {
      setApprovingTask(taskId);
      const txReceipt = await web3Service.approveTask(taskId);
      
      if (!txReceipt) {
        throw new Error('审批失败，未收到交易收据');
      }

      try {
        await axios.post('http://localhost:3001/api/tasks/approve', {
          taskId,
          txHash: txReceipt.transactionHash,
          blockNumber: txReceipt.blockNumber
        });
      } catch (apiError) {
        console.error('后端API调用失败:', apiError);
      }

      await loadTasks();
      alert('审批成功！');
    } catch (error) {
      console.error('审批任务失败:', error);
      if (error instanceof Error && error.message === '审批失败，未收到交易收据') {
        alert('审批失败，请稍后重试');
      }
    } finally {
      setApprovingTask(null);
    }
  };

  const handleRejectTask = async (taskId: number) => {
    try {
      setRejectingTask(taskId);
      // 使用 taskAPI 替代 web3Service
      await taskAPI.rejectTask(taskId);
      
      try {
        await axios.post('http://localhost:3001/api/tasks/reject', {
          taskId
        });
      } catch (apiError) {
        console.error('后端API调用失败:', apiError);
      }

      await loadTasks();
      alert('驳回成功！');
    } catch (error) {
      console.error('驳回任务失败:', error);
      alert('驳回失败，请稍后重试');
    } finally {
      setRejectingTask(null);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const formatAddress = (address: string | null) => {
    if (!address) return '未领取';
    return address;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="admin-tasks">
      <div className="admin-tasks-header">
        <h2>任务管理</h2>
        <div className="header-actions">
          <button 
            className="create-task-button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            发布任务
          </button>
          <div className="filters">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="status-filter"
            >
              <option value="all">所有状态</option>
              <option value="0">待领取</option>
              <option value="1">待完成</option>
              <option value="2">待审核</option>
              <option value="3">已通过</option>
              <option value="4">未通过</option>
            </select>
            <input
              type="text"
              placeholder="搜索任务..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">暂无匹配的任务</div>
      ) : (
        <div className="tasks-table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>创建者</th>
                <th>领取者</th>
                <th>积分</th>
                <th>状态</th>
                <th>截止日期</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>
                    <span className="task-title-link" onClick={() => openTaskDetails(task)}>
                      {task.title}
                    </span>
                  </td>
                  <td className="address">{formatAddress(task.creator)}</td>
                  <td className="address">{formatAddress(task.assignee)}</td>
                  <td>{task.points}</td>
                  <td>
                    <span className={`task-status ${getStatusClass(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                  </td>
                  <td>{new Date(task.deadline * 1000).toLocaleString()}</td>
                  <td>{new Date(task.timestamp * 1000).toLocaleString()}</td>
                  <td className="task-actions">
                    {task.status === 2 && (
                      <>
                        <button 
                          className="action-icon approve-button"
                          onClick={() => handleApproveTask(task.id)}
                          disabled={approvingTask === task.id || rejectingTask === task.id}
                        >
                          同意
                        </button>
                        <button 
                          className="action-icon reject-button"
                          onClick={() => handleRejectTask(task.id)}
                          disabled={approvingTask === task.id || rejectingTask === task.id}
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    <button 
                      className="action-icon view-button"
                      onClick={() => openTaskDetails(task)}
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
        onApprove={handleApproveTask}
        onReject={handleRejectTask}
      />
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadTasks}
      />
    </div>
  );
};

export default AdminTasks; 