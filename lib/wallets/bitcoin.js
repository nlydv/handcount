const chain = require("blockchain.info/blockexplorer");
const addresses = require("handcount/opt").btc.addr;

const acct = {
    balance: 0,
    income: 0,
    expend: 0,
    burned: 0,
    sumFee: 0,
    numTxs: 0,
    ledger: []
};

function addEntry(tx) {
    const entry = {
        id: tx.hash,
        wallet: "BTC",
        type: null,
        time: new Date(tx.time * 1000).toISOString(),
        block: tx.block_height,
        origin: null,
        route: null,
        txFee: ( tx.result <= 0 ? tx.fee : 0 ),
        delta: null,
        net: tx.result
    };

    entry.delta = tx.result + entry.txFee;

    if ( tx.result > 0 ) {
        entry.type   = "DEPOSIT";
        entry.origin = false;
    } else {
        entry.type   = ( entry.delta === 0 ? "OTHER" : "WITHDRAW" );
        entry.origin = true;
        entry.route  = { from: "MY_WALLET", to: "MY_WALLET" };
    }

    return entry;
}

function baseToCoin(acct) {
    const toBTC = satoshis => satoshis / 100000000;
    const toSatoshis = btc => btc * 100000000;

    for ( const [key, value] of Object.entries(acct) ) {
        if ( key === "ledger" ) {
            for ( const entry of value ) {
                entry.delta = toBTC(entry.delta);
                entry.txFee = toBTC(entry.txFee);
                entry.net   = toBTC(entry.net);
            }
        } else {
            acct[key] = ( key === "numTxs" ? value : toBTC(value) );
        }
    }
}

/* ————————————————————————————————————————————————————————————— */

async function buildWallet() {
    // const history = await wallet.getHistory(opt.account);
    const history = await chain.getMultiAddress(addresses);

    for ( const tx of history.txs ) {
        const entry = addEntry(tx);
        acct.ledger.push(entry);

        if ( entry.origin ) {
            acct.expend += Math.abs(entry.delta);
            acct.sumFee += Math.abs(entry.txFee);
        } else {
            acct.income += Math.abs(entry.delta);
        }

        acct.balance = acct.income - acct.expend - acct.sumFee;
        acct.numTxs++;
    }

    baseToCoin(acct);
    acct.ledger.sort((a, b) => new Date(a.time) - new Date(b.time)); // chronological order
    return acct;
}

// (async () => {
//     const data = await buildWalletHistory();
//     console.log(data);
// })();

module.exports = buildWallet;

// {
//   hash: [String],
//   ver: 2,
//   vin_sz: 1,
//   vout_sz: 2,
//   size: 226,
//   weight: 577,
//   fee: 1542,
//   relayed_by: '0.0.0.0',
//   lock_time: 555319,
//   tx_index: [Number],
//   double_spend: false,
//   time: 1545690371,
//   block_index: [Number],
//   block_height: [Number],
//   inputs: [Array],
//   out: [Array],
//   result: 71706,
//   balance: 71706
// }
