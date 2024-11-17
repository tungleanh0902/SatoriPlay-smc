import { Address, toNano } from '@ton/core';
import { NftItem } from '../wrappers/NftItem';
import { compile, NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../wrappers/NftCollection';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));
    const index = BigInt(args.length > 1 ? args[1] : await ui.input('NFT Index'));

    const nftCollection = provider.open(NftCollection.createFromAddress(address));

    const data = await nftCollection.getNftAddressByIndex(index);
    console.log(data);
}