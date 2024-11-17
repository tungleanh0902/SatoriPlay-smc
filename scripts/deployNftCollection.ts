import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const sender_address = provider.sender().address as Address;
    
    const mintPrice = Number(toNano('2')); // Set the initial mint price to 0.1 TON

    // Compile and open the NFT collection
    const nftCollection = provider.open(
        NftCollection.createFromConfig(
            {
                ownerAddress: sender_address,
                nextItemIndex: 0,
                collectionContentUrl: 'https://res.cloudinary.com/dbcbybvd7/raw/upload/v1731378933/nft_collection_fzxus9.json',
                commonContentUrl: 'https://satoriplay.com',
                nftItemCode: await compile('NftItem'),
                royaltyParams: {
                    factor: 0,
                    base: 0,
                    address: sender_address,
                },
                mintPrice, // Set the mint price in the configuration
            },
            await compile('NftCollection'),
        ),
    );

    // Deploy the NFT collection
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));

    // Wait for the contract to be deployed
    await provider.waitForDeploy(nftCollection.address);

    console.log('NFT Collection deployed at:', nftCollection.address.toString());
}

// test: EQCAhJJwsJtB2gXD4clIXXzPV57uakSG-74Kd9ulGht-bpBQ
// mainnet: EQC0UxBTZ6G-9D8p3obWZB3qnX9YfWPJuLXuCxGSOx_xlCyq