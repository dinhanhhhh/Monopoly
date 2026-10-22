import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { GameRoom } from "./room.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const PORT = process.env.PORT || 3000;

// MIME types tra cứu cho Static File Server
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

// Quản lý các phòng chơi đang hoạt động
const rooms = new Map(); // roomId -> GameRoom

function getOrCreateRoom(roomId, options = {}) {
  if (!rooms.has(roomId)) {
    const room = new GameRoom(roomId, options);
    rooms.set(roomId, room);
  }
  return rooms.get(roomId);
}

// 1. Tạo HTTP Server phục vụ static files & API
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // Health check
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", activeRooms: rooms.size }));
    return;
  }

  // Danh sách phòng công khai
  if (pathname === "/api/rooms") {
    const publicList = Array.from(rooms.values()).map((r) => r.getPublicRoomInfo());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ rooms: publicList }));
    return;
  }

  // Phục vụ Static Files
  let filePath = path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname);

  // Chống Directory Traversal & Chặn các tệp nhạy cảm
  const normalizedPath = path.normalize(pathname).replace(/\\/g, "/");
  const isBlocked =
    !filePath.startsWith(ROOT_DIR) ||
    normalizedPath.startsWith("/.git") ||
    normalizedPath.startsWith("/server") ||
    normalizedPath.startsWith("/tests") ||
    normalizedPath.startsWith("/node_modules") ||
    normalizedPath.endsWith("package.json") ||
    normalizedPath.endsWith("package-lock.json") ||
    normalizedPath.endsWith(".env") ||
    normalizedPath.endsWith(".config.js") ||
    normalizedPath.endsWith(".config.mjs");

  if (isBlocked) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden: Truy cập tệp nhạy cảm bị từ chối");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": "no-cache",
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// 2. Tạo WebSocket Server với giới hạn kích thước payload (max 64KB)
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

// Heartbeat ping/pong để kiểm tra trạng thái sống của kết nối
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

wss.on("connection", (ws, req) => {
  let currentRoomId = null;
  let currentPlayerId = null;

  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  const send = (msg) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const type = data.type;

      switch (type) {
        case "PING": {
          send({ type: "PONG", timestamp: Date.now() });
          break;
        }

        case "LIST_ROOMS": {
          const list = Array.from(rooms.values()).map((r) => r.getPublicRoomInfo());
          send({ type: "ROOM_LIST", rooms: list });
          break;
        }

        case "JOIN_ROOM": {
          const roomId = (data.roomId || "default-room").trim().toLowerCase();
          const room = getOrCreateRoom(roomId, data.options || {});

          const result = room.join(ws, {
            playerName: data.playerName,
            token: data.token,
            reconnectToken: data.reconnectToken,
          });

          if (result.success) {
            currentRoomId = roomId;
            currentPlayerId = result.playerId;

            if (result.isReconnect && room.cleanupTimer) {
              clearTimeout(room.cleanupTimer);
              room.cleanupTimer = null;
            }

            send({
              type: "JOINED_SUCCESS",
              roomId,
              playerId: result.playerId,
              reconnectToken: result.reconnectToken,
              isReconnect: !!result.isReconnect,
              room: result.room,
              gameState: result.gameState,
            });
          } else {
            send({ type: "ERROR", message: result.error });
          }
          break;
        }

        case "SET_READY": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (room) {
            room.setReady(currentPlayerId, !!data.isReady);
          }
          break;
        }

        case "ADD_BOT": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (room && room.hostId === currentPlayerId) {
            room.addBot(data.personality || "balanced");
          }
          break;
        }

        case "REMOVE_BOT": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (room && room.hostId === currentPlayerId) {
            room.removeBot(data.botId);
          }
          break;
        }

        case "START_GAME": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const result = room.startGame(currentPlayerId);
          if (!result.success) {
            send({ type: "ERROR", message: result.error });
          }
          break;
        }

        case "GAME_ACTION": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const action = data.action;
          if (!action || !action.type) {
            send({ type: "ERROR", message: "Action không hợp lệ" });
            return;
          }

          const result = room.handleAction(currentPlayerId, action);
          if (!result.success) {
            send({ type: "ACTION_FAILED", action, error: result.error });
          } else if (room.status === "FINISHED") {
            // Lên lịch dọn dẹp phòng sau 60s để người chơi kịp xem bảng tổng kết
            setTimeout(() => {
              if (rooms.get(currentRoomId) === room && room.status === "FINISHED") {
                room.clearTimers();
                rooms.delete(currentRoomId);
              }
            }, 60000);
          }
          break;
        }

        case "CHAT_MESSAGE": {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const client = room.clients.get(currentPlayerId);
          const name = client ? client.info.name : currentPlayerId;

          room.broadcast({
            type: "CHAT_MESSAGE",
            senderId: currentPlayerId,
            senderName: name,
            message: String(data.message || "").substring(0, 200),
            timestamp: Date.now(),
          });
          break;
        }

        default:
          send({ type: "ERROR", message: `Loại lệnh '${type}' không được hỗ trợ` });
      }
    } catch (err) {
      console.error("Lỗi xử lý message WebSocket:", err);
      send({ type: "ERROR", message: "Dữ liệu JSON không hợp lệ" });
    }
  });

  ws.on("close", () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.leave(currentPlayerId);

        // Kiểm tra xem phòng có nên dọn dẹp không:
        // 1. Trạng thái LOBBY và không còn ai
        // 2. Trạng thái FINISHED
        // 3. Trong trận đấu nhưng không còn bất kỳ người chơi người thật nào đang kết nối
        const hasConnectedHuman = Array.from(room.clients.values()).some(
          (c) => !c.info.isBot && c.connected,
        );

        if (
          (room.status === "LOBBY" && room.clients.size === 0) ||
          room.status === "FINISHED"
        ) {
          room.clearTimers();
          rooms.delete(currentRoomId);
        } else if (!hasConnectedHuman && room.status === "PLAYING") {
          // Grace Period: Chờ 45 giây để người chơi F5 / rớt mạng có thể tái kết nối (Reconnect)
          if (!room.cleanupTimer) {
            room.cleanupTimer = setTimeout(() => {
              const stillNoHuman = !Array.from(room.clients.values()).some(
                (c) => !c.info.isBot && c.connected,
              );
              if (stillNoHuman && rooms.get(currentRoomId) === room) {
                room.clearTimers();
                rooms.delete(currentRoomId);
              }
            }, 45000);
          }
        }
      }
    }
  });

  ws.on("error", (err) => {
    console.error(`Lỗi WebSocket kết nối:`, err.message);
  });
});

// Khởi chạy server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  🎲 MONOPOLY SÀI GÒN - WEBSOCKET SERVER ONLINE`);
  console.log(`  🌐 Web Game:  http://localhost:${PORT}`);
  console.log(`  🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`  🩺 Health:    http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});

// Dọn dẹp an toàn khi tắt tiến trình
process.on("SIGINT", () => {
  console.log("\nĐang đóng server...");
  server.close(() => {
    process.exit(0);
  });
});
