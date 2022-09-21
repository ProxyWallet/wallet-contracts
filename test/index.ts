import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, use } from 'chai';
import { AbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { Wallet, BlackListedContract } from '../typechain';

describe('Wallet', function () {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let walletContract: Wallet;
  let blacklistedContract: BlackListedContract;
  let notblacklistedContract: any;
  let gameContract: any;
  let nftContract: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
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

  it('It does not allow to withdraw nft ', async function () {
    const ABI = ['function safeTransferFrom2(address from,address to,uint256)'];
    const iface = new ethers.utils.Interface(ABI);
    const bytesForCall = iface.encodeFunctionData('safeTransferFrom2', [
      walletContract.address,
      user.address,
      2,
    ]);
    console.log(bytesForCall)
  });
});
// 0x42842e0e0000000000000000000000008bc790a583789367f72c9c59678ff85a00a5e5d0000000000000000000000000959fd7ef9089b7142b6b908dc3a8af7aa8ff0fa10000000000000000000000000000000000000000000000000000000000000001
// 0x42842e0e0000000000000000000000008bc790a583789367f72c9c59678ff85a00a5e5d00000000000000000000000004e90a36b45879f5bae71b57ad525e817afa548900000000000000000000000000000000000000000000000000000000000000001
// 0x42842e0e0000000000000000000000008bc790a583789367f72c9c59678ff85a00a5e5d00000000000000000000000004e90a36b45879f5bae71b57ad525e817afa548900000000000000000000000000000000000000000000000000000000000000002
// 0x8bb59c610000000000000000000000008bc790a583789367f72c9c59678ff85a00a5e5d00000000000000000000000004e90a36b45879f5bae71b57ad525e817afa548900000000000000000000000000000000000000000000000000000000000000002
// await nftContract.connect(owner).safeMint(owner.address, 1);

// await nftContract
//   .connect(owner)
//   .transferFrom(owner.address, walletContract.address, 1);

// expect(await nftContract.balanceOf(walletContract.address)).to.be.eq(1);

// await walletContract.connect(owner).setBlacklistedActions()
