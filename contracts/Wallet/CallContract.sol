//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract BlackListedContract {
    event Incremented(uint256 currentValue);

    uint256 public count;
    
    function incrementCount(uint256 value) public{
        count = count + value;

        emit Incremented(count);
    }

    
}
