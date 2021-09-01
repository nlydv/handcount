const fs = require("fs");

function toCSV(bank) {
    let header = "Date, Type, Exchange, Base amount, Base currency, Quote amount, Quote currency, Fee, Fee currency, Costs/Proceeds, Costs/Proceeds currency, Sync Holdings, Sent/Received from, Sent to, Notes\n";
    let multiStr = "";
    let row = {};

    for ( let entry of bank.ledger ) {
        row = {
            date: `${entry.time.substring(0, 10)} ${entry.time.substring(11, 19)} +00:00`,
            type: entry.type,
            exchange: ( typeof entry.origin === "boolean" ? "" : entry.origin ),
            baseAmount: Math.abs(entry.delta),
            baseCurrency: entry.symbol ?? "HNS",
            quoteAmount: "",
            quoteCurrency: "",
            fee: Math.abs(entry.txFee),
            feeCurrency: entry.symbol ?? "HNS",
            costsOrProceeds: "",
            costsOrProceedsCurrency: "",
            syncHoldings: "",
            sentOrReceivedFrom: "",
            sentTo: "",
            notes: ""
        };

        switch (row.type) {
            case "TRANSFER":
                row.exchange = row.exchange ?? "";
                row.sentOrReceivedFrom = ( entry.route.from === "WALLET" ? "MY_WALLET" : entry.route.from );
                row.sentTo = ( entry.route.from === "WALLET" ? entry.route.from : "MY_WALLET" );
                break;
            case "DEPOSIT":
                row.sentOrReceivedFrom = "OTHER_WALLET";
                if ( typeof entry.origin === "boolean" ) row.sentTo = "MY_WALLET";
                else row.sentTo = entry.origin;
                break;
            case "WITHDRAW":
                if ( typeof entry.origin === "boolean" ) row.sentOrReceivedFrom = "MY_WALLET";
                else row.sentOrReceivedFrom = entry.origin;
                row.sentTo = "OTHER_WALLET";
                break;
            case "BUY" || "SELL":
                row.exchange = entry.origin;
                row.baseCurrency = entry.base.symbol;
                row.baseAmount = Math.abs(entry.base.delta);
                row.quoteCurrency = entry.quote.symbol;
                row.quoteAmount = Math.abs(entry.quote.delta);
                row.feeCurrency = entry.quote.symbol;
                row.fee = Math.abs(entry.quote.txFee);
                break;
            case "OTHER":
                row.type = "TRANSFER";
                row.sentOrReceivedFrom = "MY_WALLET";
                row.sentTo = "MY_WALLET";
                row.baseAmount = 0.000001;
        }

        let rowStr = "";
        for ( let [key, value] of Object.entries(row) ) rowStr += `${value},`;
        rowStr = rowStr.slice(0, -1) + "\n";
        multiStr += rowStr;
    }

    let bigStr = header + multiStr;

    fs.writeFile("output.csv", bigStr, function (err) {
        if (err) throw err;
    });
}

module.exports = { toCSV };
