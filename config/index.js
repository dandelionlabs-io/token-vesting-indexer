// pools organized by
// -- key: name
// -- value: 0: address 1: duration

const pools = new Map();

pools.set("SeedPhase",   ["0xd969B94F2e07cD9dCd8378493BE835BB25C1A6E1", 604800]);
pools.set("PrivateSale", ["0x23e0De6be13ce4d1a57fE1faCB2F42Bd4702468a", 1209600]);
pools.set("PublicSale",  ["0x00658Ad8Bad1B93D2767CE88928AA39b13FD1a17", 2419200]);

module.exports = { pools };
