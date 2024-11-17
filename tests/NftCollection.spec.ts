import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, Dictionary, toNano, Address } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile } from '@ton/blueprint';
import '@ton/test-utils';

describe('NftCollection', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('NftCollection'); // Compile the contract
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let receiver: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const mintPrice = Number(toNano('1')); // Set the initial mint price to 0.1 TON

        // Set up deployer
        deployer = await blockchain.treasury('deployer');
        receiver = await blockchain.treasury('receiver');
        user = await blockchain.treasury('user');

        // Open the compiled contract on the blockchain
        nftCollection = blockchain.openContract(
            NftCollection.createFromConfig(
                {
                    ownerAddress: deployer.address,
                    nextItemIndex: 0,
                    collectionContentUrl: 'https://psalmfill.github.io/tiwiflix-ton-nft/collection.json',
                    commonContentUrl: 'https://psalmfill.github.io/tiwiflix-ton-nft',
                    nftItemCode: await compile('NftItem'),
                    royaltyParams: {
                        factor: 10,
                        base: 100,
                        address: deployer.address,
                    },
                    mintPrice, // Set the mint price in the configuration
                },
                code,
            ),
        );

        // Deploy the contract
        const deployResult = await nftCollection.sendDeploy(deployer.getSender(), toNano('0.05'));

        // Ensure contract is deployed successfully
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    // Test case 1: Verify contract deployment
    it('should deploy successfully', async () => {
        // Checks are already done in the beforeEach
    });

    // Test case 2: Get collection data
    it('should return correct collection data', async () => {
        const collectionData = await nftCollection.getCollectionData();
        // expect(collectionData).toBeTruthy();
        expect(collectionData.ownerAddress.toString()).toBe(deployer.address.toString());
        expect(collectionData.nextItemIndex.toString()).toBe('0'); // next_item_index starts at 0
        // Add checks for collection content, owner, etc.
    });

    // Test case 3: Mint a new NFT
    it('should mint a new NFT', async () => {
        const mintFee = toNano('1');
        const nftContent = new Cell(); // Add any necessary NFT content
        const data = await nftCollection.getCollectionData();

        let receiverBalance = await receiver.getBalance()
        console.log(receiverBalance);

        let deployerBalance = await deployer.getBalance()
        console.log(deployerBalance);

        // Send a message to mint a new NFT
        const mintResult = await nftCollection.sendMint(user.getSender(), {
            index: data.nextItemIndex,
            value: toNano('0.05')+ mintFee,
            queryId: Date.now(),
            coinsForStorage: toNano('0.05') + mintFee,
            ownerAddress: deployer.address,
            content: '/nft.json',
            receiveAddress: deployer.address
        });

        console.log(mintResult);

        // Ensure the minting transaction is successful
        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            success: true,
        });

        // Verify next_item_index has incremented
        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.nextItemIndex.toString()).toBe('1'); // next_item_index should now be 1

        receiverBalance = await receiver.getBalance()
        console.log(receiverBalance);

        deployerBalance = await deployer.getBalance()
        console.log(deployerBalance);
    });

    // Test case 4: Mint a new NFT from a different address
    it('should mint a new NFT from another address', async () => {
        const mintFee = toNano('1');
        const nftContent = new Cell(); // Add any necessary NFT content
        const data = await nftCollection.getCollectionData();

        // Create another address (for example, a "user" address)
        const user = await blockchain.treasury('user'); // Simulate a new user address

        // Send a message to mint a new NFT using the 'user' address instead of 'deployer'
        const mintResult = await nftCollection.sendMint(user.getSender(), {
            // <-- Use user.getSender()
            index: data.nextItemIndex,
            value: toNano('0.05') + mintFee,
            queryId: Date.now(),
            coinsForStorage: toNano('0.05') + mintFee,
            ownerAddress: user.address, // Set the 'user' address as the owner
            content: '/nft.json',
            receiveAddress: receiver.address
        });

        // Ensure the minting transaction is successful
        expect(mintResult.transactions[1]).toHaveTransaction({
            from: user.address, // <-- Now 'from' is the 'user' address
            to: nftCollection.address,
            success: true,
        });

        // Verify next_item_index has incremented
        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.nextItemIndex.toString()).toBe('1'); // next_item_index should now be 1
    });

    // Test case 5: Update minting price
    it('should update minting price', async () => {
        const newMintingPrice = Number(toNano('0.2'));

        // Send a message to update the minting price
        const updatePriceResult = await nftCollection.sendChangeMintPrice(deployer.getSender(), {
            value: toNano('0.01'),
            queryId: Date.now(),
            newMintPrice: newMintingPrice,
        });

        // Ensure transaction is successful
        expect(updatePriceResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        // Verify minting price has been updated
        const mintingPrice = await nftCollection.getMintingPrice();
        expect(mintingPrice.toString()).toBe(newMintingPrice.toString());
    });

    it('should update owner address', async () => {
        // Send a message to update the minting price
        const updatePriceResult = await nftCollection.sendChangeOwner(deployer.getSender(), {
            value: toNano('0.01'),
            queryId: Date.now(),
            newOwnerAddress: deployer.address,
        });

        // Ensure transaction is successful
        expect(updatePriceResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        // Verify collection data has been updated
        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.ownerAddress.toString()).toBe(deployer.address.toString());
    });

    it('should update content', async () => {
        const mintPrice = Number(toNano('0.1')); // Set the initial mint price to 0.1 TON
        const newCollectionContentUrl = 'https://psalmfill.github.io/tiwiflix-ton-nft/new-collection.json';
        // Send a message to update the minting price
        const updateContentResult = await nftCollection.sendChangeContent(deployer.getSender(), toNano('0.01'), {
            ownerAddress: deployer.address,
            nextItemIndex: 0,
            collectionContentUrl: newCollectionContentUrl,
            commonContentUrl: 'https://psalmfill.github.io/tiwiflix-ton-nft',
            nftItemCode: await compile('NftItem'),
            royaltyParams: {
                factor: 10,
                base: 100,
                address: deployer.address,
            },
            mintPrice, // Set the mint price in the configuration
        });
        // Ensure transaction is successful
        expect(updateContentResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        // Verify collection data has been updated
        const collectionData = await nftCollection.getCollectionData();
        expect(collectionData.collectionContentUrl.toString()).toBe(newCollectionContentUrl);
    });

    // Test case 5: Batch deploy NFTs
    // it('should batch deploy multiple NFTs', async () => {
    //     const nftBatch = [];
    //     const batchSize = 5; // Example batch size

    //     // Prepare a list of NFTs to deploy in batch
    //     for (let i = 0; i < batchSize; i++) {
    //         const nftContent = beginCell(); // Create your NFT content cell
    //         nftContent.storeAddress(deployer.address); // Store the owner's address

    //         const uriContent = beginCell();
    //         uriContent.storeBuffer(Buffer.from('/nft.json'));
    //         nftContent.storeRef(uriContent.endCell());

    //         nftBatch.push({
    //             index: i,
    //             coins: toNano('0.05'), // The storage fee for each NFT
    //             content: nftContent.endCell(), // The NFT content
    //         });
    //     }

    //     // Prepare the batch cell to send
    //     const batchCell = beginCell();

    //     // Use the built-in serializer for uint (64-bit unsigned integers)
    //     const nftDict = Dictionary.empty(Dictionary.Keys.Uint(64), Dictionary.Values.Cell()); // Use Uint(64) for key type

    //     for (let nft of nftBatch) {
    //         // Create the cell for batch_deploy_nft_item (store coins and content)
    //         const nftItemCell = beginCell()
    //             .storeCoins(nft.coins)    // This is the amount (int amount)
    //             .storeRef(nft.content)    // This is the NFT content (cell nft_content)
    //             .endCell();

    //         // Add to dictionary with index as the key and the nftItemCell as the value
    //         nftDict.set(nft.index, nftItemCell);
    //     }

    //     batchCell.storeDictDirect(nftDict); // Store the dictionary in the batch cell

    //     // Send the batch deployment message
    //     const batchDeployResult = await nftCollection.sendBatchMint(deployer.getSender(), {
    //         value: toNano('1'), // Value sent to cover the entire batch
    //         queryId: Date.now(),
    //         deployList: batchCell.endCell(), // The batch cell containing all NFTs
    //     });

    //     // Ensure batch deployment was successful
    //     expect(batchDeployResult.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: nftCollection.address,
    //         success: true,
    //     });

    //     // Check that the next_item_index has incremented properly
    //     const collectionData = await nftCollection.getCollectionData();
    //     expect(collectionData.nextItemIndex.toString()).toBe(batchSize.toString()); // All NFTs should be deployed
    // });

    // it('should batch deploy multiple NFTs', async () => {
    //     const collectionData = await nftCollection.getCollectionData();
    //     let nextItemIndex = collectionData.nextItemIndex;
    //     const nftMinStorage = '0.05';
    //     let counter = 0;
    //     const nftDict = Dictionary.empty<number, Cell>();
    //     for (let index = 0; index < 3; index++) {
    //         const metaCell = beginCell().storeStringTail('/nft.json').endCell();
    //         const nftContent = beginCell().storeAddress(deployer.address).storeRef(metaCell).endCell();
    //         nftDict.set(nextItemIndex, nftContent);
    //         nextItemIndex++;
    //         counter++;
    //     }

    //     /*
    //     We need to write our custom serialization and deserialization
    //     functions to store data correctly in the dictionary since the
    //     built-in functions in the library are not suitable for our case.
    // */
    //     const messageBody = beginCell()
    //         .storeUint(2, 32)
    //         .storeUint(Date.now(), 64)
    //         .storeDict(nftDict, Dictionary.Keys.Uint(64), {
    //             serialize: (src, builder) => {
    //                 builder.storeCoins(toNano(nftMinStorage));
    //                 builder.storeRef(src);
    //             },
    //             parse: (src) => {
    //                 return beginCell().storeCoins(src.loadCoins()).storeRef(src.loadRef()).endCell();
    //             },
    //         })
    //         .endCell();

    //     const totalValue = String((counter * parseFloat(nftMinStorage.toString()) + 0.015 * counter).toFixed(6));
    //     const batchDeployResult = await nftCollection.sendBatchMint(deployer.getSender(), {
    //         value: toNano(totalValue), // Value sent to cover the entire batch
    //         queryId: Date.now(),
    //         deployList: messageBody, // The batch cell containing all NFTs
    //     });

    //     // Ensure batch deployment was successful
    //     expect(batchDeployResult.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: nftCollection.address,
    //         success: false,
    //     });
    // });

    it('should batch deploy multiple NFTs', async () => {
        const collectionData = await nftCollection.getCollectionData();
        let nextItemIndex = collectionData.nextItemIndex;
        const nftMinStorage = '0.05';
        let counter = 0;
        const nfts =[];
        const mintCount = 2;
        for (let itemIndex = nextItemIndex; itemIndex < nextItemIndex + mintCount; itemIndex++) {
            const itemContentUri = `/nft.json`
            const nft = { itemContentUri, itemOwnerAddress:deployer.address, nftMinStorage, itemIndex }
            nfts.push(nft)
            counter++;
          }

        /*
        We need to write our custom serialization and deserialization
        functions to store data correctly in the dictionary since the
        built-in functions in the library are not suitable for our case.
    */
        const nftDict = Dictionary.empty(Dictionary.Keys.Uint(64), Dictionary.Values.Cell()); // Use Uint(64) for key type

        for (let nft of nfts) {
            // Create the cell for batch_deploy_nft_item (store coins and content)
            const nftContent = beginCell(); // Create your NFT content cell
                    nftContent.storeAddress(deployer.address); // Store the owner's address
        
                    const uriContent = beginCell();
                    uriContent.storeBuffer(Buffer.from('/nft.json'));
                    nftContent.storeRef(uriContent.endCell());
        
            const container = beginCell().storeCoins(toNano(nft.nftMinStorage)).storeRef(nftContent.endCell()).endCell()
            // Add to dictionary with index as the key and the nftItemCell as the value
            nftDict.set(nft.itemIndex, container);
        }

        const totalValue = String((counter * parseFloat(nftMinStorage.toString()) + 0.015 * counter).toFixed(6));
        console.log('totalValue', totalValue);
        const batchDeployResult = await nftCollection.sendBatchMint(deployer.getSender(), {
            value: toNano(totalValue), // Value sent to cover the entire batch
            queryId: Date.now(),
            deployList: beginCell().storeDictDirect(nftDict).endCell(), // The batch cell containing all NFTs
        });

        // Ensure batch deployment was successful
        expect(batchDeployResult.transactions).toHaveTransaction({
            success: true,
        });
    });

    // Test case 6: Get royalty parameters
    it('should return royalty parameters', async () => {
        const royaltyParams = await nftCollection.getRoyaltyParams();
        const data = await nftCollection.getCollectionData();

        // Ensure royalty parameters are returned correctly
        expect(royaltyParams).toBeTruthy();
        expect(royaltyParams.base.toString()).toBe('100'); // Example: royalty base
        expect(royaltyParams.factor.toString()).toBe('10'); // Example: royalty factor
        // Verify royalty address as well
    });

    // Test case 7: Get NFT address by index
    it('should return correct NFT address by index', async () => {
        const nftAddress = await nftCollection.getNftAddressByIndex(0n);

        // Ensure NFT address is returned correctly
        expect(nftAddress).toBeTruthy();
    });

    // Test case 8: Handle incorrect minting price (error case)
    it('should fail if minting price is too low', async () => {
        const mintFee = toNano('0.05'); // Too low
        const data = await nftCollection.getCollectionData();
        // Create another address (for example, a "user" address)
        const user = await blockchain.treasury('user'); // Simulate a new user address

        const mintResult = await nftCollection.sendMint(user.getSender(), {
            index: data.nextItemIndex,
            value: toNano('0.05') + mintFee,
            queryId: Date.now(),
            coinsForStorage: toNano('0.05'),
            ownerAddress: user.address,
            content: '/nft.json',
            receiveAddress: receiver.address
        });

        // Ensure the transaction failed
        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            success: false, // Should fail
        });
    });
});