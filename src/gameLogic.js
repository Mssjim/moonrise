import { PLANET_ROUTE, UPGRADE_VALUES, UPGRADE_COSTS } from './gameData.js';

/**
 * Calcula os valores atuais de poder de clique, renda passiva e velocidade com base nos níveis e bônus.
 * @param {object} player - O objeto do jogador vindo do Prisma.
 * @returns {{clickPower: number, passiveIncome: number, speed: number}}
 */
export function calculateCurrentValues(player) {
    const clickPower = UPGRADE_VALUES.coleta[player.coletaLevel] * player.prestigeColeta;
    const passiveIncome = UPGRADE_VALUES.sonda[player.sondaLevel] * player.prestigeSonda;
    const speed = UPGRADE_VALUES.motores[player.motoresLevel] * player.prestigeMotores;
    
    return { clickPower, passiveIncome, speed };
}

/**
 * Processa um clique do jogador, acumulando frações de Moon Dust.
 * @param {object} player - O objeto do jogador.
 * @returns {object} - O objeto do jogador atualizado.
 */
export function handlePlayerClick(player) {
    const { clickPower } = calculateCurrentValues(player);

    const totalPotentialDust = clickPower + player.fractionalMoonDust;
    const dustToAdd = Math.floor(totalPotentialDust);
    const newFraction = totalPotentialDust - dustToAdd;
    
    player.moonDust += BigInt(dustToAdd);
    player.fractionalMoonDust = parseFloat(newFraction.toFixed(2));
    
    return player;
}

/**
 * Roda um "tick" do jogo, calculando ganhos passivos com acúmulo de frações e progresso de viagem.
 * @param {object} player - O objeto do jogador.
 * @returns {object} - O objeto do jogador atualizado.
 */
export function runGameTick(player) {
    const { passiveIncome, speed } = calculateCurrentValues(player);

    const totalPotentialDust = passiveIncome + player.fractionalMoonDust;
    const dustToAdd = Math.floor(totalPotentialDust);
    player.moonDust += BigInt(dustToAdd);
    player.fractionalMoonDust = parseFloat((totalPotentialDust - dustToAdd).toFixed(2));

    if (player.currentPlanetIndex < PLANET_ROUTE.length - 1) {
        const currentLeg = PLANET_ROUTE[player.currentPlanetIndex + 1];
        const distanceOfLeg = currentLeg.distanceFromPrevious;
        
        const progressThisTick = speed / distanceOfLeg;
        player.progressToNextPlanet += progressThisTick;

        if (player.progressToNextPlanet >= 1.0) {
            player.currentPlanetIndex++;
            player.progressToNextPlanet = 0;
        }
    }
    
    return player;
}

/**
 * Processa a compra de um upgrade pelo jogador.
 * @param {object} player - O objeto do jogador.
 * @param {'coleta' | 'sonda' | 'motores'} upgradeType - O tipo de upgrade a ser comprado.
 * @returns {object} - O objeto do jogador atualizado.
 */
export function handleUpgrade(player, upgradeType) {
    const levelKey = `${upgradeType}Level`;
    const currentLevel = player[levelKey];

    if (currentLevel >= 10) {
        throw new Error("Nível máximo já alcançado.");
    }

    const nextLevel = currentLevel + 1;
    const cost = UPGRADE_COSTS[upgradeType][nextLevel];

    if (player.moonDust < cost) {
        throw new Error("Moon Dust insuficiente.");
    }

    player.moonDust -= cost;
    player[levelKey] = nextLevel;

    return player;
}

/**
 * Processa o Rebirth (Warp) do jogador.
 * @param {object} player - O objeto do jogador.
 * @returns {object} - O objeto do jogador atualizado após o rebirth.
 */
export function handleRebirth(player) {
    if (player.currentPlanetIndex < PLANET_ROUTE.length - 1) {
        throw new Error("Você precisa chegar ao Sol para fazer o Rebirth.");
    }

    const shardsEarned = 1; 

    player.moonDust = 0n;
    player.fractionalMoonDust = 0.0;
    player.coletaLevel = 0;
    player.sondaLevel = 0;
    player.motoresLevel = 0;
    player.currentPlanetIndex = 0;
    player.progressToNextPlanet = 0.0;

    player.moonShards += shardsEarned;

    return player;
}

/**
 * Processa o gasto de Moon Shards em bônus permanentes.
 * @param {object} player - O objeto do jogador.
 * @param {'coleta' | 'sonda' | 'motores'} bonusType - O tipo de bônus a ser comprado.
 * @returns {object} - O objeto do jogador atualizado.
 */
export function handleSpendShard(player, bonusType) {
    if (player.moonShards <= 0)
        throw new Error("Moon Shards insuficientes.");

    const prestigeKey = `prestige${bonusType.charAt(0).toUpperCase() + bonusType.slice(1)}`;
    
    player.moonShards -= 1;
    player[prestigeKey] += 0.1;
    
    player[prestigeKey] = parseFloat(player[prestigeKey].toFixed(2));

    return player;
}