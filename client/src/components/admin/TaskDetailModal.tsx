import React, { useState } from 'react';
import { Task } from '../../services/web3Service';
import './AdminTasks.css';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (taskId: number) => void;
  onReject: (taskId: number) => void;
}

interface FileInfo {
  name: string;
  type: string;
  size: string;
  url: string;
}

interface ProofData {
  text: string;
  fileInfo: FileInfo[];
  timestamp: number;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

  if (!isOpen || !task) return null;

  const handlePreviewFile = async (fileUrl: string, fileName: string) => {
    try {
      setLoading(true);
      // 从 IPFS 获取文件
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('文件获取失败');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFileName(fileName);
    } catch (error) {
      console.error('预览文件失败:', error);
      alert('预览文件失败，请检查文件链接是否有效');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      setLoading(true);
      // 从 IPFS 获取文件
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('文件获取失败');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 清理
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      alert('下载文件失败，请检查文件链接是否有效');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('确定要通过这个任务吗？')) return;
    setLoading(true);
    try {
      await onApprove(task.id);
      onClose();
    } catch (error) {
      console.error('审核失败:', error);
      alert('审核失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('确定要拒绝这个任务吗？')) return;
    setLoading(true);
    try {
      await onReject(task.id);
      onClose();
    } catch (error) {
      console.error('拒绝失败:', error);
      alert('拒绝失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      default:
        return 'other';
    }
  };

  const renderFilePreview = (fileUrl: string, fileName: string) => {
    const fileType = getFileType(fileName);
    
    if (previewUrl) {
      return (
        <div className="file-preview-container">
          <div className="file-preview-header">
            <h4>文件预览 - {previewFileName}</h4>
            <button onClick={handleClosePreview} className="close-preview-button">关闭</button>
          </div>
          {fileType === 'image' ? (
            <img src={previewUrl} alt="预览图片" className="preview-image" />
          ) : fileType === 'pdf' ? (
            <iframe src={previewUrl} className="preview-pdf" />
          ) : (
            <div className="preview-other">
              <p>此文件类型暂不支持预览</p>
              <button 
                onClick={() => handleDownloadFile(fileUrl, fileName)}
                className="download-link"
                disabled={loading}
              >
                {loading ? '下载中...' : '下载文件'}
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="file-preview-placeholder">
        <p>点击文件名预览文件内容</p>
      </div>
    );
  };

  // 解析 proof 字段
  const parseProofData = (): ProofData => {
    if (!task.proof) return { text: '', fileInfo: [], timestamp: 0 };
    try {
      const data = JSON.parse(task.proof);
      return {
        text: data.text || '',
        fileInfo: Array.isArray(data.fileInfo) ? data.fileInfo : [],
        timestamp: data.timestamp || 0
      };
    } catch {
      return { text: task.proof, fileInfo: [], timestamp: 0 };
    }
  };

  const proofData = parseProofData();

  return (
    <div className="modal-overlay">
      <div className="modal-content task-detail-modal">
        <div className="modal-header">
          <h3>任务详情</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="task-detail-content">
          <div className="task-info-section">
            <h4>基本信息</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>任务ID:</label>
                <span>{task.id}</span>
              </div>
              <div className="info-item">
                <label>标题:</label>
                <span>{task.title}</span>
              </div>
              <div className="info-item">
                <label>创建者:</label>
                <span className="address">{task.creator}</span>
              </div>
              <div className="info-item">
                <label>领取者:</label>
                <span className="address">{task.assignee || '未领取'}</span>
              </div>
              <div className="info-item">
                <label>积分奖励:</label>
                <span>{task.points}</span>
              </div>
              <div className="info-item">
                <label>状态:</label>
                <span className={`status-badge ${task.status === 2 ? 'status-submitted' : ''}`}>
                  {task.status === 2 ? '待审核' : '其他状态'}
                </span>
              </div>
              <div className="info-item">
                <label>截止日期:</label>
                <span>{new Date(task.deadline * 1000).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <label>创建时间:</label>
                <span>{new Date(task.timestamp * 1000).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="task-description-section">
            <h4>任务描述</h4>
            <p>{task.description}</p>
          </div>

          {task.status === 2 && task.proof && (
            <div className="task-proof-section">
              <h4>提交证明</h4>
              <p>{proofData.text}</p>
              
              {proofData.fileInfo.length > 0 && (
                <div className="proof-files">
                  <h5>附件</h5>
                  <div className="file-list">
                    {proofData.fileInfo.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-info" onClick={() => handlePreviewFile(file.url, file.name)}>
                          <span className="file-icon">📎</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{file.size}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {previewUrl && renderFilePreview(previewUrl, previewFileName)}
                </div>
              )}
            </div>
          )}

          {task.status === 2 && (
            <div className="modal-actions">
              <button
                className="action-button reject-button"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? '处理中...' : '拒绝'}
              </button>
              <button
                className="action-button approve-button"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? '处理中...' : '通过'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal; 