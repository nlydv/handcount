const fs = require("fs");
const Big = require("bignumber.js");
const etherscan = require("etherscan-api");

const opt = require("handcount/opt");
const { Account, Ledger, Entry } = require("handcount/model");
const { convert, data, DECIMALS } = require("handcount/util");

const { toETH, toWEI, toCoin, toBase } = convert;

const addr = opt.eth.addr;
const eth  = etherscan.init(opt.eth.api);

// Records of raw data returned by Etherscan API
let journal = {
    time:       null,
    ethBalance: null,
    normal:     null,
    internal:   null,
    token:      null
};

// Records posted from journals after parsing & reconciling
// const acct = new Ledger("ETH Wallet", "ETH");

// const ledger = {
//     time: null,
//     eth: {
//         balance: 0,
//
//         log: [],
//     },
//     entries: []
// };

// Conversions between WEI and ETH; and, for tokens, its Base and Coin values.
// const toCoin = (base, deci) => base / Math.pow(10, deci);
// const toBase = (coin, deci) => coin * Math.pow(10, deci);
// const toETH = wei => Big(wei).div(1E18);
// const toWEI = eth => Big(eth).times(1E18);

async function fillJournal(save = true) {
    let status = true;
    const res = r => r.result;
    const err = e => { status = false; return e; };

    journal.time       = new Date();
    journal.ethBalance = await eth.account.balance(addr).then(b => toETH(b.result)).catch(err);
    journal.normal     = await eth.account.txlist(addr, "earliest", "latest", 1, 9999, "asc").then(res).catch(err);
    journal.internal   = await eth.account.txlistinternal(null, addr, "earliest", "latest", "asc").then(res).catch(err);
    journal.token      = await eth.account.tokentx(addr, null, "earliest", "latest", 1, 9999, "asc").then(res).catch(err);

    if ( save ) data.save(journal, "eth/journal");

    return status;
}

function parseJournal(save = true) {
    const normal = [], internal = [], token = [];

    for ( const tx of journal.normal ) {
        const entry = {
            time:     tx.timeStamp,
            hash:     tx.hash,
            sender:   ( tx.from === addr ? true : false ),
            receiver: ( tx.to   === addr ? true : false ),
        };

        let val = toETH(tx.value);
        let gas = toETH(tx.gasPrice).times(tx.gasUsed);

        val = val.times( tx.isError === "1" ? 0 : 1 );
        val = val.times( entry.sender && val > 0 ? -1 : 1 );
        gas = gas.times( entry.sender ? 1 : 0 );

        entry.delta = val;
        entry.fee   = gas;

        normal.push(entry);
    }

    for ( const tx of journal.internal ) {
        const entry = {
            time: tx.timeStamp,
            hash: tx.hash,
            delta: ( tx.isError === "1" ? 0 : toETH(tx.value) )
        };

        internal.push(entry);
    }

    for ( const tx of journal.token ) {
        const entry = {
            time: tx.timeStamp,
            hash: tx.hash,
            name: tx.tokenName,
            tick: tx.tokenSymbol,
            sender: ( tx.from === addr ? true : false ),
            receiver: ( tx.to === addr ? true : false ),
            delta: toCoin(tx.value, tx.tokenDecimal)
        };

        token.push(entry);
    }

    journal.normal = normal;
    journal.internal = internal;
    journal.token = token;

    if ( save ) data.save(journal, "eth/parsed");
}

function buildLedger(save = true) {
    const acct = new Ledger("ETH Wallet", "ETH");

    // Find internals and normals with matching tx hash and sum delta into single entry
    for ( const tx of journal.normal ) {
        let val = Big(tx.delta);
        let gas = Big(tx.fee);

        const matches = journal.internal.filter(i => i.hash === tx.hash);
        for ( const match of matches ) val = val.plus(match.delta);

        const entry = new Entry(tx.hash, tx.time, val, gas);
        acct.addEntry(entry);
    }

    // Find and add entry for standalone internals
    for ( const tx of journal.internal ) {
        const isAccounted = journal.normal.some(n => n.hash === tx.hash);
        if ( ! isAccounted ) {
            const entry = new Entry(tx.hash, tx.time, tx.delta, 0);
            acct.addEntry(entry);
        }
    }

    acct.ledger.sort((a, b) => new Date(a.time) - new Date(b.time)); // chronological order
    if ( save ) data.save(acct, "eth/ledger");

    return acct;
}

(async () => {
    await fillJournal();
    // journal = require("handcount/data/eth/journal.json");
    parseJournal();
    const acct = buildLedger();
    // console.log(acct.ledger);

    console.log(`Calculated:   ${acct.balance}`);
    console.log(`Etherscan:    ${journal.ethBalance}`);
    console.log("Equal:        " + Big(journal.ethBalance).eq(acct.balance));
    console.log("sumFee:       " + acct.sumFee);
})();

// "normal": [
//     {
//         blockNumber: '7170000',
//         timeStamp: '1549225465',
//         hash: '0x386de460742a3edbce0bbab3c4e18d211e25035ef8db76f515b9eb0dd095a005',
//         nonce: '516',
//         blockHash: '0x38458ab2491fdcbff8e9b4050fdc705380fb12cf54e5439adce33ed270974f20',
//         transactionIndex: '72',
//         from: '0x2d90331b87246af3a99dfe2672ebd114d887be71',
//         to: '0x82aa7f697b9bc19f286d286d130405c0850a2e7b',
//         value: '2808015949530593',
//         gas: '21000',
//         gasPrice: '4000000000',
//         isError: '0',
//         txreceipt_status: '1',
//         input: '0x',
//         contractAddress: '',
//         cumulativeGasUsed: '4742815',
//         gasUsed: '21000',
//         confirmations: '6548160'
//     }
// ]

// "internal": [
//     {
//         blockNumber: '7231429',
//         timeStamp: '1550397500',
//         hash: '0xc4400eb8c57a1ae93b2b32eb0507228b3f43008d9d2b0705075cf06f7c7220b9',
//         from: '0xe658e6eb4b478da2cf36d9e3712ba0c1b33786a1',
//         to: '0x82aa7f697b9bc19f286d286d130405c0850a2e7b',
//         value: '18050000000000000',
//         contractAddress: '',
//         input: '',
//         type: 'call',
//         gas: '2300',
//         gasUsed: '0',
//         traceId: '0',
//         isError: '0',
//         errCode: ''
//     }
// ]

// "token": [
//     {
//         "blockNumber": "13691876",
//         "timeStamp": "1637958551",
//         "hash": "0x700aa30c6495235a6d26c2834170932d87966d11ae74247a2dab3330418503a5",
//         "nonce": "1689",
//         "blockHash": "0x35bcbbe43ee8f8da3ecf98ad927ac3ad0ad79a7f4a9a9e4923abbe2e5b894939",
//         "from": "0x82aa7f697b9bc19f286d286d130405c0850a2e7b",
//         "contractAddress": "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72",
//         "to": "0x92560c178ce069cc014138ed3c2f5221ba71f58a",
//         "value": "200000000000000000000",
//         "tokenName": "Ethereum Name Service",
//         "tokenSymbol": "ENS",
//         "tokenDecimal": "18",
//         "transactionIndex": "131",
//         "gas": "228543",
//         "gasPrice": "89371519786",
//         "gasUsed": "170172",
//         "cumulativeGasUsed": "13521606",
//         "input": "deprecated",
//         "confirmations": "26293"
//     }
// ]
