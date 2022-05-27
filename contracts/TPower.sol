pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
 
contract TKOPower is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 private TKO;
    mapping(address => uint256) public stakedAmount;
 
    mapping(address => uint256) public stakeTime;
    mapping(address => uint256) public claimTime;
 
    uint256 public lockPeriod;
    uint256 public claimLockPeriod;
 
    event onLock(address indexed sender, uint256 indexed amount);
    event onUnlock(address indexed sender, uint256 indexed amount);
    event onClaim(address indexed sender, uint256 indexed amount);
 
    constructor(address _tko) ERC20("TKO Power", "TKO-POWER") {
        TKO = IERC20(_tko);
        lockPeriod = 7 days;
        claimLockPeriod = 7 days;
    }
 
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        lockPeriod = _lockPeriod;
    }
 
 
    function setClaimLockPeriod(uint256 _claimLockPeriod) external onlyOwner {
        claimLockPeriod = _claimLockPeriod;
    }
 
    function lock(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Invalid amount");
        _amount -= _amount % 1e4;
        address who = _msgSender();
        require(claimTime[who] == 0, "You have pending Claim");
        TKO.safeTransferFrom(who, address(this), _amount);
        stakedAmount[who] += _amount;
        uint256 power = stakedAmount[who];
        if (power >= 100e18 && power < 400e18) {
            power = power / 100;
        } else if (power >= 400e18 && power < 1200e18) {
            power = power * 11 / 1000;
        } else if (power >= 1200e18 && power < 4000e18) {
            power =  power * 115 / 10000;
        } else if (power >= 4000e18 && power < 12000e18) {
            power = power * 12 / 1000;
        } else if (power >= 12000e18) {
            power = power * 125 / 10000;
        } else {
            power = 0;
        }
        require(power > 0, "Invalid power");
        uint256 amountMint = power - balanceOf(who);
        if (amountMint > 0) {
            _mint(who, amountMint);
        }
        stakeTime[who] = block.timestamp;
        emit onLock(who, _amount);
    }
 
    function unlock() external nonReentrant {
        address who = _msgSender();
        uint256 timestamp = block.timestamp;
        require((stakeTime[who] + lockPeriod) < timestamp, "Lock Period Not Passed");
        uint256 tkoAmount = stakedAmount[who];
        require(tkoAmount > 0, "Zero Staked");
        uint256 burnAmout = balanceOf(who);
        if (burnAmout > 0) {
            _burn(who, burnAmout);
        }
        claimTime[who] = timestamp;
        stakeTime[who] = 0;
        emit onUnlock(who, tkoAmount);
    }
 
    function claim() external nonReentrant {
        address who = _msgSender();
        require(claimTime[who] > 0, "Invalid Lock Time");
        require((claimTime[who] + claimLockPeriod) < block.timestamp, "Claim Locked Period Not Passed");
        uint256 tkoAmount = stakedAmount[who];
        TKO.safeTransfer(who, tkoAmount);
        stakedAmount[who] = 0;
        claimTime[who] = 0;
        emit onClaim(who, tkoAmount);
    }
 
    function _transfer(address from, address to, uint256 amount) internal override {
        revert("Transfer disable");
    }
}