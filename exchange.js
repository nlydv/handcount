const { BittrexClient } = require("bittrex-rest-client");
const opt = require("./config.json");

const client = new BittrexClient(opt.bittrex);
const DECIMALS = { BTC: 8, HNS: 6 };

const acct = {
    symbols: [],
    balance: [],
    income: [],
    expend: [],
    sumFee: [],
    numTxs: 0,
    ledger: []
};

function addTradeEntry(tx) {
    if ( tx.status !== "CLOSED" ) return null;

    const entry = {
        id: tx.id,
        type: tx.direction,
        time: tx.closedAt,
        origin: "Bittrex",
        base: {
            symbol: tx.marketSymbol.split("-")[0],
            txFee: 0,
            delta: tx.fillQuantity,
            net: null
        },
        quote: {
            symbol: tx.marketSymbol.split("-")[1],
            price: tx.proceeds / tx.fillQuantity,
            txFee: tx.commission,
            delta: tx.proceeds,
            net: null
        }
    };

    entry.base.delta *= ( entry.type === "BUY" ? 1 : -1 );
    entry.base.net = entry.base.delta;
    entry.quote.price = Number.parseFloat(entry.quote.price.toFixed(DECIMALS[entry.quote.symbol]));
    entry.quote.delta *= ( entry.type === "BUY" ? -1 : 1 );
    entry.quote.txFee *= ( entry.quote.txFee === 0 ? 0 : -1 );
    entry.quote.net = entry.quote.delta + entry.quote.txFee;

    return entry;
}

function addDeposit(tx) {
    if ( tx.status !== "COMPLETED" ) return null;

    const entry = {
        id: tx.txId,
        type: "DEPOSIT",
        time: tx.completedAt,
        symbol: tx.currencySymbol,
        origin: "Bittrex",
        txFee: 0,
        delta: Number.parseFloat(tx.quantity)
    };
    entry.txFee *= ( entry.txFee === 0 ? 0 : -1 );
    entry.net = entry.delta + entry.txFee;

    return entry;
}

function addWithdraw(tx) {
    if ( tx.status !== "COMPLETED" ) return null;

    const entry = {
        id: tx.txId,
        type: "WITHDRAW",
        time: tx.completedAt,
        symbol: tx.currencySymbol,
        origin: "Bittrex",
        txFee: Number.parseFloat(tx.txCost),
        delta: Number.parseFloat(tx.quantity)
    };

    entry.delta *= ( entry.delta === 0 ? 0 : -1 );
    entry.txFee *= ( entry.txFee === 0 ? 0 : -1 );
    entry.net = entry.delta + entry.txFee;

    return entry;
}

function calcAccount(entry) {
    let pair = [ entry ];
    if ( entry.type === "BUY" || entry.type === "SELL" ) {
        pair = [ entry.base, entry.quote ];
    }

    for ( const data of pair ) {
        if ( ! acct.symbols.includes(data.symbol) ) addSymbol(data.symbol);
        const x = acct.symbols.indexOf(data.symbol);

        if ( data.net <= 0 ) {
            acct.expend[x] += Math.abs(data.delta);
            acct.sumFee[x] += Math.abs(data.txFee);
        } else {
            acct.income[x] += Math.abs(data.delta);
        }

        acct.numTxs = acct.ledger.length;
        acct.balance[x] = Math.abs(acct.income[x] - acct.expend[x] - acct.sumFee[x]);
    }
}

function addSymbol(sym) {
    acct.symbols.push(sym);
    const i = acct.symbols.indexOf(sym);
    acct.balance[i] = 0;
    acct.income[i] = 0;
    acct.expend[i] = 0;
    acct.sumFee[i] = 0;
}

/* ————————————————————————————————————————————————————————————— */

async function buildExchangeHistory() {
    const trades = await client.getOrderHistory("HNS");
    const deposits = await client.depositHistory("", false);
    const withdraws = await client.withdrawalHistory(false);

    for ( const tx of trades ) {
        const entry = addTradeEntry(tx);
        acct.ledger.push(entry);
        calcAccount(entry);
    }

    for ( const d of deposits ) {
        const entry = addDeposit(d);
        acct.ledger.push(entry);
        calcAccount(entry);
    }

    for ( const w of withdraws ) {
        const entry = addWithdraw(w);
        acct.ledger.push(entry);
        calcAccount(entry);
    }

    acct.ledger.sort((a, b) => new Date(a.time) - new Date(b.time)); // chronological order
    return acct;
}

module.exports = { buildExchangeHistory, DECIMALS };
