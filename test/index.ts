import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BlackListedContract } from '../typechain';

describe('Wallet', function () {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  let walletContract: any;
  let blacklistedContract: BlackListedContract;
  let notblacklistedContract: BlackListedContract;
  let gameContract: any;
  let nftContract: any;

  beforeEach(async function () {
    [owner, user, user2] = await ethers.getSigners();
    const blacklistedContractFactory = await ethers.getContractFactory(
      'BlackListedContract',
    );
    blacklistedContract = await blacklistedContractFactory
      .connect(owner)
      .deploy();
    await blacklistedContract.deployed();

    const notblacklistedContractFactory = await ethers.getContractFactory(
      'BlackListedContract',
    );
    notblacklistedContract = await notblacklistedContractFactory
      .connect(owner)
      .deploy();
    await blacklistedContract.deployed();

    const walletContractFactory = await ethers.getContractFactory('Wallet');
    walletContract = await walletContractFactory.deploy(owner.address);
    await walletContract.deployed();

    const nftContractFactory = await ethers.getContractFactory('Bincoin721');
    nftContract = await nftContractFactory.deploy();
    await nftContract.deployed();

    const gameContractFactory = await ethers.getContractFactory(
      'TestGameContract',
    );
    gameContract = await gameContractFactory.deploy(nftContract.address);
    await gameContract.deployed();
  });

  it('It allows owner to set blacklisted actions ', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('incrementCount', [10]);

    const expiryBlock = 321312;

    expect(
      await walletContract
        .connect(owner)
        .setBlacklistedActions(
          blacklistedAddressTo,
          bytesForBlacklistAction,
          expiryBlock,
          autoExecuteTo,
          autoExecuteAction,
        ),
    ).to.emit('Wallet', 'blacklistedActionsSetted');
  });

  it('It does not allows !owner to set blacklisted actions ', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('incrementCount', [10]);

    const expiryBlock = 321312;

    await expect(
      walletContract
        .connect(user)
        .setBlacklistedActions(
          blacklistedAddressTo,
          bytesForBlacklistAction,
          expiryBlock,
          autoExecuteTo,
          autoExecuteAction,
        ),
    ).to.be.revertedWith('!allowed');
  });

  it('It allows to make transaction for not blacklisted contract', async function () {
    const notblacklistedContractAddresTo = notblacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytes = iface.encodeFunctionData('incrementCount', [1]);

    await walletContract
      .connect(owner)
      .makeTransaction(notblacklistedContractAddresTo, bytes);

    expect(await notblacklistedContract.count()).to.be.eq(1);
  });

  it('It does not allows to make transaction for blacklisted contract', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const expiryBlock = 321312;
    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('incrementCount', [10]);

    await walletContract
      .connect(owner)
      .setBlacklistedActions(
        blacklistedAddressTo,
        bytesForBlacklistAction,
        expiryBlock,
        autoExecuteTo,
        autoExecuteAction,
      );

    await expect(
      walletContract
        .connect(owner)
        .makeTransaction(blacklistedAddressTo, bytesForBlacklistAction),
    ).to.be.revertedWith('not allowed');
  });

  it('It allows wallet owner to approve configuration for smb', async function () {
    expect(
      await walletContract.connect(owner).ApproveForConfigure(user.address),
    ).to.emit('Wallet', 'ApproveForConfiguration');
  });

  it('It allows wallet owner to approve configuration for smb and allows smb to configure wallet', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const expiryBlock = 321312;
    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('incrementCount', [10]);

    expect(
      await walletContract.connect(owner).ApproveForConfigure(user.address),
    ).to.emit('Wallet', 'ApproveForConfiguration');
    expect(
      await walletContract
        .connect(user)
        .setBlacklistedActions(
          blacklistedAddressTo,
          bytesForBlacklistAction,
          expiryBlock,
          autoExecuteTo,
          autoExecuteAction,
        ),
    ).to.emit('Wallet', 'blacklistedActionsSetted');
  });

  it('It does not allows smb to use ApproveForConfiguration ', async function () {
    await expect(
      walletContract.connect(user).ApproveForConfigure(user.address),
    ).to.be.revertedWith('!owner');
  });

  it('It does not allows to callAutoExecute before expiration time', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteActionBytes = iface2.encodeFunctionData('incrementCount', [
      10,
    ]);

    const expiryBlock = 1000;

    expect(
      await walletContract
        .connect(owner)
        .setBlacklistedActions(
          blacklistedAddressTo,
          bytesForBlacklistAction,
          expiryBlock,
          autoExecuteTo,
          autoExecuteActionBytes,
        ),
    ).to.emit('Wallet', 'blacklistedActionsSetted');

    await expect(
      walletContract.autoExecuteTo(autoExecuteTo, autoExecuteActionBytes),
    ).to.be.revertedWith('expired');
  });

  it('It allows to callAutoExecute after expiration time', async function () {
    const blacklistedAddressTo = blacklistedContract.address;
    const ABI = ['function incrementCount(uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForBlacklistAction = iface.encodeFunctionData('incrementCount', [
      1,
    ]);

    const autoExecuteTo = blacklistedContract.address;
    const ABI2 = ['function incrementCount(uint256)'];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteActionBytes = iface2.encodeFunctionData('incrementCount', [
      10,
    ]);

    const expiryBlock = 50;

    expect(
      await walletContract
        .connect(owner)
        .setBlacklistedActions(
          blacklistedAddressTo,
          bytesForBlacklistAction,
          expiryBlock,
          autoExecuteTo,
          autoExecuteActionBytes,
        ),
    ).to.emit('Wallet', 'blacklistedActionsSetted');

    await ethers.provider.send('hardhat_mine', ['0x100']);
    await walletContract.autoExecuteTo(autoExecuteTo, autoExecuteActionBytes);

    expect(await blacklistedContract.count()).to.be.eq(10);
  });

  it('To play game from this wallet', async function () {
    const ABI = ['function Attack(uint256 value)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForCall = iface.encodeFunctionData('Attack', [1321]);

    await nftContract.connect(owner).safeMint(owner.address, 1);

    expect(await gameContract.connect(owner).Attack(312312)).to.emit(
      'TestGameContract',
      'Attacked',
    );
    // !success because walletContract doesn't have nft
    await expect(
      walletContract
        .connect(owner)
        .makeTransaction(gameContract.address, bytesForCall),
    ).to.be.revertedWith('!success');

    await nftContract
      .connect(owner)
      .transferFrom(owner.address, walletContract.address, 1);

    expect(await nftContract.balanceOf(walletContract.address)).to.be.eq(1);

    expect(
      await walletContract
        .connect(owner)
        .makeTransaction(gameContract.address, bytesForCall),
    ).to.emit('TestGameContract', 'Attacked');
  });

  it('It does not allow to use banned function / allows to execute autoexecute function ', async function () {
    const blacklistedAddressTo = nftContract.address;
    const ABI = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForCall = iface.encodeFunctionData('safeTransferFrom', [
      user.address,
      user.address,
      0,
    ]);
    // safeTransferFrom function bytes
    const functionBytes = bytesForCall.slice(0, 10);

    const expiryBlock = 267;
    const autoExecuteTo = nftContract.address;
    const ABI2 = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('safeTransferFrom', [
      walletContract.address,
      owner.address,
      1,
    ]);

    await nftContract.connect(owner).safeMint(owner.address, 1);

    await nftContract
      .connect(owner)
      .transferFrom(owner.address, walletContract.address, 1);

    expect(await nftContract.balanceOf(walletContract.address)).to.be.eq(1);
    expect(await nftContract.balanceOf(owner.address)).to.be.eq(0);

    await walletContract
      .connect(owner)
      .setBlacklistedContractFunction(
        blacklistedAddressTo,
        functionBytes,
        expiryBlock,
        autoExecuteTo,
        autoExecuteAction,
      );

    const ABI3 = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface3 = new ethers.utils.Interface(ABI3);
    const bytesForTransaction = iface3.encodeFunctionData('safeTransferFrom', [
      owner.address,
      user.address,
      1,
    ]);

    await expect(
      walletContract
        .connect(owner)
        .makeTransaction(blacklistedAddressTo, bytesForTransaction),
    ).to.be.revertedWith('THis func is banned');

    await walletContract
      .connect(user)
      .autoExecuteTo(nftContract.address, autoExecuteAction);

    expect(await nftContract.balanceOf(owner.address)).to.be.eq(1);
  });

  it('Multiple nft test', async function () {
    await nftContract.connect(owner).safeMint(owner.address, 1);
    await nftContract.connect(owner).safeMint(owner.address, 2);

    const blacklistedAddressTo = nftContract.address;
    const ABI = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForCall = iface.encodeFunctionData('safeTransferFrom', [
      user.address,
      user.address,
      0,
    ]);
    const functionBytes = bytesForCall.slice(0, 10);
    const expiryBlock = 500;
    const autoExecuteTo = nftContract.address;
    const ABI2 = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface2 = new ethers.utils.Interface(ABI2);
    const autoExecuteAction = iface2.encodeFunctionData('safeTransferFrom', [
      walletContract.address,
      owner.address,
      1,
    ]);

    const expiryBlock4 = 500;
    const autoExecuteTo4 = nftContract.address;
    const ABI4 = [
      'function safeTransferFrom(address from,address to, uint256 id)',
    ];
    const iface4 = new ethers.utils.Interface(ABI4);
    const autoExecuteAction4 = iface4.encodeFunctionData('safeTransferFrom', [
      walletContract.address,
      owner.address,
      2,
    ]);

    await walletContract
      .connect(owner)
      .setBlacklistedContractFunction(
        blacklistedAddressTo,
        functionBytes,
        expiryBlock4,
        autoExecuteTo4,
        autoExecuteAction4,
      );

    await walletContract
      .connect(owner)
      .setBlacklistedActions(
        blacklistedAddressTo,
        functionBytes,
        expiryBlock,
        autoExecuteTo,
        autoExecuteAction,
      );

    await nftContract
      .connect(owner)
      .transferFrom(owner.address, walletContract.address, 1);

    await nftContract
      .connect(owner)
      .transferFrom(owner.address, walletContract.address, 2);

    expect(await nftContract.balanceOf(walletContract.address)).to.be.eq(2);

    const ABI3 = ['function Attack(uint256 value)'];
    const iface3 = new ethers.utils.Interface(ABI3);
    const bytesForCall3 = iface3.encodeFunctionData('Attack', [1321]);

    expect(
      await walletContract.connect(owner).ApproveForConfigure(user.address),
    ).to.emit('Wallet', 'ApproveForConfiguration');

    expect(
      await walletContract.connect(owner).ApproveForConfigure(user2.address),
    ).to.emit('Wallet', 'ApproveForConfiguration');

    expect(
      await walletContract
        .connect(user)
        .makeTransaction(gameContract.address, bytesForCall3),
    ).to.emit('TestGameContract', 'Attacked');

    expect(
      await walletContract
        .connect(user2)
        .makeTransaction(gameContract.address, bytesForCall3),
    ).to.emit('TestGameContract', 'Attacked');

    await ethers.provider.send('hardhat_mine', ['0x100']);

    await walletContract
      .connect(user2)
      .autoExecuteTo(autoExecuteTo4, autoExecuteAction4);

    await walletContract
      .connect(user)
      .autoExecuteTo(autoExecuteTo, autoExecuteAction);

    expect(await nftContract.balanceOf(owner.address)).to.be.eq(2);
  });
});
