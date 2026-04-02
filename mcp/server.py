#!/usr/bin/env python3
"""
Snake Game MCP Server - 实时数据监控
监控 FPS、蛇的位置、食物位置等游戏数据
"""

import json
import sys
import threading
import time
import os

# 游戏数据存储
class GameMonitor:
    def __init__(self):
        self.data = {
            "fps": 0,
            "frame_count": 0,
            "last_fps_update": time.time(),
            "snake1": [],
            "snake2": [],
            "food": None,
            "food2": None,
            "obstacles": [],
            "powerups": [],
            "score": 0,
            "score2": 0,
            "is_running": False,
            "is_paused": False,
            "is_game_over": False,
            "current_speed": 150,
            "mode": "classic",
            "shield_active": False,
            "shield_active2": False,
            "last_update": time.time()
        }
        self._lock = threading.Lock()

    def update(self, new_data):
        with self._lock:
            self.data.update(new_data)
            self.data["last_update"] = time.time()

    def get_all(self):
        with self._lock:
            return self.data.copy()

    def update_fps(self):
        with self._lock:
            self.data["frame_count"] += 1
            now = time.time()
            elapsed = now - self.data["last_fps_update"]
            if elapsed >= 1.0:
                self.data["fps"] = int(self.data["frame_count"] / elapsed)
                self.data["frame_count"] = 0
                self.data["last_fps_update"] = now

    def get_fps(self):
        return self.data.get("fps", 0)

    def get_snake_positions(self):
        return {
            "snake1": self.data.get("snake1", []),
            "snake2": self.data.get("snake2", [])
        }

    def get_food_position(self):
        return {
            "food": self.data.get("food"),
            "food2": self.data.get("food2")
        }

    def get_game_stats(self):
        return {
            "score": self.data.get("score", 0),
            "score2": self.data.get("score2", 0),
            "is_running": self.data.get("is_running", False),
            "is_paused": self.data.get("is_paused", False),
            "is_game_over": self.data.get("is_game_over", False),
            "current_speed": self.data.get("current_speed", 150),
            "mode": self.data.get("mode", "classic")
        }

monitor = GameMonitor()


# MCP 协议处理
def handle_request(request):
    method = request.get("method")
    params = request.get("params", {})
    id = request.get("id")

    result = None

    if method == "initialize":
        result = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "snake-game-monitor",
                "version": "1.0.0"
            }
        }
    elif method == "tools/list":
        result = {
            "tools": [
                {
                    "name": "get_fps",
                    "description": "获取当前游戏的 FPS",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "get_snake_positions",
                    "description": "获取两条蛇的实时位置坐标",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "get_food_position",
                    "description": "获取食物和特殊食物的位置",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "get_game_stats",
                    "description": "获取游戏统计信息（分数、状态、速度）",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "get_all_stats",
                    "description": "获取所有监控数据",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            ]
        }
    elif method == "tools/call":
        tool_name = params.get("name")
        if tool_name == "get_fps":
            monitor.update_fps()
            result = {"fps": monitor.get_fps()}
        elif tool_name == "get_snake_positions":
            result = monitor.get_snake_positions()
        elif tool_name == "get_food_position":
            result = monitor.get_food_position()
        elif tool_name == "get_game_stats":
            result = monitor.get_game_stats()
        elif tool_name == "get_all_stats":
            result = monitor.get_all()
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
    elif method == "shutdown":
        print(json.dumps({"jsonrpc": "2.0", "id": id, "result": {"message": "Server shutting down"}}), flush=True)
        sys.exit(0)

    return {
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    }

def main():
    """主循环 - 通过文件注入方式接收游戏数据"""
    # 尝试从环境变量读取数据文件路径
    data_file = os.environ.get("SNAKE_GAME_DATA_FILE")

    while True:
        line = sys.stdin.readline()
        if not line:
            break

        try:
            request = json.loads(line.strip())
        except json.JSONDecodeError:
            continue

        response = handle_request(request)
        print(json.dumps(response), flush=True)

if __name__ == "__main__":
    main()
