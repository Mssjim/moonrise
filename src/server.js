import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import {
    handlePlayerClick,
    runGameTick,
    handleUpgrade,
    handleRebirth,
    handleSpendShard
} from './gameLogic.js';

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const onlinePlayers = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new Server(server, {
    cors: {
        origin: "*", // TODO Change domain
        methods: ["GET", "POST"]
    }
});

function formatGameStateForClient(player) {
    if (!player) return null;
    return {
        ...player,
        moonDust: player.moonDust.toString(),
    };
}

function removePlayerCredentials(player) {
    if (!player) return null;
    const { token, email, password, ...safeData } = player;
    return safeData;
}

app.get('/server', (req, res) => {
    res.send('<h1>Servidor on!</h1>');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.html'));
});

io.on('connection', (socket) => {
    console.log(`🔌 Novo jogador conectado: ${socket.id}`);

    socket.on('player:authenticate', async (token) => {
        try {
            if (!token) throw new Error("Token não fornecido.");
            const player = await prisma.player.findUnique({ where: { token } });
            if (!player) throw new Error("Autenticação falhou. Token inválido.");

            onlinePlayers.set(socket.id, player);
            console.log(`✅ Jogador ${player.nickname} autenticado com sucesso!`);
            socket.emit('player:authenticated', formatGameStateForClient(removePlayerCredentials(player)));
        } catch (error) {
            console.error(`[Auth Error] ${error.message}`);
            socket.emit('server:error', { message: error.message });
        }
    });

    socket.on('player:click', () => {
        try {
            const player = onlinePlayers.get(socket.id);
            if (!player) throw new Error("Jogador não autenticado.");
            const updatedPlayer = handlePlayerClick(player);
            onlinePlayers.set(socket.id, updatedPlayer);
            socket.emit('game:state', formatGameStateForClient(removePlayerCredentials(updatedPlayer)));
        } catch (error) {
            console.error(`[Click Error] ${error.message}`);
            socket.emit('server:error', { message: error.message });
        }
    });

    socket.on('player:buyUpgrade', async ({ type }) => {
        try {
            const player = onlinePlayers.get(socket.id);
            if (!player) throw new Error("Jogador não autenticado.");

            const updatedPlayer = handleUpgrade(player, type);
            onlinePlayers.set(socket.id, updatedPlayer);

            // SAVE
            await prisma.player.update({
                where: { id: player.id },
                data: {
                    moonDust: updatedPlayer.moonDust,
                    [`${type}Level`]: updatedPlayer[`${type}Level`]
                }
            });

            socket.emit('game:state', formatGameStateForClient(removePlayerCredentials(updatedPlayer)));
        } catch (error) {
            console.error(`[Upgrade Error] ${error.message}`);
            socket.emit('server:error', { message: error.message });
        }
    });

    socket.on('player:rebirth', async () => {
        try {
            const player = onlinePlayers.get(socket.id);
            if (!player) throw new Error("Jogador não autenticado.");

            const updatedPlayer = handleRebirth(player);
            onlinePlayers.set(socket.id, updatedPlayer);

            // SAVE
            const { id, ...playerData } = updatedPlayer;
            await prisma.player.update({ where: { id: id }, data: playerData });

            socket.emit('game:state', formatGameStateForClient(removePlayerCredentials(updatedPlayer)));
        } catch (error) {
            console.error(`[Rebirth Error] ${error.message}`);
            socket.emit('server:error', { message: error.message });
        }
    });

    socket.on('player:spendShard', async ({ type }) => {
        try {
            const player = onlinePlayers.get(socket.id);
            if (!player) throw new Error("Jogador não autenticado.");

            const updatedPlayer = handleSpendShard(player, type);
            onlinePlayers.set(socket.id, updatedPlayer);

            // SAVE
            const prestigeKey = `prestige${type.charAt(0).toUpperCase() + type.slice(1)}`;
            await prisma.player.update({
                where: { id: player.id },
                data: {
                    moonShards: updatedPlayer.moonShards,
                    [prestigeKey]: updatedPlayer[prestigeKey]
                }
            });

            socket.emit('game:state', formatGameStateForClient(removePlayerCredentials(updatedPlayer)));
        } catch (error) {
            console.error(`[Spend Shard Error] ${error.message}`);
            socket.emit('server:error', { message: error.message });
        }
    });


    socket.on('disconnect', async () => {
        const player = onlinePlayers.get(socket.id);
        if (player) {
            console.log(`👋 Jogador ${player.nickname} desconectou.`);
            try {
                const { id, ...playerData } = player;
                await prisma.player.update({
                    where: { id: id },
                    data: playerData
                });
            } catch (dbError) {
                // TODO Erro ao salvar progresso final
                console.error(`❌ Erro ao salvar progresso final de ${player.nickname}:`, dbError);
            } finally {
                onlinePlayers.delete(socket.id);
            }
        } else {
            console.log(`🔌 Jogador ${socket.id} desconectou sem se autenticar.`);
        }
    });
});

const TICK_RATE = 1000;
const AUTO_SAVE_TICKS = 15;
let tickCounter = 0;

setInterval(() => {
    tickCounter++;
    if (onlinePlayers.size === 0) return;

    const savePromises = [];
    for (const [socketId, player] of onlinePlayers.entries()) {
        const updatedPlayer = runGameTick(player);
        onlinePlayers.set(socketId, updatedPlayer);

        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
            playerSocket.emit('game:state', formatGameStateForClient(updatedPlayer));
        }

        if (tickCounter % AUTO_SAVE_TICKS === 0) {
            const { id, ...playerData } = updatedPlayer;
            const promise = prisma.player.update({
                where: { id: id },
                data: playerData
            });
            savePromises.push(promise);
        }
    }

    if (savePromises.length > 0) {
        console.log(`💾 Auto-save iniciado para ${savePromises.length} jogadores...`);
        Promise.all(savePromises)
            .then(() => console.log('💾 Auto-save concluído.'))
            .catch((error) => console.error('❌ Erro durante o auto-save:', error));
    }
}, TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor online na porta ${PORT}`);
});