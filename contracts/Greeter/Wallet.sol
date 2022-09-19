//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract Wallet {
    address public _owner;

    constructor(address _owner){
        owner = _owner;
    }
    struct Blacklist {
        address blacklistedTo;
        string[] blacklistedCalldata;
        bool isBlacklisted;
    }
    struct BlacklistAutoExecute {
        uint256 expiryBlock;
        address autoExecuteTo;
        string autoExecuteFunctionHeader;
        string[] autoExecuteCalldata;
    }
    
    mapping (address => bool) public isApprovedToSetBlacklist;
    mapping (address => Blacklist) public blacklistedAction;
    mapping (address => BlacklistAutoExecute) public blacklistedActionAutoExecute;

    function setBlacklistedActions(
        address _blacklistedTo,
        string[] calldata _blacklistedCalldata,
        uint256 _expiryBlock,
        address _autoExecuteTo,
        string[] calldata _autoExecuteCalldata,
        string calldata _autoExecuteFunctionHeader
    ) public onlyApproved(){
         blacklistedAction[_blacklistedTo] = Blacklist({
            blacklistedTo: _blacklistedTo,
            blacklistedCalldata: _blacklistedCalldata,
            isBlacklisted: true
         });

         blacklistedActionAutoExecute[_autoExecuteTo] = BlacklistAutoExecute({
            expiryBlock: _expiryBlock,
            autoExecuteTo: _autoExecuteTo,
            autoExecuteFunctionHeader: _autoExecuteFunctionHeader,
            autoExecuteCalldata: _autoExecuteCalldata
         });
    }

    modifier onlyApproved() {
        bool isAllowed = isApprovedToSetBlacklist[msg.sender];
        require(msg.sender == owner || isAllowed, "!allowed");
        _;
    }

     modifier onlyOwner() {
        require(msg.sender == owner,"!owner");
        _;
    }

    function ApproveForConfigure(
       address _approveAddress
    ) public onlyOwner(){
        isApprovedToSetBlacklist[_approveAddress] = true;
        //emit approve for
    }

    function makeTransaction(
        address _to,
        string calldata functionHeaders,
        string[] memory parameters
    ) onlyOwner() public{
       Blacklist storage blacklistAction = blacklistedAction[_to];

        require(!blacklistAction.isBlacklisted, "not allowed");

        (bool success, bytes memory data) = _to.call(
            abi.encodeWithSignature(functionHeaders, parameters)
        );
        require(success,"!success");
        //emit data        
    }

    function autoExecuteTo(
        address _autoExecuteTo
    ) public {
        BlacklistAutoExecute storage blacklistAction = blacklistedActionAutoExecute[_autoExecuteTo];

        require(block.number > blacklistAction.expiryBlock, "!expired");

        (bool success, bytes memory data) = blacklistAction.autoExecuteTo.call(
            abi.encodeWithSignature(
                blacklistAction.autoExecuteFunctionHeader,
                blacklistAction.autoExecuteCalldata
            )
        );
        require(success,"!success");
    }


}
