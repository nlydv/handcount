/* WARNING
 * the contents of this file are largely unfinished attempts at
 * abstracting and refactoring accounting logic which is otherwise
 * handled in an ad-hoc way
 */

const Big = require("bignumber.js");

class Account {
    constructor(name) {
        this.balance = 0;
        this.income = 0;
        this.expend = 0;
        this.burned = 0;
        this.sumFee = 0;
        this.numTxs = 0;
    }
}

// Re-name this class to "Account" later after refactoring code depending on the above Account class
class Ledger {
    constructor(name, currency) {
        this.name = name;
        this.unit = currency;
        this.ledger = [];
    }

    get balance() {
        // let total = 0;
        const total = [];
        for ( const entry of this.ledger ) {
            total.push(entry.delta);
            // total.push(entry.fee);
        }
        return Big.sum.apply(null, total).minus(this.sumFee);
    }

    get sumFee() {
        let sum = [];
        for ( const entry of this.ledger ) {
            sum.push(entry.fee);
        }
        return Big.sum.apply(null, sum);
    }

    get numTxs() {
        return this.ledger.length;
    }

    addEntry(entry) {
        this.ledger.push(entry);
    }
}

class Entry {
    constructor(id, time, amount, txFee) {
        this.id = id;
        this.time = time;
        this.delta = amount;
        this.fee = txFee;
    }
}

module.exports = { Account, Ledger, Entry };
