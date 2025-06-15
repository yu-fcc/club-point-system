import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { web3Service } from '../../services/web3Service';
import './AdminLayout.css';

const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      const account = await web3Service.getAccount();
      setAccount(account);
    };
    init();
  }, []);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-logo">
          <Link to="/admin">社团积分系统 - 管理后台</Link>
        </div>
        <div className="admin-account">
          <span className="admin-badge">管理员</span>
          <span className="account-address">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}</span>
        </div>
      </header>

      <div className="admin-container">
        <nav className="admin-sidebar">
          <ul>
            <li className={location.pathname === '/admin' ? 'active' : ''}>
              <Link to="/admin">
                <i className="fas fa-tachometer-alt"></i>
                控制台
              </Link>
            </li>
            <li className={location.pathname === '/admin/tasks' ? 'active' : ''}>
              <Link to="/admin/tasks">
                <i className="fas fa-tasks"></i>
                任务管理
              </Link>
            </li>
            <li className={location.pathname === '/admin/rewards' ? 'active' : ''}>
              <Link to="/admin/rewards">
                <i className="fas fa-gift"></i>
                奖励管理
              </Link>
            </li>
            <li className={location.pathname === '/admin/appeals' ? 'active' : ''}>
              <Link to="/admin/appeals">
                <i className="fas fa-gavel"></i>
                申诉管理
              </Link>
            </li>
          </ul>
        </nav>

        <main className="admin-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 