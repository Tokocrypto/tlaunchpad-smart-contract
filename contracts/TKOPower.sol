pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TKOPower is ERC20, Ownable {
    using SafeERC20 for IERC20;
    IERC20 public immutable TKO;
    mapping(address => uint256) public _stakedAmount;

    mapping(address => uint256) public _stakeTime;
    mapping(address => uint256) public _claimTime;

    uint256 public lockPeriod = 7*60;
    uint256 public claimLockPeriod = 7*60;

    event onLock(uint256 amount);
    event onUnlock(uint256 amount);
    event onClaim(uint256 amount);

    constructor(address _tko) ERC20("TKO Power", "TKO-POWER") {
        TKO = IERC20(_tko);
    }

    function setLockPeriod(uint256 _lockPeriod) public onlyOwner {
        lockPeriod = _lockPeriod;
    }


    function setClaimLockPeriod(uint256 _claimLockPeriod) public onlyOwner {
        claimLockPeriod = _claimLockPeriod;
    }


    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(from == address(0) || to == address(0), " Non TransferAble Token");
    }

    function lock(uint256 amount) public {
        require(amount > 0, "invalid amount");
        require(_claimTime[msg.sender] == 0,"You have pending Claim");
        TKO.safeTransferFrom(msg.sender, address(this), amount);
        _stakedAmount[msg.sender] = _stakedAmount[msg.sender] + amount;
        uint256 power = TKOToPower(_stakedAmount[msg.sender]);
        require(power > 0, "invalid amount");
        _burn(msg.sender, balanceOf(msg.sender));

        _mint(msg.sender, power);

        _stakeTime[msg.sender] = block.timestamp;
        emit onLock(amount);
    }

   function TKOToPower(uint256 tko) public pure returns (uint256) {
        uint256 power = 0;
        if (tko >= 100 * 1e18 && tko < 400 * 1e18) {
            power = (tko / 100);
        } else if (tko >= 400 * 1e18 && tko < 1200 * 1e18) {
            power = (tko * 11 / 1000) ;
        } else if (tko >= 1200 * 1e18 && tko < 4000 * 1e18) {
            power =  tko*115/10000;
        } else if (tko >= 4000 * 1e18 && tko < 12000 * 1e18) {
            power = (tko* 12 / 1000) ;
        } else if (tko > 4000 * 1e18) {
            power = (tko  * 125/ 10000);
        }
        return power;
    }

    function unlock() public {
        require(_stakeTime[msg.sender]+lockPeriod< block.timestamp,"Lock Period Not Passed");
        uint256 tkoAmount = _stakedAmount[msg.sender];
        require(tkoAmount > 0, "Zero Staked");
        _burn(msg.sender, balanceOf(msg.sender));
        _claimTime[msg.sender] = block.timestamp+claimLockPeriod;
        _stakeTime[msg.sender] = 0;
        emit onUnlock(tkoAmount);
    }

    function claim() public {
        require(_claimTime[msg.sender]>0,"Invalid Lock Time");
        require(_claimTime[msg.sender]< block.timestamp,"Claim Locked Period Not Passed");
        uint256 tkoAmount = _stakedAmount[msg.sender];
        _stakedAmount[msg.sender] = 0;
        _claimTime[msg.sender] = 0;
        TKO.safeTransfer(msg.sender, tkoAmount);
        emit onClaim(tkoAmount);
    }


}