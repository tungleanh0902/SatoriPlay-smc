import { Address, toNano } from '@ton/core';
import { NftItem } from '../wrappers/NftItem';
import { compile, NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../wrappers/NftCollection';
import { TonClient } from '@ton/ton';

export async function run(provider: NetworkProvider, args: string[]) {
    // const ui = provider.ui();

    // const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));

    // const nftCollection = provider.open(NftCollection.createFromAddress(address));

    // const data = await nftCollection.getCollectionData();
    // console.log(data);
    const client = new TonClient({ 
        endpoint: "https://toncenter.com/api/v2/jsonRPC",
        apiKey: "0409210e362c15e81f6b81273f7980ce568481c773ce0b1a8e92dbc11a18cc4d"
    });
    let response = await client.runMethod(
        Address.parse("EQB8D8A9OoDoRmL7qVbUBrd_po9vNKcl44HCSw6b-c3nvcj9"),
        "get_nft_address_by_index",
        [{ type: "int", value: BigInt(0) }]
    );
    console.log(response.stack.readAddress());
}