/**
 * test-client-imports.mjs
 * Tự động kiểm tra tính toàn vẹn của tất cả các file ES Modules phía Client:
 * Đảm bảo không có lỗi thiếu import (ReferenceError) hay cú pháp hỏng trước khi chạy game.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_JS_DIR = path.join(ROOT_DIR, "client", "js");

// Giả lập môi trường DOM tối thiểu cho Node.js để test import các file client
class MockElement {
  constructor(id = "") {
    this.id = id;
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false,
    };
    this.style = {};
    this.children = [];
    this.dataset = {};
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  remove() {}
  querySelector() {
    return new MockElement();
  }
  querySelectorAll() {
    return [];
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }
}

global.window = global;
global.document = {
  readyState: "loading",
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => new MockElement(id),
  querySelector: () => new MockElement(),
  querySelectorAll: () => [],
  createElement: (tag) => new MockElement(tag),
  body: new MockElement("body"),
};
global.localStorage = {
  _store: {},
  getItem: (key) => global.localStorage._store[key] || null,
  setItem: (key, val) => {
    global.localStorage._store[key] = String(val);
  },
  removeItem: (key) => {
    delete global.localStorage._store[key];
  },
  clear: () => {
    global.localStorage._store = {};
  },
};
global.AudioContext = class {
  createGain() {
    return { connect: () => {}, gain: { value: 1 } };
  }
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { setValueAtTime: () => {} },
    };
  }
};
global.webkitAudioContext = global.AudioContext;

console.log("=== BẮT ĐẦU QUÉT VÀ KIỂM TRA IMPORTS PHÍA CLIENT ===");

function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== "dev") {
        getAllJsFiles(fullPath, fileList);
      }
    } else if (file.endsWith(".js")) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

const clientFiles = getAllJsFiles(CLIENT_JS_DIR);
let passCount = 0;
let failCount = 0;

for (const filePath of clientFiles) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  const fileUrl = new URL(`file://${filePath}`).href;

  try {
    await import(fileUrl);
    console.log(`✅ [PASS] ${relPath}`);
    passCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${relPath}:`, err.message);
    failCount++;
  }
}

console.log("\n-------------------------------------------");
if (failCount > 0) {
  console.error(`💥 PHÁT HIỆN ${failCount} FILE BỊ LỖI RUNTIME / THIẾU IMPORT!`);
  process.exit(1);
} else {
  console.log(`🎉 TẤT CẢ ${passCount} FILE CLIENT ĐÃ VƯỢT QUA KIỂM TRA IMPORT AN TOÀN!`);
  process.exit(0);
}
