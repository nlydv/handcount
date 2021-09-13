const deriveHD = require("@swan-bitcoin/xpub-lib").addressesFromExtPubKey;
const chain = require("blockchain.info/blockexplorer");

const zpub = "zpub6qq7nmVzQodC9qVpjJRSAFdhipobwnLAM16YxiUFrKULzg7qY3Ze7rnRija7pkmYEWYCFJDtPijPc5qZ7roxvBmNotM9nTtZN3y1cswd5ey";

const account = deriveHD({extPubKey: zpub, addressCount: 5, accountNumber: 0, network: "mainnet"});
const addrList = [];

account.forEach(a => addrList.push(a.address));

(async () => {
    const data = await chain.getMultiAddress(addrList);
    console.log(data);
})();
