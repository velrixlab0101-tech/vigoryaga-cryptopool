// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RaffleVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable usdc;
    
    event Payout(uint256 indexed drawId, address indexed winner, uint256 amount, uint8 place);
    event OperatorPayout(uint256 indexed drawId, address indexed operator, uint256 amount);
    event TicketSale(uint256 indexed drawId, address indexed buyer, uint256 amount);
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    function buyTickets(uint256 drawId, uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit TicketSale(drawId, msg.sender, amount);
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
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0) && amounts[i] > 0) {
                usdc.safeTransfer(winners[i], amounts[i]);
                emit Payout(drawId, winners[i], amounts[i], places[i]);
            }
        }
        if (operatorAmount > 0 && operator != address(0)) {
            usdc.safeTransfer(operator, operatorAmount);
            emit OperatorPayout(drawId, operator, operatorAmount);
        }
    }
}
