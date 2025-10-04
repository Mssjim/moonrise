export const PLANET_ROUTE = [
    { name: "Terra", distanceFromPrevious: 0 },
    { name: "Lua", distanceFromPrevious: 300 },
    { name: "Vênus", distanceFromPrevious: 1200 },
    { name: "Mercúrio", distanceFromPrevious: 1800 },
    { name: "Marte", distanceFromPrevious: 2700 },
    { name: "Júpiter", distanceFromPrevious: 6000 },
    { name: "Saturno", distanceFromPrevious: 9000 },
    { name: "Urano", distanceFromPrevious: 12000 },
    { name: "Netuno", distanceFromPrevious: 15000 },
    { name: "Plutão", distanceFromPrevious: 18000 },
    { name: "Sol", distanceFromPrevious: 30000 }
];

export const UPGRADE_VALUES = {
    coleta: [1, 1.5, 2.25, 3.5, 5.0, 7.5, 11.5, 17.0, 25.5, 38.5, 60.0],
    sonda: [0, 1, 2, 4, 8, 12, 18, 27, 40, 60, 100],
    motores: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0]
};

export const UPGRADE_COSTS = {
    coleta: {
        1: 20n, 2: 100n, 3: 500n, 4: 2500n, 5: 10000n,
        6: 50000n, 7: 200000n, 8: 800000n, 9: 3000000n, 10: 12000000n
    },
    sonda: {
        1: 50n, 2: 250n, 3: 1200n, 4: 6000n, 5: 20000n,
        6: 80000n, 7: 300000n, 8: 1200000n, 9: 4500000n, 10: 18000000n
    },
    motores: {
        1: 100n, 2: 500n, 3: 2500n, 4: 12000n, 5: 50000n,
        6: 200000n, 7: 800000n, 8: 3000000n, 9: 12000000n, 10: 50000000n
    }
};