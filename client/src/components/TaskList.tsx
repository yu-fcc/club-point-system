import React, { useState, useEffect } from 'react';
import axios from 'axios'; // 引入 axios 用于后端API调用
import { web3Service, Task, TaskStatus } from '../services/web3Service'; // 保留 web3Service 用于链上任务领取
import './TaskList.css';

interface TaskListProps {
  onTaskAssigned?: () => void;
}

// 假设后端返回的任务结构与现有的 Task 接口兼容
interface BackendTask extends Task {
  _id?: string;
  txHash?: string;
  blockNumber?: number;
  // 如果后端任务结构与 Task 接口有差异，需要在这里调整或创建新的接口
  // 例如，如果数据库ID是 _id: string; 而 Task接口只有 id: number;
  // 需要在映射时进行转换
}


interface ParsedTask extends BackendTask { // 基于 BackendTask 接口扩展
  parsedDescription: string;
  requirements: string;
}

const TaskList: React.FC<TaskListProps> = ({ onTaskAssigned }) => {
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ParsedTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // 新增：筛选状态，默认只显示待领取任务
  const [filterStatus, setFilterStatus] = useState<'all' | '0' | '1'>('0');

  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  const refreshTasks = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const parseTaskDescription = (description: string): { parsedDescription: string; requirements: string } => {
    const requirementsMatch = description.match(/任务要求：([\s\S]*?)(?=\n|$)/);
    const requirements = requirementsMatch ? requirementsMatch[1].trim() : '';
    const parsedDescription = description.replace(/任务要求：[\s\S]*?$/, '').trim();
    return { parsedDescription, requirements };
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('尝试从后端获取任务列表...');
      const response = await axios.get('http://localhost:3001/api/tasks');
      console.log('从后端获取到任务数据:', response.data);
      
      // 检查响应格式
      if (!response.data.success) {
        throw new Error(response.data.error || '获取任务列表失败');
      }

      // 确保 tasks 数组存在
      const taskList: BackendTask[] = response.data.tasks || [];
      console.log('处理后的任务列表:', taskList);

      const parsedTasks: ParsedTask[] = taskList.map(task => ({
        ...task,
        ...parseTaskDescription(task.description)
      }));
      setTasks(parsedTasks);

    } catch (error) {
      console.error('加载任务列表失败:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios错误详情:', error.message, error.response?.status, error.response?.data);
        if (error.response?.status === 404) {
          setError('无法获取任务列表：后端API不存在或路径错误');
        } else if (error.response?.status === 500) {
          setError('服务器错误，请稍后重试');
        } else {
          setError(`加载任务列表失败: ${error.message}`);
        }
      } else {
        setError('加载任务列表失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: ParsedTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleAssignTask = async (taskId: number) => {
    try {
      // **保留这里：任务领取仍通过 web3Service 进行链上操作**
      console.log(`尝试领取任务 ID: ${taskId} (链上操作)`);
      // 假设 web3Service.assignTask 负责链上任务领取逻辑并触发钱包
      await web3Service.assignTask(taskId);

      alert('任务领取成功！');
      // 领取成功后刷新列表，从后端获取最新状态
      await loadTasks();
      if (onTaskAssigned) {
        onTaskAssigned();
      }
    } catch (error) {
      console.error('领取任务失败:', error);
      // 添加更详细的错误处理
      if (error instanceof Error) {
         alert(`领取任务失败: ${error.message}`);
      } else {
         alert('领取任务失败，请重试');
         console.error('领取任务过程中的其他错误:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  if (loading) {
    return (
      <div className="task-list-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list-container">
        <div className="error-state">
          <p>{error}</p>
          <button className="retry-button" onClick={loadTasks}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      <h2 className="task-list-title">最新任务</h2>
      {/* 新增：筛选框 */}
      <div className="task-filters" style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | '0' | '1')}
        >
          <option value="0">待领取任务</option>
          <option value="1">已领取任务</option>
          <option value="all">全部任务</option>
        </select>
      </div>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>暂无任务</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks
            .filter(task => {
              if (filterStatus === 'all') return true;
              if (filterStatus === '0') return task.status === TaskStatus.CREATED;
              if (filterStatus === '1') return task.status === TaskStatus.ASSIGNED;
              return true;
            })
            .map((task) => (
              // 使用 task.id 作为 key，假设后端返回的任务有 id 字段
              <div
                key={task.id}
                className="task-item"
                onClick={() => handleTaskClick(task)}
              >
                <div className="task-info">
                  <h3>{task.title}</h3>
                  <div className="task-meta">
                    <span>截止日期：{formatDate(task.deadline)}</span>
                    <span className="separator">|</span>
                    <span>积分奖励：{task.points}</span>
                    {/* 假设后端返回的任务数据中包含了 assignee 字段 */}
                    {task.status !== TaskStatus.CREATED && task.assignee && (
                      <>
                        <span className="separator">|</span>
                        <span>领取者：{task.assignee.slice(0, 6)}...{task.assignee.slice(-4)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="task-actions">
                  {task.status === TaskStatus.CREATED ? (
                    <button
                      className="assign-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignTask(task.id);
                      }}
                    >
                      领取任务
                    </button>
                  ) : (
                    <button
                      className="assign-button disabled"
                      disabled
                    >
                      已被领取
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {isModalOpen && selectedTask && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTask.title}</h2>
              <span className={`status ${getStatusClass(selectedTask.status)}`}>
                {getStatusText(selectedTask.status)}
              </span>
            </div>
            <div className="modal-info">
              <p><strong>发布者:</strong> {selectedTask.creator}</p>
              <p><strong>截止日期:</strong> {formatDate(selectedTask.deadline)}</p>
              <p><strong>奖励积分:</strong> {selectedTask.points}</p>
              <div className="task-description">
                <p><strong>任务描述:</strong></p>
                <div className="description-content">{selectedTask.parsedDescription}</div>
              </div>
              <div className="task-requirements">
                <p><strong>任务要求:</strong></p>
                <div className="requirements-content">{selectedTask.requirements}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="close-button" onClick={() => setIsModalOpen(false)}>
                关闭
              </button>
              {selectedTask.status === TaskStatus.CREATED && (
                <button
                  className="assign-button"
                  onClick={() => {
                    handleAssignTask(selectedTask.id);
                    setIsModalOpen(false);
                  }}
                >
                  领取任务
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;