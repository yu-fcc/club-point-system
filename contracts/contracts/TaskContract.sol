// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TaskContract {
    // Task status enum
    enum TaskStatus { CREATED, ASSIGNED, SUBMITTED, COMPLETED }
    
    // Task structure
    struct Task {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 points;
        bool isCompleted;
        address assignee;
        TaskStatus status;
        string proof;
        uint256 deadline;
    }

    // Reward status enum
    enum RewardStatus { AVAILABLE, SOLD_OUT }
    
    // Reward structure
    struct Reward {
        uint256 id;
        string name;
        string description;
        uint256 pointsCost;
        uint256 stock;
        string imageUrl;
        RewardStatus status;
    }

    // Exchange record structure
    struct ExchangeRecord {
        uint256 id;
        uint256 rewardId;
        address user;
        uint256 timestamp;
    }

    // Points history record structure
    struct PointsHistory {
        uint256 id;
        uint256 timestamp;
        int256 pointsChange;
        string title;
        string type_; // "task" or "reward"
        string status;
    }
    
    // Task events
    event TaskCreated(uint256 indexed taskId, address indexed creator, string title, uint256 points);
    event TaskAssigned(uint256 indexed taskId, address indexed assignee);
    event TaskSubmitted(uint256 indexed taskId, address indexed assignee, string proof);
    event TaskCompleted(uint256 indexed taskId, address indexed assignee, uint256 points);
    
    // Reward events
    event RewardCreated(uint256 indexed rewardId, string name, uint256 pointsCost, uint256 stock);
    event RewardExchanged(uint256 indexed rewardId, address indexed user, uint256 pointsCost);
    event StockUpdated(uint256 indexed rewardId, uint256 newStock);
    
    // State variables
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256) public userPoints;
    uint256 private taskCounter = 0;
    
    // Reward state variables
    mapping(uint256 => Reward) public rewards;
    mapping(uint256 => ExchangeRecord[]) public rewardExchangeRecords;
    uint256 private rewardCounter = 0;

    // Points history mapping
    mapping(address => PointsHistory[]) public userPointsHistory;
    
    // Admin address
    address public admin;
    
    // Admin list
    mapping(address => bool) public admins;
    
    // Admin events
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin || admins[msg.sender], "Only admin can call this function");
        _;
    }
    
    modifier taskExists(uint256 taskId) {
        require(taskId < taskCounter, "Task does not exist");
        _;
    }
    
    modifier onlyTaskCreator(uint256 taskId) {
        require(tasks[taskId].creator == msg.sender, "Only task creator can call this function");
        _;
    }
    
    modifier onlyAssignee(uint256 taskId) {
        require(tasks[taskId].assignee == msg.sender, "Only task assignee can call this function");
        _;
    }

    modifier rewardExists(uint256 rewardId) {
        require(rewardId < rewardCounter, "Reward does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
        admins[msg.sender] = true;
    }

    // Helper function to add points history
    function _addPointsHistory(
        address user,
        int256 pointsChange,
        string memory title,
        string memory type_,
        string memory status
    ) internal {
        PointsHistory memory history = PointsHistory({
            id: userPointsHistory[user].length,
            timestamp: block.timestamp,
            pointsChange: pointsChange,
            title: title,
            type_: type_,
            status: status
        });
        userPointsHistory[user].push(history);
    }
    
    // Create task
    function createTask(string memory title, string memory description, uint256 points, uint256 deadline) public {
        require(deadline > block.timestamp, "Deadline must be in the future");
        
        tasks[taskCounter] = Task({
            id: taskCounter,
            creator: msg.sender,
            title: title,
            description: description,
            points: points,
            isCompleted: false,
            assignee: address(0),
            status: TaskStatus.CREATED,
            proof: "",
            deadline: deadline
        });
        
        emit TaskCreated(taskCounter, msg.sender, title, points);
        taskCounter++;
    }
    
    // Get task count
    function getTaskCount() public view returns (uint256) {
        return taskCounter;
    }
    
    // Assign task
    function assignTask(uint256 taskId) public taskExists(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.CREATED, "Task cannot be assigned");
        require(task.assignee == address(0), "Task already assigned");
        
        task.assignee = msg.sender;
        task.status = TaskStatus.ASSIGNED;
        
        emit TaskAssigned(taskId, msg.sender);
    }
    
    // Submit task
    function submitTask(uint256 taskId, string memory proof) public taskExists(taskId) onlyAssignee(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.ASSIGNED, "Task status must be ASSIGNED");
        
        task.proof = proof;
        task.status = TaskStatus.SUBMITTED;
        
        emit TaskSubmitted(taskId, msg.sender, proof);
    }
    
    // Approve task and reward points
    function approveTask(uint256 taskId) public taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.SUBMITTED, "Task status must be SUBMITTED");
        require(!task.isCompleted, "Task is already completed");
        
        task.isCompleted = true;
        task.status = TaskStatus.COMPLETED;
        userPoints[task.assignee] += task.points;
        
        // Add points history for task completion
        _addPointsHistory(
            task.assignee,
            int256(task.points),
            task.title,
            "task",
            "finished"
        );
        
        emit TaskCompleted(taskId, task.assignee, task.points);
    }

    // Reward functions
    function createReward(
        string memory name,
        string memory description,
        uint256 pointsCost,
        uint256 stock,
        string memory imageUrl
    ) public onlyAdmin {
        rewards[rewardCounter] = Reward({
            id: rewardCounter,
            name: name,
            description: description,
            pointsCost: pointsCost,
            stock: stock,
            imageUrl: imageUrl,
            status: stock > 0 ? RewardStatus.AVAILABLE : RewardStatus.SOLD_OUT
        });
        
        emit RewardCreated(rewardCounter, name, pointsCost, stock);
        rewardCounter++;
    }
    
    function getRewardCount() public view returns (uint256) {
        return rewardCounter;
    }
    
    function updateRewardStock(uint256 rewardId, uint256 newStock) public onlyAdmin rewardExists(rewardId) {
        Reward storage reward = rewards[rewardId];
        reward.stock = newStock;
        reward.status = newStock > 0 ? RewardStatus.AVAILABLE : RewardStatus.SOLD_OUT;
        
        emit StockUpdated(rewardId, newStock);
    }
    
    function exchangeReward(uint256 rewardId) public rewardExists(rewardId) {
        Reward storage reward = rewards[rewardId];
        require(reward.status == RewardStatus.AVAILABLE, "Reward is sold out");
        require(reward.stock > 0, "No stock available");
        require(userPoints[msg.sender] >= reward.pointsCost, "Insufficient points");
        
        // Deduct points
        userPoints[msg.sender] -= reward.pointsCost;
        
        // Update stock
        reward.stock--;
        if (reward.stock == 0) {
            reward.status = RewardStatus.SOLD_OUT;
        }
        
        // Record exchange
        ExchangeRecord memory record = ExchangeRecord({
            id: rewardExchangeRecords[rewardId].length,
            rewardId: rewardId,
            user: msg.sender,
            timestamp: block.timestamp
        });
        rewardExchangeRecords[rewardId].push(record);

        // Add points history for reward exchange
        _addPointsHistory(
            msg.sender,
            -int256(reward.pointsCost),
            reward.name,
            "reward",
            "exchanged"
        );
        
        emit RewardExchanged(rewardId, msg.sender, reward.pointsCost);
    }
    
    function getReward(uint256 rewardId) public view rewardExists(rewardId) returns (
        string memory name,
        string memory description,
        uint256 pointsCost,
        uint256 stock,
        string memory imageUrl,
        RewardStatus status
    ) {
        Reward storage reward = rewards[rewardId];
        return (
            reward.name,
            reward.description,
            reward.pointsCost,
            reward.stock,
            reward.imageUrl,
            reward.status
        );
    }
    
    function getRewardExchangeRecords(uint256 rewardId) public view rewardExists(rewardId) returns (
        ExchangeRecord[] memory
    ) {
        return rewardExchangeRecords[rewardId];
    }

    // Get user points history
    function getUserPointsHistory(address user) public view returns (
        uint256[] memory ids,
        uint256[] memory timestamps,
        int256[] memory pointsChanges,
        string[] memory titles,
        string[] memory types,
        string[] memory statuses
    ) {
        PointsHistory[] storage history = userPointsHistory[user];
        uint256 length = history.length;
        
        ids = new uint256[](length);
        timestamps = new uint256[](length);
        pointsChanges = new int256[](length);
        titles = new string[](length);
        types = new string[](length);
        statuses = new string[](length);
        
        for (uint256 i = 0; i < length; i++) {
            ids[i] = history[i].id;
            timestamps[i] = history[i].timestamp;
            pointsChanges[i] = history[i].pointsChange;
            titles[i] = history[i].title;
            types[i] = history[i].type_;
            statuses[i] = history[i].status;
        }
        
        return (ids, timestamps, pointsChanges, titles, types, statuses);
    }

    // Appeal structure
    struct Appeal {
        uint256 id;
        address user;
        int256 pointsChange;
        string reason;
        bool resolved;
        bool approved;
        uint256 timestamp;
    }

    mapping(uint256 => Appeal) public appeals;
    uint256 private appealCounter = 0;

    // Appeal events
    event AppealCreated(uint256 indexed appealId, address indexed user, int256 pointsChange, string reason);
    event AppealResolved(uint256 indexed appealId, bool approved);

    // Appeal modifiers
    modifier appealExists(uint256 appealId) {
        require(appealId < appealCounter, "Appeal does not exist");
        _;
    }

    modifier notResolved(uint256 appealId) {
        require(!appeals[appealId].resolved, "Appeal already resolved");
        _;
    }

    // Create appeal
    function createAppeal(int256 pointsChange, string memory reason) public {
        appeals[appealCounter] = Appeal({
            id: appealCounter,
            user: msg.sender,
            pointsChange: pointsChange,
            reason: reason,
            resolved: false,
            approved: false,
            timestamp: block.timestamp
        });
        
        emit AppealCreated(appealCounter, msg.sender, pointsChange, reason);
        appealCounter++;
    }

    // Get appeal count
    function getAppealCount() public view returns (uint256) {
        return appealCounter;
    }

    // Get pending appeals count
    function getPendingAppealsCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < appealCounter; i++) {
            if (!appeals[i].resolved) {
                count++;
            }
        }
        return count;
    }

    // Get all appeals
    function getAllAppeals() public view returns (
        uint256[] memory ids,
        address[] memory users,
        int256[] memory pointsChanges,
        string[] memory reasons,
        bool[] memory resolveds,
        bool[] memory approveds,
        uint256[] memory timestamps
    ) {
        ids = new uint256[](appealCounter);
        users = new address[](appealCounter);
        pointsChanges = new int256[](appealCounter);
        reasons = new string[](appealCounter);
        resolveds = new bool[](appealCounter);
        approveds = new bool[](appealCounter);
        timestamps = new uint256[](appealCounter);

        for (uint256 i = 0; i < appealCounter; i++) {
            Appeal storage appeal = appeals[i];
            ids[i] = appeal.id;
            users[i] = appeal.user;
            pointsChanges[i] = appeal.pointsChange;
            reasons[i] = appeal.reason;
            resolveds[i] = appeal.resolved;
            approveds[i] = appeal.approved;
            timestamps[i] = appeal.timestamp;
        }

        return (ids, users, pointsChanges, reasons, resolveds, approveds, timestamps);
    }
 
    // Get user appeals
    function getUserAppeals(address user) public view returns (
        uint256[] memory ids,
        uint256[] memory timestamps,
        int256[] memory pointsChanges,
        string[] memory reasons,
        bool[] memory resolveds,
        bool[] memory approveds
    ) {
        // Count the number of appeals for this user
        uint256 count = 0;
        for (uint256 i = 0; i < appealCounter; i++) {
            if (appeals[i].user == user) {
                count++;
            }
        }

        // Initialize arrays
        ids = new uint256[](count);
        timestamps = new uint256[](count);
        pointsChanges = new int256[](count);
        reasons = new string[](count);
        resolveds = new bool[](count);
        approveds = new bool[](count);

        // Fill arrays
        uint256 index = 0;
        for (uint256 i = 0; i < appealCounter; i++) {
            if (appeals[i].user == user) {
                ids[index] = appeals[i].id;
                timestamps[index] = appeals[i].timestamp;
                pointsChanges[index] = appeals[i].pointsChange;
                reasons[index] = appeals[i].reason;
                resolveds[index] = appeals[i].resolved;
                approveds[index] = appeals[i].approved;
                index++;
            }
        }

        return (ids, timestamps, pointsChanges, reasons, resolveds, approveds);
    }

    // Resolve appeal
    function resolveAppeal(uint256 appealId, bool approve) public onlyAdmin appealExists(appealId) notResolved(appealId) {
        Appeal storage appeal = appeals[appealId];
        
        appeal.resolved = true;
        appeal.approved = approve;
        
        if (approve) {
            userPoints[appeal.user] += uint256(appeal.pointsChange);
        }
        
        emit AppealResolved(appealId, approve);
    }

    // Add admin
    function addAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        require(!admins[newAdmin], "Already an admin");
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }
    
    // Remove admin
    function removeAdmin(address adminAddress) public onlyAdmin {
        require(adminAddress != admin, "Cannot remove contract owner");
        require(admins[adminAddress], "Not an admin");
        admins[adminAddress] = false;
        emit AdminRemoved(adminAddress);
    }
    
    // Check if address is admin
    function isAdmin(address _address) public view returns (bool) {
        return _address == admin || admins[_address];
    }
} 