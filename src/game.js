// ==================== 游戏配置 ====================
const CONFIG = {
    gridSize: 20,
    cols: 30,
    rows: 30,
    baseSpeed: 150,
    foodColor: '#ff6b35',
    obstacleColor: '#7b2cbf',
    shieldColor: '#00f5d4',
    speedBoostColor: '#ff006e',
    slowDownColor: '#8338ec'
};

// ==================== 游戏状态 ====================
const game = {
    canvas: null,
    ctx: null,
    snake: [],
    snake2: [],
    direction: { x: 1, y: 0 },
    direction2: { x: -1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    nextDirection2: { x: -1, y: 0 },
    food: null,
    food2: null,
    obstacles: [],
    powerups: [],
    score: 0,
    score2: 0,
    highScore: 0,
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    gameLoop: null,
    currentSpeed: CONFIG.baseSpeed,
    shieldActive: false,
    shieldActive2: false,
    speedBoostActive: false,
    slowDownActive: false,
    shieldTimer: null,
    speedBoostTimer: null,
    slowDownTimer: null
};

// ==================== 音效系统 ====================
const audio = {
    ctx: null,

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    playTone(frequency, duration, type = 'sine') {
        if (!this.ctx) this.init();
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    },

    eat() {
        this.playTone(800, 0.1);
        setTimeout(() => this.playTone(1000, 0.1), 50);
    },

    die() {
        this.playTone(200, 0.3);
        setTimeout(() => this.playTone(150, 0.3), 100);
        setTimeout(() => this.playTone(100, 0.5), 200);
    },

    powerup() {
        this.playTone(600, 0.1);
        setTimeout(() => this.playTone(800, 0.1), 50);
        setTimeout(() => this.playTone(1000, 0.1), 100);
    },

    start() {
        this.playTone(400, 0.2);
    }
};

// ==================== 初始化 ====================
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');

    loadHighScore();
    setupEventListeners();
    drawGame();
}

// ==================== 加载最高分 ====================
function loadHighScore() {
    const saved = localStorage.getItem('neonSnakeHighScore');
    if (saved) {
        game.highScore = parseInt(saved);
        document.getElementById('highScore').textContent = game.highScore;
    }
}

// ==================== 保存最高分 ====================
function saveHighScore() {
    const maxScore = Math.max(game.score, game.score2);
    if (maxScore > game.highScore) {
        game.highScore = maxScore;
        localStorage.setItem('neonSnakeHighScore', game.highScore);
        document.getElementById('highScore').textContent = game.highScore;
    }
}

// ==================== 事件监听 ====================
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyDown);

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            game.mode = btn.dataset.mode;
            if (!game.isRunning) {
                initGame();
            }
        });
    });
}

// ==================== 键盘控制 ====================
function handleKeyDown(e) {
    if (game.isGameOver && e.code === 'Space') {
        startGame();
        return;
    }

    if (e.code === 'Escape') {
        togglePause();
        return;
    }

    if (!game.isRunning || game.isPaused) return;

    // 蛇1控制: WASD
    const keyMap1 = {
        'KeyW': { x: 0, y: -1 },
        'KeyS': { x: 0, y: 1 },
        'KeyA': { x: -1, y: 0 },
        'KeyD': { x: 1, y: 0 }
    };

    // 蛇2控制: 方向键
    const keyMap2 = {
        'ArrowUp': { x: 0, y: -1 },
        'ArrowDown': { x: 0, y: 1 },
        'ArrowLeft': { x: -1, y: 0 },
        'ArrowRight': { x: 1, y: 0 }
    };

    const newDir1 = keyMap1[e.code];
    const newDir2 = keyMap2[e.code];

    if (newDir1) {
        e.preventDefault();
        if (newDir1.x !== -game.direction.x || newDir1.y !== -game.direction.y) {
            game.nextDirection = newDir1;
        }
    } else if (newDir2) {
        e.preventDefault();
        if (newDir2.x !== -game.direction2.x || newDir2.y !== -game.direction2.y) {
            game.nextDirection2 = newDir2;
        }
    }
}

// ==================== 更新单条蛇 ====================
function updateSnake(snake, direction, nextDirection, score, shieldActive, food, otherSnake) {
    // 先更新方向
    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    let hitWall = head.x < 0 || head.x >= CONFIG.cols || head.y < 0 || head.y >= CONFIG.rows;
    let hitSelf = false;
    let hitOther = head.x === otherSnake[0].x && head.y === otherSnake[0].y;

    // 检查撞自己
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            hitSelf = true;
            break;
        }
    }

    // 检查撞障碍物
    let hitObstacle = false;
    for (const obs of game.obstacles) {
        if (head.x === obs.x && head.y === obs.y) {
            hitObstacle = true;
            break;
        }
    }

    if (hitWall || hitSelf || hitObstacle || hitOther) {
        if (shieldActive) {
            if (hitWall) {
                direction = { x: -direction.x, y: -direction.y };
                head.x = snake[0].x + direction.x;
                head.y = snake[0].y + direction.y;
            }
            shieldActive = false;
        } else {
            return { dead: true, newSnake: snake, newDirection: direction, newScore: score, newShield: shieldActive };
        }
    }

    const newSnake = [head, ...snake];

    // 检查吃食物
    let ateFood = false;
    let newScore = score;
    if (head.x === food.x && head.y === food.y) {
        newScore += 10;
        ateFood = true;
    } else {
        newSnake.pop();
    }

    return { dead: false, newSnake, newDirection: direction, newScore, newShield: shieldActive, ateFood };
}

// ==================== 初始化游戏 ====================
function initGame() {
    const centerX = Math.floor(CONFIG.cols / 2);
    const centerY = Math.floor(CONFIG.rows / 2);

    // 蛇1 - 左侧向右，蓝色
    game.snake = [
        { x: centerX - 3, y: centerY },
        { x: centerX - 4, y: centerY },
        { x: centerX - 5, y: centerY }
    ];
    game.direction = { x: 1, y: 0 };
    game.nextDirection = { x: 1, y: 0 };

    // 蛇2 - 右侧向左，红色
    game.snake2 = [
        { x: centerX + 3, y: centerY },
        { x: centerX + 4, y: centerY },
        { x: centerX + 5, y: centerY }
    ];
    game.direction2 = { x: -1, y: 0 };
    game.nextDirection2 = { x: -1, y: 0 };

    game.score = 0;
    game.score2 = 0;
    game.currentSpeed = CONFIG.baseSpeed;
    game.isGameOver = false;
    game.isPaused = false;

    clearTimers();
    game.shieldActive = false;
    game.shieldActive2 = false;
    game.speedBoostActive = false;
    game.slowDownActive = false;

    spawnFood();

    if (game.mode === 'adventure') {
        generateObstacles();
        spawnPowerup();
    } else {
        game.obstacles = [];
        game.powerups = [];
    }

    document.getElementById('score').textContent = '0';
    document.getElementById('score2').textContent = '0';
    document.getElementById('gameOverOverlay').classList.remove('active');

    drawGame();
}

// ==================== 清理定时器 ====================
function clearTimers() {
    if (game.shieldTimer) clearTimeout(game.shieldTimer);
    if (game.speedBoostTimer) clearTimeout(game.speedBoostTimer);
    if (game.slowDownTimer) clearTimeout(game.slowDownTimer);
}

// ==================== 开始游戏 ====================
function startGame() {
    if (game.isRunning && !game.isGameOver) return;

    audio.start();
    initGame();
    game.isRunning = true;
    gameLoop();
}

// ==================== 游戏循环 ====================
function gameLoop() {
    if (!game.isRunning || game.isPaused || game.isGameOver) return;

    update();
    drawGame();

    game.gameLoop = setTimeout(gameLoop, game.currentSpeed);
}

// ==================== 更新游戏状态 ====================
function update() {
    game.direction = { ...game.nextDirection };
    game.direction2 = { ...game.nextDirection2 };

    // 更新蛇1
    const result1 = updateSnake(game.snake, game.direction, game.nextDirection, game.score, game.shieldActive, game.food, game.snake2);
    game.snake = result1.newSnake;
    game.direction = result1.newDirection;
    game.score = result1.newScore;
    game.shieldActive = result1.newShield;

    if (result1.dead) {
        gameOver();
        return;
    }

    if (result1.ateFood) {
        document.getElementById('score').textContent = game.score;
        audio.eat();
        spawnFood();
    }

    // 更新蛇2
    const result2 = updateSnake(game.snake2, game.direction2, game.nextDirection2, game.score2, game.shieldActive2, game.food, game.snake);
    game.snake2 = result2.newSnake;
    game.direction2 = result2.newDirection;
    game.score2 = result2.newScore;
    game.shieldActive2 = result2.newShield;

    if (result2.dead) {
        gameOver();
        return;
    }

    if (result2.ateFood) {
        document.getElementById('score2').textContent = game.score2;
        audio.eat();
        spawnFood();
    }
}

// ==================== 生成食物 ====================
function spawnFood() {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * CONFIG.cols),
            y: Math.floor(Math.random() * CONFIG.rows)
        };
    } while (isPositionOccupied(food.x, food.y, 0));

    game.food = food;
}

// ==================== 生成障碍物 ====================
function generateObstacles() {
    game.obstacles = [];
    const count = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
        let obs;
        do {
            obs = {
                x: Math.floor(Math.random() * CONFIG.cols),
                y: Math.floor(Math.random() * CONFIG.rows)
            };
        } while (isPositionOccupied(obs.x, obs.y, 5));

        game.obstacles.push(obs);
    }
}

// ==================== 生成道具 ====================
function spawnPowerup() {
    if (game.mode !== 'adventure' || game.powerups.length >= 2) return;

    const types = ['shield', 'speed', 'slow'];
    const type = types[Math.floor(Math.random() * types.length)];

    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * CONFIG.cols),
            y: Math.floor(Math.random() * CONFIG.rows)
        };
    } while (isPositionOccupied(pos.x, pos.y, 0));

    game.powerups.push({ x: pos.x, y: pos.y, type: type });
}

// ==================== 检查位置是否被占用 ====================
function isPositionOccupied(x, y, safeZone) {
    for (const seg of game.snake) {
        if (Math.abs(seg.x - x) <= safeZone && Math.abs(seg.y - y) <= safeZone) return true;
    }
    for (const seg of game.snake2) {
        if (Math.abs(seg.x - x) <= safeZone && Math.abs(seg.y - y) <= safeZone) return true;
    }
    if (game.food && game.food.x === x && game.food.y === y) return true;
    for (const obs of game.obstacles) {
        if (obs.x === x && obs.y === y) return true;
    }
    return false;
}

// ==================== 绘制游戏 ====================
function drawGame() {
    const ctx = game.ctx;
    const gs = CONFIG.gridSize;

    // 清空画布
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    // 绘制网格
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CONFIG.cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gs, 0);
        ctx.lineTo(i * gs, game.canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= CONFIG.rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gs);
        ctx.lineTo(game.canvas.width, i * gs);
        ctx.stroke();
    }

    // 绘制障碍物
    ctx.fillStyle = CONFIG.obstacleColor;
    for (const obs of game.obstacles) {
        drawCell(obs.x, obs.y, 0.9);
    }

    // 绘制食物
    if (game.food) {
        ctx.fillStyle = CONFIG.foodColor;
        drawCell(game.food.x, game.food.y, 0.8, true);
    }

    // 绘制道具
    for (const p of game.powerups) {
        const color = p.type === 'shield' ? CONFIG.shieldColor :
                      p.type === 'speed' ? CONFIG.speedBoostColor :
                      CONFIG.slowDownColor;
        ctx.fillStyle = color;
        drawCell(p.x, p.y, 0.7, true);
    }

    // 绘制蛇1 (蓝色)
    for (let i = 0; i < game.snake.length; i++) {
        const seg = game.snake[i];
        const ratio = i / game.snake.length;

        if (i === 0) {
            ctx.fillStyle = '#00d9ff';
        } else {
            const r = Math.floor(0 + ratio * 0);
            const g = Math.floor(153 + ratio * 50);
            const b = Math.floor(204 - ratio * 100);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        }

        const size = i === 0 ? 0.9 : 0.85;
        drawCell(seg.x, seg.y, size);
    }

    // 绘制蛇2 (红色)
    for (let i = 0; i < game.snake2.length; i++) {
        const seg = game.snake2[i];
        const ratio = i / game.snake2.length;

        if (i === 0) {
            ctx.fillStyle = '#ff6b6b';
        } else {
            const r = Math.floor(255 - ratio * 50);
            const g = Math.floor(107 - ratio * 50);
            const b = Math.floor(107 - ratio * 50);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        }

        const size = i === 0 ? 0.9 : 0.85;
        drawCell(seg.x, seg.y, size);
    }

    // 绘制护盾效果 - 蛇1
    if (game.shieldActive && game.snake.length > 0) {
        const head = game.snake[0];
        ctx.strokeStyle = CONFIG.shieldColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = CONFIG.shieldColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(head.x * gs + gs / 2, head.y * gs + gs / 2, gs * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 绘制护盾效果 - 蛇2
    if (game.shieldActive2 && game.snake2.length > 0) {
        const head = game.snake2[0];
        ctx.strokeStyle = CONFIG.shieldColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = CONFIG.shieldColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(head.x * gs + gs / 2, head.y * gs + gs / 2, gs * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// ==================== 绘制单元格 ====================
function drawCell(x, y, size, pulse = false) {
    const gs = CONFIG.gridSize;
    const offset = (gs - gs * size) / 2;

    if (pulse) {
        const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
        const centerX = x * gs + gs / 2;
        const centerY = y * gs + gs / 2;
        const radius = (gs * size / 2) * scale;

        game.ctx.beginPath();
        game.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        game.ctx.fill();
    } else {
        game.ctx.fillRect(x * gs + offset, y * gs + offset, gs * size, gs * size);
    }
}

// ==================== 暂停/继续 ====================
function togglePause() {
    if (!game.isRunning || game.isGameOver) return;

    game.isPaused = !game.isPaused;
    document.getElementById('pauseOverlay').classList.toggle('active', game.isPaused);

    if (!game.isPaused) {
        gameLoop();
    }
}

function resumeGame() {
    game.isPaused = false;
    document.getElementById('pauseOverlay').classList.remove('active');
    gameLoop();
}

// ==================== 游戏结束 ====================
function gameOver() {
    game.isRunning = false;
    game.isGameOver = true;
    audio.die();
    saveHighScore();

    const winner = game.score > game.score2 ? '蛇1' : (game.score2 > game.score ? '蛇2' : '平局');
    const winnerText = game.score === game.score2 ? '平局!' : (winner === '蛇1' ? '蓝蛇获胜!' : '红蛇获胜!');

    document.getElementById('finalScore').textContent = `${game.score} vs ${game.score2}`;
    document.getElementById('winnerText').textContent = winnerText;
    document.getElementById('gameOverOverlay').classList.add('active');
}

// ==================== 启动 ====================
window.onload = init;