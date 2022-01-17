const hre = require("hardhat");

module.exports = async (address, count) => {
    console.log("skipping", count, "nounces");
    const signer = await hre.ethers.getSigner(address);
    for (let i = 0; i < count; i++) {
        let transactionHash = await signer.sendTransaction({
            to: "0x0000000000000000000000000000000000000000",
            value: 0,
        })
    }
}