/**
 * NetworkClient.js - Quản lý kết nối WebSocket cho chế độ Chơi Online
 */

export class NetworkClient {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.playerId = null;
    this.reconnectToken = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.handlers = new Map(); // eventType -> Set of callbacks

    // Khôi phục token nếu có
    try {
      this.reconnectToken = sessionStorage.getItem("monopoly_reconnect_token");
      this.roomId = sessionStorage.getItem("monopoly_room_id");
      this.playerId = sessionStorage.getItem("monopoly_player_id");
    } catch (e) {
      // Ignore storage errors
    }
  }

  on(event, callback) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.handlers.has(event)) {
      this.handlers.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.handlers.has(event)) {
      for (const cb of this.handlers.get(event)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`Lỗi trong handler event '${event}':`, e);
        }
      }
    }
  }

  connect(url = null) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    const wsUrl = url || `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.isReconnecting = false;
          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error("Lỗi parse message WebSocket:", e);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit("disconnected");
        };

        this.ws.onerror = (err) => {
          console.error("Lỗi WebSocket:", err);
          this.emit("error", err);
          reject(err);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  handleMessage(msg) {
    const type = msg.type;

    switch (type) {
      case "PONG":
        break;

      case "JOINED_SUCCESS": {
        this.roomId = msg.roomId;
        this.playerId = msg.playerId;
        this.reconnectToken = msg.reconnectToken;

        try {
          sessionStorage.setItem("monopoly_room_id", this.roomId);
          sessionStorage.setItem("monopoly_player_id", this.playerId);
          if (this.reconnectToken) {
            sessionStorage.setItem("monopoly_reconnect_token", this.reconnectToken);
          }
        } catch (e) {}

        this.emit("joined", msg);
        break;
      }

      case "ROOM_STATE":
        this.emit("roomState", msg.room);
        break;

      case "ROOM_LIST":
        this.emit("roomList", msg.rooms);
        break;

      case "GAME_STARTED":
        this.emit("gameStarted", msg);
        break;

      case "ACTION_RESULT":
        this.emit("actionResult", msg);
        break;

      case "ACTION_FAILED":
        this.emit("actionFailed", msg);
        break;

      case "GAME_OVER":
        this.emit("gameOver", msg);
        break;

      case "CHAT_MESSAGE":
        this.emit("chat", msg);
        break;

      case "ERROR":
        this.emit("error", msg.message);
        break;

      default:
        this.emit(type, msg);
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  joinRoom(roomId, playerName, token) {
    return this.send({
      type: "JOIN_ROOM",
      roomId,
      playerName,
      token,
      reconnectToken: this.reconnectToken,
    });
  }

  setReady(isReady) {
    return this.send({ type: "SET_READY", isReady: !!isReady });
  }

  addBot(personality = "balanced") {
    return this.send({ type: "ADD_BOT", personality });
  }

  removeBot(botId) {
    return this.send({ type: "REMOVE_BOT", botId });
  }

  startGame() {
    return this.send({ type: "START_GAME" });
  }

  sendAction(action) {
    return this.send({ type: "GAME_ACTION", action });
  }

  sendChat(message) {
    return this.send({ type: "CHAT_MESSAGE", message });
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}
