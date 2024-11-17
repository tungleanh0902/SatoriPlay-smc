import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));
    
    const mintPrice = Number(toNano('0.02')); // Set the initial mint price to 0.1 TON

    // Compile and open the NFT collection
    const nftCollection = provider.open(NftCollection.createFromAddress(address));


    // Optional: Set the mint price after deployment
    await nftCollection.sendChangeMintPrice(provider.sender(), {
        value: toNano('0.02'), // Gas fee for changing the price
        queryId: Date.now(), // Unique query ID
        newMintPrice: mintPrice, // Set the mint price
    });

    console.log('Mint price set to:', mintPrice.toString());

    // Get and log the current mint price
    const currentMintPrice = await nftCollection.getMintingPrice();
    console.log('Current mint price:', currentMintPrice.toString());
}

// EQC1LOmdteG30shn2SNiO6RT4Xqje-_A2go8Ftw0dhOR0i6b