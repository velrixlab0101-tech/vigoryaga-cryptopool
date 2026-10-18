// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RaffleVault is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    event Payout(
        uint256 indexed drawId,
        address indexed winner,
        uint256 amount,
        uint8 place
    );
    
    event OperatorPayout(
        uint256 indexed drawId,
        address indexed operator,
        uint256 amount
    );
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    function payoutWinner(
        uint256 drawId,
        address winner,
        uint256 amount,
        uint8 place
    ) external onlyOwner nonReentrant {
        require(winner != address(0), "Invalid winner");
        require(amount > 0, "Invalid amount");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        usdc.transfer(winner, amount);
        emit Payout(drawId, winner, amount, place);
    }
    
    function payoutBatch(
        uint256 drawId,
        address[] calldata winners,
        uint256[] calldata amounts,
        uint8[] calldata places,
        address operator,
        uint256 operatorAmount
    ) external onlyOwner nonReentrant {
        require(winners.length == amounts.length && winners.length == places.length, "Invalid arrays");
        require(winners.length <= 5, "Max 5 winners");
        
        uint256 total = operatorAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(usdc.balanceOf(address(this)) >= total, "Insufficient balance");
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0) && amounts[i] > 0) {
                usdc.transfer(winners[i], amounts[i]);
                emit Payout(drawId, winners[i], amounts[i], places[i]);
            }
        }
        
        if (operatorAmount > 0 && operator != address(0)) {
            usdc.transfer(operator, operatorAmount);
            emit OperatorPayout(drawId, operator, operatorAmount);
        }
    }
    
    function deposit(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        usdc.transfer(owner(), amount);
    }
    
    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
