#!/usr/bin/env node
/**
 * Snake Game MCP Server - 实时数据监控
 * 监控 FPS、蛇的位置、食物位置等游戏数据
 */

const WebSocket = require('ws');

const PORT = 8765;

// 游戏数据存储
const gameData = {
    fps: 0,
    frame_count: 0,
    last_fps_update: Date.now(),
    snake1: [],
    snake2: [],
    food: null,
    food2: null,
    obstacles: [],
    powerups: [],
    score: 0,
    score2: 0,
    is_running: false,
    is_paused: false,
    is_game_over: false,
    current_speed: 150,
    mode: 'classic',
    shield_active: false,
    shield_active2: false,
    last_update: Date.now()
};

// MCP 协议工具列表
const tools = [
    {
        name: 'get_fps',
        description: '获取当前游戏的 FPS',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_snake_positions',
        description: '获取两条蛇的实时位置坐标',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_food_position',
        description: '获取食物和特殊食物的位置',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_game_stats',
        description: '获取游戏统计信息（分数、状态、速度）',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_all_stats',
        description: '获取所有监控数据',
        inputSchema: { type: 'object', properties: {}, required: [] }
    }
];

// 处理 MCP 请求
function handleRequest(request) {
    const { id, method, params } = request;
    let result = null;

    switch (method) {
        case 'initialize':
            result = {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'snake-game-monitor', version: '1.0.0' }
            };
            break;

        case 'tools/list':
            result = { tools };
            break;

        case 'tools/call':
            const { name, arguments: args = {} } = params;
            switch (name) {
                case 'get_fps':
                    result = { fps: gameData.fps };
                    break;
                case 'get_snake_positions':
                    result = { snake1: gameData.snake1, snake2: gameData.snake2 };
                    break;
                case 'get_food_position':
                    result = { food: gameData.food, food2: gameData.food2 };
                    break;
                case 'get_game_stats':
                    result = {
                        score: gameData.score,
                        score2: gameData.score2,
                        is_running: gameData.is_running,
                        is_paused: gameData.is_paused,
                        is_game_over: gameData.is_game_over,
                        current_speed: gameData.current_speed,
                        mode: gameData.mode
                    };
                    break;
                case 'get_all_stats':
                    result = { ...gameData };
                    break;
                default:
                    result = { error: `Unknown tool: ${name}` };
            }
            break;

        case 'shutdown':
            console.log('[MCP Server] Shutdown requested');
            process.exit(0);
    }

    return { jsonrpc: '2.0', id, result };
}

// 更新 FPS
function updateFps() {
    gameData.frame_count++;
    const now = Date.now();
    const elapsed = now - gameData.last_fps_update;
    if (elapsed >= 1000) {
        gameData.fps = Math.round(gameData.frame_count * 1000 / elapsed);
        gameData.frame_count = 0;
        gameData.last_fps_update = now;
    }
}

// WebSocket 服务器
const wss = new WebSocket.Server({ port: PORT });

console.log(`[MCP Server] Snake Game Monitor started on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('[MCP Server] Client connected');

    ws.on('message', (data) => {
        try {
            const request = JSON.parse(data);

            // 处理游戏数据上报
            if (request.type === 'game_update') {
                Object.assign(gameData, request);
                delete gameData.type;
                delete gameData.timestamp;
                updateFps();
                return;
            }

            // 处理 MCP 请求
            const response = handleRequest(request);
            ws.send(JSON.stringify(response));
        } catch (e) {
            console.error('[MCP Server] Error:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('[MCP Server] Client disconnected');
    });
});

// 定期广播数据给所有客户端
setInterval(() => {
    if (wss.clients.size > 0) {
        updateFps();
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'monitoring',
                    data: { ...gameData }
                }));
            }
        });
    }
}, 100);
