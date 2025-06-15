/**
 * 社团积分系统的Truffle配置文件
 */

module.exports = {
  networks: {
    // 本地开发网络
    // development: {
    //   host: "127.0.0.1",
    //   port: 8545,
    //   network_id: "*", // 匹配任何网络ID
    // },
    
    // 测试网络配置 - 可以根据需要添加
    sepolia: {
      provider: () => new HDWalletProvider(MNEMONIC, `https://sepolia.infura.io/v3/${INFURA_ID}`),
      network_id: 11155111,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
  },

  // 合约编译相关配置
  compilers: {
    solc: {
      version: "0.8.17", // 使用的Solidity编译器版本
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  // 部署配置
  migrations_directory: "./migrations",

  // Truffle DB配置
  db: {
    enabled: false
  }
}; 