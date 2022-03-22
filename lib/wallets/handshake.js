const { WalletClient } = require("hs-client");
const { Account } = require("handcount/util");
const opt = require("handcount/opt");

const client = new WalletClient(opt.hsw);
const wallet = client.wallet(opt.wallet);

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
        wallet: "HNS",
        type: null,
        time: tx.date,
        block: tx.height,
        origin: ( tx.fee === 0 ? false : true ),
        txFee: tx.fee,
        delta: 0,
        net: 0
    };

    for ( const input of tx.inputs ) {
        if ( input.path !== null ) {
            entry.net -= input.value;
        }
    }

    for ( const output of tx.outputs ) {
        if ( output.path !== null ) {
            if ( isBurned(output.covenant.action) ) {
                acct.burned += output.value;
            } else {
                entry.net += output.value;
            }
        }
    }

    entry.txFee *= ( entry.txFee === 0 ? 0 : -1 );
    entry.delta = entry.net - entry.txFee;

    if ( entry.delta === 0 ) {
        entry.type = "OTHER";
    } else {
        entry.type = ( entry.delta > 0 ? "DEPOSIT" : "WITHDRAW" );
    }

    return entry;
}

function isBurned(type) {
    switch (type) {
        case "REGISTER":
        case "FINALIZE":
            return true;
        default:
            return false;
    }
}

function baseToCoin(acct) {
    const toHNS = dollaryDoo => dollaryDoo / 1E6;
    const toDollaryDoo = hns => hns * 1E6;

    for ( const [key, value] of Object.entries(acct) ) {
        if ( key === "ledger" ) {
            for ( const entry of value ) {
                entry.delta = toHNS(entry.delta);
                entry.txFee = toHNS(entry.txFee);
                entry.net = toHNS(entry.net);
            }
        } else {
            acct[key] = toHNS(value);
        }
    }
}

/* ————————————————————————————————————————————————————————————— */

async function buildWallet() {
    const history = await wallet.getHistory(opt.account);

    for ( const tx of history ) {
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

module.exports = buildWallet;
