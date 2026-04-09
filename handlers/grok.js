// handlers/groq.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "futababotrios";
const MAX_TIMEOUT = 60000;
const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 1200;

const DATA_DIR = path.join(__dirname, "..", "data");
const STATE_FILE = path.join(DATA_DIR, "groq_auto.json");

function ensureDataDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function loadState() {
  ensureDataDir();
  try {
    if (!fs.existsSync(STATE_FILE)) return { chats: {} };
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const j = JSON.parse(raw || "{}");
    if (!j || typeof j !== "object") return { chats: {} };
    if (!j.chats || typeof j.chats !== "object") j.chats = {};
    return j;
  } catch {
    return { chats: {} };
  }
}

function saveState(state) {
  ensureDataDir();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

function isExpired(chatState) {
  return !chatState || !chatState.until || Date.now() > Number(chatState.until);
}

function cleanExpired(state) {
  const now = Date.now();
  let changed = false;
  for (const [jid, st] of Object.entries(state.chats || {})) {
    if (!st || !st.until || now > Number(st.until)) {
      delete state.chats[jid];
      changed = true;
    }
  }
  if (changed) saveState(state);
}

function pickTextFromApi(data) {
  const txt = data?.result?.result;
  return (typeof txt === "string" ? txt : "").trim();
}

async function askGroq(prompt) {
  const { data, status: http } = await axios.post(
    `${API_BASE}/ai`,
    { prompt },
    {
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
      },
      timeout: MAX_TIMEOUT,
      validateStatus: (s) => s >= 200 && s < 600,
    }
  );

  if (http !== 200) throw new Error(`HTTP ${http}${data?.message ? ` - ${data.message}` : ""}`);
  if (!data || data.status !== true) throw new Error(data?.message || "La API no respondió correctamente.");

  const text = pickTextFromApi(data);
  if (!text) throw new Error("La API respondió pero no trajo texto.");

  return text;
}

function getText(m) {
  return (
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption ||
    ""
  ).trim();
}

function isGroupJid(jid = "") {
  return typeof jid === "string" && jid.endsWith("@g.us");
}

function chunkText(s, n = 3500) {
  const out = [];
  const str = String(s || "");
  for (let i = 0; i < str.length; i += n) out.push(str.slice(i, i + n));
  return out;
}

function ensureGroqAutoListener(sock) {
  if (sock._groqAutoListener) return;
  sock._groqAutoListener = true;

  sock.ev.on("messages.upsert", async (ev) => {
    try {
      const state = loadState();
      cleanExpired(state);

      for (const m of ev.messages || []) {
        try {
          const chatId = m?.key?.remoteJid;
          if (!chatId) continue;
          if (!isGroupJid(chatId)) continue;
          if (m?.key?.fromMe) continue;

          const st = state.chats?.[chatId];
          if (!st || isExpired(st)) {
            if (st) {
              delete state.chats[chatId];
              saveState(state);
            }
            continue;
          }

          const text = getText(m);
          if (!text) continue;

          const pref = ".";
          if (text.startsWith(pref)) continue;

          const now = Date.now();
          if (st.busy) continue;
          if (st.lastAt && now - Number(st.lastAt) < COOLDOWN_MS) continue;

          st.busy = true;
          st.lastAt = now;
          state.chats[chatId] = st;
          saveState(state);

          let reply = "";
          try {
            reply = await askGroq(text);
          } catch (e) {
            st.busy = false;
            state.chats[chatId] = st;
            saveState(state);
            continue;
          }

          const parts = chunkText(reply, 3500);
          for (const p of parts) {
            await sock.sendMessage(chatId, { text: p }, { quoted: m });
          }

          st.busy = false;
          state.chats[chatId] = st;
          saveState(state);

          if (Date.now() > Number(st.until)) {
            delete state.chats[chatId];
            saveState(state);
          }
        } catch {}
      }
    } catch (err) {
      console.error("groq auto listener error:", err?.message || err);
    }
  });
}

module.exports = {
  name: 'GROQ AI',
  description: 'Inteligencia artificial GROQ',
  
  commands: {
    'groq': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;

      ensureGroqAutoListener(sock);

      if (!isGroupJid(chatId)) {
        return sock.sendMessage(chatId, { 
          text: '🌸 *Este comando solo funciona en grupos*' 
        });
      }

      const sub = args || ""; // args ya es string
      const subLower = sub.toLowerCase().trim();
      const state = loadState();
      cleanExpired(state);

      if (!sub || (subLower !== "on" && subLower !== "off")) {
        const st = state.chats?.[chatId];
        const active = !!st && !isExpired(st);
        const left = active ? Math.max(0, Number(st.until) - Date.now()) : 0;
        const mins = active ? Math.ceil(left / 60000) : 0;

        return sock.sendMessage(chatId, {
          text: `🤖 *GROQ AI*\n\n🌸 *Uso:*\n• .groq on   (activa 10 min)\n• .groq off  (desactiva)\n\n✨ *Estado:* ${active ? `✅ ACTIVO (${mins} min)` : "⛔ APAGADO"}\n\n*Futaba Rio*`
        });
      }

      if (subLower === "on") {
        state.chats[chatId] = {
          until: Date.now() + TTL_MS,
          by: message?.key?.participant || "",
          busy: false,
          lastAt: 0,
        };
        saveState(state);

        return sock.sendMessage(chatId, {
          text: "✅ *GROQ AI ACTIVADO*\n\n🌸 Responderé automáticamente por 10 minutos\n✨ *Futaba Rio*"
        });
      }

      if (subLower === "off") {
        if (state.chats?.[chatId]) {
          delete state.chats[chatId];
          saveState(state);
        }

        return sock.sendMessage(chatId, { 
          text: "⛔ *GROQ AI DESACTIVADO*\n\n✨ *Futaba Rio*" 
        });
      }
    }
  }
};