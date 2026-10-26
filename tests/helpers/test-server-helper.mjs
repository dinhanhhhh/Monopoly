import http from "node:http";
import WebSocket from "ws";
import { startServer } from "../../server/server.mjs";

/**
 * Gửi HTTP GET request với agent: false để đóng socket ngay sau khi xong,
 * tránh giữ persistent keep-alive socket trong global fetch pool.
 */
export function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { agent: false }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          json: () => JSON.parse(data),
          text: () => data,
        });
      });
    }).on("error", reject);
  });
}

/**
 * Khởi tạo server kiểm thử độc lập trên cổng 0 (cổng động của hệ điều hành).
 * Tránh đụng độ cổng 3000 và cho phép chạy nhiều test song song.
 */
export async function createTestServer(options = {}) {
  const instance = await startServer(0, options);
  const wsUrl = `ws://127.0.0.1:${instance.port}`;
  const httpUrl = `http://127.0.0.1:${instance.port}`;

  return {
    ...instance,
    wsUrl,
    httpUrl,
  };
}

/**
 * Kết nối một WebSocket Client tới server và chờ sự kiện 'open'.
 */
export function connectClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const onOpen = () => {
      cleanup();
      resolve(ws);
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    function cleanup() {
      ws.off("open", onOpen);
      ws.off("error", onError);
    }
    ws.on("open", onOpen);
    ws.on("error", onError);
  });
}

/**
 * Đóng và hủy triệt để socket client để không giữ active handle trong Node.js
 */
export function destroyClient(ws) {
  if (!ws) return;
  try {
    ws.terminate();
    if (ws._socket) {
      ws._socket.destroy();
    }
  } catch (_) {}
}

/**
 * Chờ một tin nhắn WebSocket thỏa mãn hàm predicate(msg).
 * Tự động hủy listener khi nhận được hoặc khi timeout.
 */
export function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    let timer = null;

    const onMessage = (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (predicate(msg)) {
          cleanup();
          resolve(msg);
        }
      } catch (_) {}
    };

    const onClose = () => {
      cleanup();
      reject(new Error("WebSocket đã đóng trước khi nhận được tin nhắn mong muốn"));
    };

    function cleanup() {
      if (timer) clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("close", onClose);
    }

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout (${timeoutMs}ms) chờ tin nhắn WebSocket thỏa mãn điều kiện`));
    }, timeoutMs);

    ws.on("message", onMessage);
    ws.on("close", onClose);
  });
}

/**
 * Gửi tin nhắn và chờ tin nhắn phản hồi phù hợp.
 */
export function sendAndWait(ws, sendData, predicate, timeoutMs = 4000) {
  const waitPromise = waitForMessage(ws, predicate, timeoutMs);
  ws.send(JSON.stringify(sendData));
  return waitPromise;
}
