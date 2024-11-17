import { TonClient } from "@ton/ton";
import { Address, beginCell, Cell, loadMessage, storeMessage, Transaction } from "@ton/core";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import axios from "axios";

interface WaitForTransactionOptions {
    address: string;
    hash: string;
    refetchInterval?: number;
    refetchLimit?: number;
}

const waitForTransaction = async (
    options: WaitForTransactionOptions,
    client: TonClient
): Promise<string | null> => {
    const { hash, refetchInterval = 1000, refetchLimit, address } = options;

    return new Promise((resolve) => {
        let refetches = 0;
        const walletAddress = Address.parse(address);
        const interval = setInterval(async () => {
            refetches += 1;
            console.log("waiting transaction...");
            const state = await client.getContractState(walletAddress);
            if (!state || !state.lastTransaction) {
                clearInterval(interval);
                resolve(null);
                return;
            }
            const lastLt = state.lastTransaction.lt;
            const lastHash = state.lastTransaction.hash;
            const lastTx = await client.getTransactions(
                walletAddress, {
                    hash: lastHash,
                    lt: lastLt,
                    archival: true,
                    limit: 10
                }
            );

            if (lastTx && lastTx[0].inMessage) {
                const msgCell = beginCell()
                    .store(storeMessage(lastTx[0].inMessage))
                    .endCell();

                const inMsgHash = msgCell.hash().toString("base64");
                console.log("InMsgHash ", inMsgHash);
                console.log("hash ", hash);
                
                if (inMsgHash === hash) {
                    clearInterval(interval);
                    resolve(inMsgHash);
                }
            }
            if (refetchLimit && refetches >= refetchLimit) {
                clearInterval(interval);
                resolve(null);
            }
        }, refetchInterval);
    });
};


export async function run() {
    const tonQuery = axios.create({
        baseURL: 'https://testnet.tonapi.io/v2/blockchain/transactions/'
    });
    const client = new TonClient({ 
        endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
     });
    try {
        let boc = "te6cckECBgEAASIAAeWIAKvwOFmhnU9GlA+KKEY+cJtThmSN5EYQMDVivnd8CxCcA5tLO3P///iLOZcMQAAAAORIn2O80D8T8IGURsWd7vZ7AME81vj5zNFNufHKD45r5GO5fl0nlAT8gFcSZzrdwrgPfHDiQ0LxtfBaHEM3+WIHAQIKDsPIbQMFAgHbYgBalnTO2vDb6WQz7JGxHdIp8L1RvffgbQUeC24aOwnI6SAhYOwAAAAAAAAAAAAAAAAAAAAAAAEAAAGTHrw9QQAAAAAAAAAEQC+vCAgAG6TwG5DI7PxtOECMxbvY/cfgX1Twk91ewE+0zt29mBMDAUOACr8DhZoZ1PRpQPiihGPnCbU4ZkjeRGEDA1Yr53fAsQnQBAASL25mdC5qc29uAAC/M7SN"
        const hash = Cell.fromBase64(boc)
            .hash()
            .toString("base64");

        const message = loadMessage(
            Cell.fromBase64(boc).asSlice()
        );
        console.log("Message:", message.body.hash().toString("hex"));

        if (client) {
            const txFinalized = await waitForTransaction(
                {
                    address: "kQAN0ngNyGR2fjacIEZi3ex-4_AvqnhJ7q9gJ9pnbt7MCRwj",
                    hash: hash,
                },
                client
            );
            console.log("txFinalized: ", txFinalized);
            let tx = await tonQuery.get("d2715bde61255470c0fe0031b64c5da0a68e04160e9b2653a3e60334b8cd9524")
            console.log(tx.data);
        }
    } catch (e) {
        console.error(e);
    }
}