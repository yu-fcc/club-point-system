import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { web3Service } from './services/web3Service';
import TaskList from './components/TaskList';
import UserCenter from './components/UserCenter';
import RewardCenter from './components/RewardCenter';
import PointsHistory from './components/PointsHistory';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRewards from './components/admin/AdminRewards';
import AdminSettings from './components/admin/AdminSettings';
import AdminAppeals from './components/admin/AdminAppeals';
import AdminTasks from './components/admin/AdminTasks';
import logo from './logo.svg';
import './App.css';

// 新增轮播图组件
const Carousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      image: '/images/640.jpg',
      title: '篮球社团活动',
      description: '加入我们，一起挥洒汗水'
    },
    {
      image: '/images/641.jpg',
      title: '校际联赛',
      description: '展现你的篮球才华'
    },
    {
      image: '/images/642.jpg',
      title: '专业训练',
      description: '提升你的篮球技能'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="carousel">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          <div className="carousel-content">
            <h2>{slide.title}</h2>
            <p>{slide.description}</p>
          </div>
        </div>
      ))}
      <div className="carousel-indicators">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [key, setKey] = useState(0); // 用于强制更新子组件

  const updateAccountData = useCallback(async (newAccount: string) => {
    console.log('更新账户数据:', newAccount);
    try {
      const userPoints = await web3Service.getUserPoints();
      console.log('获取到用户积分:', userPoints);
      setPoints(userPoints);
      const adminStatus = await web3Service.isAdmin(newAccount);
      console.log('获取到管理员状态:', adminStatus);
      setIsAdmin(adminStatus);
      setAccount(newAccount);
    } catch (error) {
      console.error('更新账户数据失败:', error);
    }
  }, []);

  // 监听账户变化
  useEffect(() => {
    let mounted = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('账户变化事件触发:', accounts);
      if (!mounted) return;

      if (accounts.length > 0) {
        console.log('设置新账户:', accounts[0]);
        await updateAccountData(accounts[0]);
      } else {
        console.log('账户已断开连接');
        setAccount(null);
        setPoints(0);
        setIsAdmin(false);
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('网络变化事件触发:', chainId);
      window.location.reload();
    };

    const setupListeners = async () => {
      if (window.ethereum) {
        console.log('设置 MetaMask 事件监听器');
        
        // 检查初始连接
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log('初始账户检查:', accounts);
          if (accounts.length > 0) {
            await updateAccountData(accounts[0]);
          }
        } catch (error) {
          console.error('初始账户检查失败:', error);
        }

        // 添加事件监听器
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', () => {
          console.log('MetaMask 断开连接');
          setAccount(null);
          setPoints(0);
          setIsAdmin(false);
        });
      }
    };

    setupListeners();

    // 清理函数
    return () => {
      console.log('清理事件监听器');
      mounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateAccountData]);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('连接钱包:', accounts);
        if (accounts.length > 0) {
          await updateAccountData(accounts[0]);
        }
      } else {
        alert('请安装 MetaMask 钱包');
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
    }
  };

  const handleTaskAssigned = async () => {
    const userPoints = await web3Service.getUserPoints();
    setPoints(userPoints);
  };

  const handleTaskCreated = () => {
    if (account) {
      updateAccountData(account);
    }
  };

  // 添加全局刷新函数
  const forceRefresh = useCallback(() => {
    console.log('强制刷新页面...');
    if (account) {
      updateAccountData(account);
    }
    setKey(prev => prev + 1);
  }, [account, updateAccountData]);

  // 将刷新函数传递给子组件
  const refreshProps = {
    onRefresh: forceRefresh,
  };

  return (
    <Router>
      <div className="app-container">
        {isAdmin ? (
          <AdminLayout key={key}>
            <Routes>
              <Route path="/admin" element={<AdminDashboard {...refreshProps} key={key} />} />
              <Route path="/admin/tasks" element={<AdminTasks {...refreshProps} key={key} />} />
              <Route path="/admin/rewards" element={<AdminRewards {...refreshProps} key={key} />} />
              <Route path="/admin/appeals" element={<AdminAppeals {...refreshProps} key={key} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayout>
        ) : (
          <>
            {/* 顶部区域 */}
            <header className="header">
              <div className="header-left">
                <img src={logo} alt="Logo" className="logo" />
                <h1 className="system-title">篮球社团积分系统</h1>
              </div>
              <div className="header-right">
                {account ? (
                  <div className="wallet-info">
                    <i className="fas fa-coins"></i>
                    <span className="points">积分: {points}</span>
                    <span className="address">{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
                  </div>
                ) : (
                  <button className="wallet-button" onClick={connectWallet}>
                    <i className="fas fa-wallet"></i>
                    连接钱包
                  </button>
                )}
              </div>
            </header>

            {/* 主内容区域 */}
            <div className="main-wrapper">
              <nav className="sidebar">
                <div className="sidebar-header">
                  <h2>导航菜单</h2>
                </div>
                <ul>
                  <li>
                    <Link to="/">
                      <i className="fas fa-home"></i>
                      首页
                    </Link>
                  </li>
                  <li>
                    <Link to="/tasks">
                      <i className="fas fa-basketball-ball"></i>
                      任务中心
                    </Link>
                  </li>
                  <li>
                    <Link to="/rewards">
                      <i className="fas fa-trophy"></i>
                      奖励中心
                    </Link>
                  </li>
                  <li>
                    <Link to="/user">
                      <i className="fas fa-user"></i>
                      个人中心
                    </Link>
                  </li>
                </ul>
              </nav>

              <main className="main-content">
                <Routes>
                  <Route path="/" element={
                    <div className="home-page">
                      <Carousel />
                      <div className="home-content">
                        <h2>欢迎加入篮球社团</h2>
                        <p>在这里，你可以参与各种篮球活动，完成任务获取积分，兑换精美奖品！</p>
                      </div>
                    </div>
                  } />
                  <Route path="/tasks" element={<TaskList onTaskAssigned={handleTaskAssigned} {...refreshProps} key={key} />} />
                  <Route path="/rewards" element={<RewardCenter {...refreshProps} key={key} />} />
                  <Route path="/user" element={<UserCenter {...refreshProps} key={key} />} />
                  <Route path="/history" element={<PointsHistory {...refreshProps} key={key} />} />
                </Routes>
              </main>
            </div>
          </>
        )}
      </div>
    </Router>
  );
};

export default App; 