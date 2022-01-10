const path = require('path');
const envPath = path.join(__dirname, './.env');
require('dotenv').config({ path: envPath });

async function sleep(miliseconds) {
    if (!process.env.LOCAL){
        new Promise((resolve) => setTimeout(resolve, miliseconds));
    }
}

function assert(condition, message) {
    if (!condition) {
        throw "\x1b[31m" + message + "\x1b[0m" || "Assertion failed";
    }
}

function printSuccess(message) {
    console.log("\x1b[32m" + message + "\x1b[0m");
}

function getRandomAddress() {
    return '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = {
    sleep,
    assert,
    getRandomAddress,
    printSuccess,
    ZERO_ADDRESS
}
