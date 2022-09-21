//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract TestGameContract {
    event Attacked(uint256 value);
    address _nft_contract;

    constructor(address nft_contract) {
        _nft_contract = nft_contract;
    }

    function Attack(uint256 value) public {
        uint256 balance = IERC721(_nft_contract).balanceOf(msg.sender);
        require(balance >= 1, "!allowed");

        emit Attacked(value);
    }
}
