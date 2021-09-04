
const hre = require("hardhat");

async function main() {

	const dei_contract_address = "0x84A57Ee5D76E0faBFfFa42599A4B324096a51440";
    const deus_contract_address = "0x33767b9bF00D2b6a1f21f47b4Ef8c3F6F1686346";

	// ReserveTracker
	const ReserveTrackerContract = await hre.ethers.getContractFactory("ReserveTracker");
	const ReserveTracker = await ReserveTrackerContract.deploy(dei_contract_address, deus_contract_address);

	await ReserveTracker.deployed();

	console.log("ReserveTracker deployed to:", ReserveTracker.address);
	
    
    const reserve_tracker_address = ReserveTracker.address;

    // PIDController
	const PIDControllerContract = await hre.ethers.getContractFactory("PIDController");
	const PIDController = await PIDControllerContract.deploy(dei_contract_address, deus_contract_address, reserve_tracker_address);

	await PIDController.deployed();

	console.log("PIDController deployed to:", PIDController.address);

	// Parameters
    const deus_dei_pair_address = "0x6c3de04c121D6754bbb963F183ab31734e6a0e9b";
	await ReserveTracker.addDEUSPair(deus_dei_pair_address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch(error => {
	console.error(error);
		process.exit(1);
	});
