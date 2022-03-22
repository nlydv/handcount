const { buildExchangeHistory, DECIMALS } = require("./lib/exchange.js");
const { toCSV } = require("./lib/util");

const build = {
    bitcoin: require("./lib/wallets/bitcoin.js"),
    handshake: require("./lib/wallets/handshake.js"),
};

class Account {
    constructor() {
        this.balance = 0;
        this.income = 0;
        this.expend = 0;
        this.burned = 0;
        this.sumFee = 0;
        this.numTxs = 0;
    }
}

const bank = {
    // HNS: {
    //     balance: 0,
    //     income: 0,
    //     expend: 0,
    //     burned: 0,
    //     sumFee: 0
    // }
};

let numTxs = 0;
let ledger = [];

function reconcile(wallet, exchange) {
    const transfers = [];
    let newWallet = wallet.ledger;
    let newExchange = exchange.ledger;

    exchange.ledger.forEach(tx => {
        if ( tx.type === "DEPOSIT" || tx.type === "WITHDRAW" ) transfers.push(tx);
    });

    for ( const tx of transfers ) {
        const hash = tx.id;
        const match = wallet.ledger.findIndex(wt => wt.id === hash);
        const wt = wallet.ledger[match];

        if ( match === -1 ) continue;

        const newTx = {
            id: hash,
            type: "TRANSFER",
            time: wt.time,
            block: wt.block,
            route: {
                from: ( tx.type === "DEPOSIT" ? "WALLET" : tx.origin ),
                to: ( tx.type === "DEPOSIT" ? tx.origin : "WALLET" )
            },
            txFee: wt.txFee + tx.txFee,
            delta: wt.net - (wt.txFee + tx.txFee),
            net: wt.net
        };

        newWallet[match] = newTx;
        newExchange = newExchange.filter(e => e !== tx);
    }

    return [ newWallet, newExchange ];
}

/* ————————————————————————————————————————————————————————————— */

async function buildPortfolio() {
    const wallets = {
        BTC: await build.bitcoin(),
        HNS: await build.handshake()
    };

    let exchange = await buildExchangeHistory();

    for ( const [money, acct] of Object.entries(wallets) ) {
        let wallet = acct;
        bank[money] = bank?.[money] ?? new Account();

        // merge matching deposit/withdrawal txs between wallet & exchange
        const merged = reconcile(wallet, exchange);
        wallet.ledger = merged[0];
        exchange.ledger = merged[1];

        // initate filling bank metrics by first copying hsw values (wallet.js)
        wallet = Object.entries(wallet);
        ledger = ledger.concat(wallet.pop()[1]);
        numTxs += wallet.pop()[1];
        wallet.forEach(value => { bank[money][value[0]] += value[1]; });
    }

    // then extract off & merge the meta/non-iterative metrics from exchange values (exchange.js)
    exchange = Object.entries(exchange);
    ledger = ledger.concat(exchange.pop()[1]);
    numTxs += exchange.pop()[1];
    const monies = exchange.shift()[1];

    // iterate and add numerical exchange metrics to respective bank values
    for ( const item of exchange ) {
        const metric = item[0];
        const values = item[1];

        for ( let money of monies ) {
            const i = monies.indexOf(money);
            // bank[money] = bank?.[money] ?? { balance: 0, income: 0, expend: 0, sumFee: 0 };
            bank[money] = bank?.[money] ?? new Account();
            bank[money][metric] += values[i];
        }
    }

    // limit numerical values to max precision of associated coin
    Object.keys(bank).forEach(money => {
        Object.keys(bank[money]).forEach(metric => {
            const fixed = Number.parseFloat(bank[money][metric].toFixed(DECIMALS[money]));
            bank[money][metric] = fixed;
        });
    });

    // re-sort ledger txs in chronological order
    ledger.sort((a, b) => new Date(a.time) - new Date(b.time));

    bank.numTxs = ledger.length;
    bank.ledger = ledger;

    return bank;
}

(async () => {
    const bank = await buildPortfolio();
    // console.log(JSON.stringify(bank));
    toCSV(bank);
})();
