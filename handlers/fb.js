// handlers/facebook.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "futababotrios";
const MAX_MB = 100;
const TMP_DIR = path.join(__dirname, "..", "tmp");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function isFB(u = "") {
  u = String(u || "");
  return /(facebook\.com|fb\.watch|fb\.com)/i.test(u);
}

function normalizeUrl(input = "") {
  let u = String(input || "").trim().replace(/^<|>$/g, "").trim();
  if (/^(www\.)?facebook\.com\//i.test(u) || /^fb\.watch\//i.test(u)) {
    u = "https://" + u.replace(/^\/+/, "");
  }
  return u;
}

async function getFacebookInfo(url) {
  const endpoint = `${API_BASE}/facebook`;
  const r = await axios.post(endpoint, { url }, {
    headers: { "Content-Type": "application/json", apikey: API_KEY },
    timeout: 60000,
    validateStatus: () => true,
  });

  const data = r.data;
  const ok = data?.status === true || data?.status === "true";
  if (!ok) throw new Error(data?.message || "Error en la API de Facebook");
  
  return data.result;
}

function pickBestVideoUrl(result) {
  const hd = String(result?.media?.video_hd || "").trim();
  const sd = String(result?.media?.video_sd || "").trim();
  if (hd) return hd; 
  if (sd) return sd;
  return null;
}

module.exports = {
  name: 'Facebook',
  description: 'Descarga videos de Facebook',
  
  commands: {
    'facebook': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      let text = args || ""; // args ya es string

      if (!text || text.trim() === "") {
        return sock.sendMessage(chatId, {
          text: '🌸 *Uso:* .facebook <link>\nEjemplo: .facebook https://fb.watch/xxxxx'
        });
      }

      text = normalizeUrl(text.trim());

      if (!isFB(text)) {
        return sock.sendMessage(chatId, {
          text: '🌸 *Link inválido*\nSolo enlaces de Facebook'
        });
      }

      try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        const result = await getFacebookInfo(text);
        const videoUrl = pickBestVideoUrl(result);

        if (!videoUrl) {
          await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
          return sock.sendMessage(chatId, { 
            text: '🌸 *No se encontró video para descargar*' 
          });
        }

        const title = result?.title || "Facebook Video";
        
        await sock.sendMessage(chatId, { react: { text: "📥", key: message.key } });
        await sock.sendMessage(chatId, { 
          text: '🌸 *Descargando video...*' 
        });

        const videoPath = path.join(TMP_DIR, `fb_${Date.now()}.mp4`);
        const videoRes = await axios.get(videoUrl, { responseType: 'stream' });
        
        const writer = fs.createWriteStream(videoPath);
        videoRes.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const stats = fs.statSync(videoPath);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB > MAX_MB) {
          fs.unlinkSync(videoPath);
          await sock.sendMessage(chatId, { 
            text: `🌸 *Video muy grande*\nPesa ${sizeMB.toFixed(2)}MB` 
          });
          return;
        }

        const videoBuffer = fs.readFileSync(videoPath);
        const caption = `📹 *Facebook Video*\n\n🌸 *Título:* ${title}\n📊 *Tamaño:* ${sizeMB.toFixed(2)}MB\n✨ *Futaba Rio*`;

        await sock.sendMessage(chatId, {
          video: videoBuffer,
          caption: caption
        });

        fs.unlinkSync(videoPath);
        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

      } catch (err) {
        console.error("Error Facebook:", err.message);
        await sock.sendMessage(chatId, { 
          text: `🌸 *Error:* ${err.message}` 
        });
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
      }
    },

    'fb': async (sock, message, args, isGroup) => {
      await module.exports.commands.facebook(sock, message, args, isGroup);
    }
  }
};