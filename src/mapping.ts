import { BigInt } from "@graphprotocol/graph-ts"
import {
  Content as ContentContract,
  ApprovalForAll,
  Burn,
  Mint,
  TransferBatch,
  TransferSingle,
  URI
} from "../generated/Content/Content"
import {
  Content,
  User,
  Asset,
  AssetBalance
} from "../generated/schema"

export function handleApprovalForAll(event: ApprovalForAll): void {
}

export function handleBurn(event: Burn): void {
  let content = Content.load(event.address.toHexString())!;
  let user = User.load(event.params.data.account.toHexString())!;
  
  let assetIds = event.params.data.tokenIds;
  let amounts = event.params.data.amounts;

  for (let i = 0; i <assetIds.length; ++i) {
    let assetId = content.id + "-" + assetIds[i].toString();
    
    let assetBalance = AssetBalance.load(user.id + "-" + assetId)!;
    assetBalance.amount = assetBalance.amount.minus(amounts[i]);
    assetBalance.save();
  }
}

export function handleMint(event: Mint): void {
  // First thing is to create the Content entity if it doesn't already exist.
  let content = Content.load(event.address.toHexString());
  if (content == null) {
    content = new Content(event.address.toHexString());
    content.save();
  }

  // Next we check if the asset that was minted already exists.
  let assetIds = event.params.data.tokenIds;
  let amounts = event.params.data.amounts;
  let receiverAddr = event.params.data.to;

  // Create a user entity if receiver doesn't exist
  let receiver = User.load(receiverAddr.toHexString());
  if (receiver == null) {
    receiver = new User(receiverAddr.toHexString());
    receiver.save();
  }
  
  // We can access view functions from the contract to query information about the contract
  let contract = ContentContract.bind(event.address);

  for (let i = 0; i <assetIds.length; ++i) {
    let assetId = content.id + "-" + assetIds[i].toHexString();
    let asset = Asset.load(assetId);
    if (asset == null) {
      asset = new Asset(assetId);
      asset.tokenId = assetIds[i];
      asset.parent = content.id;
      asset.currentSupply = BigInt.fromI32(0);
      asset.maxSupply = contract.maxSupply(assetIds[i]);
    }
    asset.currentSupply = asset.currentSupply.plus(amounts[i]);
    asset.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let content = Content.load(event.address.toHexString());
  if (content == null) {
    content = new Content(event.address.toHexString());
    content.save();
  }

  let assetIds = event.params.ids;
  let amounts = event.params.values;

  // add asset to receiver
  if (event.params.to.toHex() != '0x0000000000000000000000000000000000000000') {
    // receiver exists
    let receiver = User.load(event.params.to.toHexString());
    if (receiver == null) {
      receiver = new User(event.params.to.toHexString());
      receiver.save();
    }

    for (let i = 0; i < assetIds.length; ++i) {
      let assetId = content.id + "-" + assetIds[i].toHexString();
      
      // get/create account balance
      let assetBalanceId = receiver.id + "-" + assetId;
      let assetBalance = AssetBalance.load(assetBalanceId);
      if (assetBalance == null) {
        assetBalance = new AssetBalance(assetBalanceId);
        assetBalance.owner = receiver.id;
        assetBalance.asset = assetId;
        assetBalance.amount = BigInt.fromI32(0);
      }

      assetBalance.amount = assetBalance.amount.plus(amounts[i]);
      assetBalance.save();
    }
  } 
  
  // deduct asset from sender
  if (event.params.from.toHex() != '0x0000000000000000000000000000000000000000') {
    // sender exists
    let sender = User.load(event.params.from.toHexString())!;

    for (let i = 0; i < assetIds.length; ++i) {
      let assetId = content.id + "-" + assetIds[i].toHexString();
      
      // get/create account balance
      let assetBalanceId = sender.id + "-" + assetId;
      let assetBalance = AssetBalance.load(assetBalanceId)!;

      assetBalance.amount = assetBalance.amount.minus(amounts[i]);
      assetBalance.save();
    }
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  let content = Content.load(event.address.toHexString());
  if (content == null) {
    content = new Content(event.address.toHexString());
    content.save();
  }

  // add asset to receiver
  let assetId = content.id + "-" + event.params.id.toHexString();
  let amount = event.params.value;
  if (event.params.to.toHex() != '0x0000000000000000000000000000000000000000') {
    // receiver exists
    let receiver = User.load(event.params.to.toHexString());
    if (receiver == null) {
      receiver = new User(event.params.to.toHexString());
      receiver.save();
    }

    // get/create account balance
    let assetBalanceId = receiver.id + "-" + assetId;
    let assetBalance = AssetBalance.load(assetBalanceId);
    if (assetBalance == null) {
      assetBalance = new AssetBalance(assetBalanceId);
      assetBalance.owner = receiver.id;
      assetBalance.asset = assetId;
      assetBalance.amount = BigInt.fromI32(0);
    }

    assetBalance.amount = assetBalance.amount.plus(amount);
    assetBalance.save();
  } 
  
  // deduct asset from sender
  if (event.params.from.toHex() != '0x0000000000000000000000000000000000000000') {
    // sender exists
    let sender = User.load(event.params.from.toHexString())!;

    // get/create account balance
    let assetBalanceId = sender.id + "-" + assetId;
    let assetBalance = AssetBalance.load(assetBalanceId)!;
    
    assetBalance.amount = assetBalance.amount.minus(amount);
    assetBalance.save();
  }
}

export function handleURI(event: URI): void {}
