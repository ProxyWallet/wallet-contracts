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

    await expect(
      walletContract.autoExecuteTo(autoExecuteTo),
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
    await walletContract.autoExecuteTo(autoExecuteTo);

    expect(await blacklistedContract.count()).to.be.eq(10);
  });
});
