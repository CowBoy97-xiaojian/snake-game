# Neon Snake - 霓虹贪吃蛇

一个精美的霓虹风格贪吃蛇游戏，使用纯 JavaScript 和 Canvas 开发。

## 游戏特性

- **霓虹视觉效果** - 炫酷的霓虹灯光效果和粒子动画
- **流畅操控** - 支持方向键和 WASD 两种控制方式
- **障碍物系统** - 随分数增加出现障碍物，增加游戏难度
- **即时暂停** - 按 ESC 暂停/继续游戏
- **分数排行** - 本地存储最高分记录

## 操作说明

| 按键 | 功能 |
|------|------|
| 方向键 / WASD | 控制蛇的移动方向 |
| ESC | 暂停/继续游戏 |
| 空格 | 重新开始游戏 |

## 游戏规则

- 使用方向键或 WASD 控制蛇的移动方向
- 吃到食物得分，蛇身变长
- 躲避障碍物，避免撞墙或撞自己
- 撞墙或撞自己则游戏结束

## 技术栈

- HTML5 Canvas
- 原生 JavaScript
- CSS3 动画

## 运行方式

直接在浏览器中打开 `index.html` 即可开始游戏。

## MCP 实时监控

游戏内置 MCP (Model Context Protocol) 服务器，支持实时监控游戏数据。

### 启动监控服务器

```bash
cd mcp
npm install
npm start
```

服务器将在 `ws://localhost:8765` 启动。

### 可监控的数据

| 工具 | 说明 |
|------|------|
| `get_fps` | 当前游戏的 FPS |
| `get_snake_positions` | 两条蛇的实时位置坐标 |
| `get_food_position` | 食物和特殊食物的位置 |
| `get_game_stats` | 游戏统计（分数、状态、速度） |
| `get_all_stats` | 所有监控数据 |

### WebSocket 消息格式

游戏会自动通过 WebSocket 上报数据：

```json
{
  "type": "game_update",
  "fps": 60,
  "snake1": [{"x": 10, "y": 15}, {"x": 11, "y": 15}],
  "snake2": [{"x": 20, "y": 15}, {"x": 19, "y": 15}],
  "food": {"x": 15, "y": 15},
  "score": 50,
  "is_running": true,
  "is_paused": false
}
```

---

*Made with ❤️ by Claude Code*
