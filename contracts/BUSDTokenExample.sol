pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BUSD is ERC20("BUSD", "BUSD") {
    constructor() {
        _mint(_msgSender(), 1e27);
    }
}