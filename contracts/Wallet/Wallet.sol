//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract Wallet {
    address public owner;

    event blacklistedActionsSetted(
        address _blacklistedTo,
        bytes blacklistActionBytes,
        uint256 _expiryBlock,
        address _autoExecuteTo,
        bytes autoExecuteActionBytes
    );

    event ApproveForConfiguration(address approvedTo);

    constructor(address _owner) {
        owner = _owner;
    }

    struct Blacklist {
        address blacklistedTo;
        bytes blacklistActionBytes;
        bool isBlacklisted;
    }
    struct BlacklistAutoExecute {
        uint256 expiryBlock;
        address autoExecuteTo;
        bytes autoExecuteActionBytes;
    }

    mapping(address => bool) public isApprovedToSetBlacklist;
    mapping(address => mapping(bytes => Blacklist)) public blacklistedAction;
    mapping(address => mapping(bytes => BlacklistAutoExecute)) public blacklistedActionAutoExecute;


    function setBlacklistedActions(
        address _blacklistedTo,
        bytes calldata _blacklistActionBytes,
        uint256 _expiryBlock,
        address _autoExecuteTo,
        bytes calldata _autoExecuteActionBytes
    ) public onlyApproved {
        blacklistedAction[_blacklistedTo][_blacklistActionBytes] = Blacklist({
            blacklistedTo: _blacklistedTo,
            blacklistActionBytes: _blacklistActionBytes,
            isBlacklisted: true
        });

        blacklistedActionAutoExecute[_autoExecuteTo][_autoExecuteActionBytes] = BlacklistAutoExecute({
            expiryBlock: _expiryBlock,
            autoExecuteTo: _autoExecuteTo,
            autoExecuteActionBytes: _autoExecuteActionBytes
        });

        emit blacklistedActionsSetted(
            _blacklistedTo,
            _blacklistActionBytes,
            _expiryBlock,
            _autoExecuteTo,
            _autoExecuteActionBytes
        );
    }

    modifier onlyApproved() {
        bool isAllowed = isApprovedToSetBlacklist[msg.sender];
        require(msg.sender == owner || isAllowed, "!allowed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    function ApproveForConfigure(address _approveAddress) public onlyOwner {
        isApprovedToSetBlacklist[_approveAddress] = true;

        emit ApproveForConfiguration(_approveAddress);
    }

    function makeTransaction(address _to, bytes memory callBytes)
        public
        onlyOwner
    {
        Blacklist memory blacklistAction = blacklistedAction[_to][callBytes];

        require(!blacklistAction.isBlacklisted, "not allowed");

        (bool success, bytes memory data) = _to.call(callBytes);
        require(success, "!success");

        //emit data
    }

    function autoExecuteTo(address _autoExecuteTo,bytes calldata _autoExecuteActionBytes) public {
        BlacklistAutoExecute
            storage blacklistAction = blacklistedActionAutoExecute[_autoExecuteTo][_autoExecuteActionBytes];

        require(block.number > blacklistAction.expiryBlock, "!expired");

        (bool success, bytes memory data) = blacklistAction.autoExecuteTo.call(
            blacklistAction.autoExecuteActionBytes
        );
        require(success, "!success");
    }
}
