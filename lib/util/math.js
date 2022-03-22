const Big = require("bignumber.js");

const DECI = {
    BTC: 8,
    ETH: 18,
    HNS: 6
};

function toCoin(base, deci) {
    const  expo = Big(10).pow(deci);
    const  coin = Big(base).div(expo);
    return coin;
}

function toBase(coin, deci) {
    const  expo = Big(10).pow(deci);
    const  base = Big(coin).times(expo);
    return base;
}

const toBTC = sat => toCoin(sat, DECI.BTC);
const toSAT = btc => toBase(btc, DECI.BTC);

const toETH = wei => toCoin(wei, DECI.ETH);
const toWEI = eth => toBase(eth, DECI.ETH);

const toHNS = dollaryDoo => toCoin(dollaryDoo, DECI.HNS);
const toDollaryDoo = hns => toBase(hns, DECI.HNS);

module.exports = {
    DECI,
    convert: {
        toCoin,
        toBase,
        toBTC,
        toSAT,
        toETH,
        toHNS,
        toDollaryDoo
    }
};
