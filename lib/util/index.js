exports.opt = require("handcount/opt");

exports.toCSV = require("./csv.js");

exports.DECI = exports.DECIMALS
             = require("./math.js").DECI;

exports.convert = require("./math.js").convert;

exports.data = {
    save: function (obj, dirFile, type = "json") {
        const fs = require("fs");
        const data = JSON.stringify(obj, null, 2);
        const path = require.resolve(`handcount/data/${dirFile}.json`);

        fs.writeFileSync(path, data);
        console.log("Object data exported to data/" + dirFile);
    }
};
