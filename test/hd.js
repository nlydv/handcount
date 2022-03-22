const deriveHD = require("@swan-bitcoin/xpub-lib").addressesFromExtPubKey;
const chain = require("blockchain.info/blockexplorer");

const zpub = "zpubREDACTED";

const account = deriveHD({extPubKey: zpub, addressCount: 5, accountNumber: 1, network: "mainnet"});
const addrList = [];

account.forEach(a => addrList.push(a.address));

(async () => {
    const data = await chain.getMultiAddress(addrList);
    console.log(data);
})();
