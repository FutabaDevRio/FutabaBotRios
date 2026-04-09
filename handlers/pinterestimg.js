// handlers/pinterestimg.js
const axios = require("axios");

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "futababotrios";
const LIMIT = 5;

function pickBestImage(it) {
  return (
    it?.image_medium_url ||
    it?.image_large_url ||
    it?.image_small_url ||
    it?.url ||
    it?.image ||
    ""
  );
}

async function callPinterestImages(q) {
  const endpoint = `${API_BASE}/pinterestimg`;
  const r = await axios.post(
    endpoint,
    { q, limit: LIMIT },
    {
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
        Accept: "application/json, */*",
      },
      timeout: 60000,
      validateStatus: () => true,
    }
  );

  let data = r.data;
  if (typeof data === "string") {
    const t = data.trim();
    try {
      data = JSON.parse(t);
    } catch {
      throw new Error(`Respuesta no JSON del servidor`);
    }
  }

  if (!data || typeof data !== "object") {
    throw new Error(`API inválida`);
  }

  const ok = data.status === true || data.status === "true" || data.ok === true || data.success === true;
  if (!ok) {
    throw new Error(data.message || data.error || `Error en API`);
  }

  const payload = data.result || data.data || data;
  return payload;
}

module.exports = {
  name: 'Pinterest Images',
  description: 'Busca imágenes en Pinterest',
  
  commands: {
    'pinterestimg': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      const input = args || ""; // args ya es string

      if (!input || input.trim() === "") {
        return sock.sendMessage(chatId, {
          text: '🌸 *Uso:* .pinterestimg <búsqueda>\nEjemplo: .pinterestimg gatos anime'
        });
      }

      await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

      try {
        const result = await callPinterestImages(input.trim());
        const raw = Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [];
        const images = raw.slice(0, LIMIT);

        if (!images.length) {
          await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
          return sock.sendMessage(chatId, { 
            text: '🌸 *No se encontraron imágenes*' 
          });
        }

        await sock.sendMessage(chatId, {
          text: `📌 *Encontradas ${images.length} imágenes*\n🔎 *Búsqueda:* ${input}\n✨ *Futaba Rio*`
        });

        for (let i = 0; i < images.length; i++) {
          const it = images[i];
          const url = pickBestImage(it);
          if (!url) continue;

          try {
            await sock.sendMessage(chatId, {
              image: { url: url },
              caption: `📸 ${i + 1}/${images.length} - ${input.substring(0, 50)}`
            });
          } catch (imgError) {
            console.error("Error enviando imagen:", imgError.message);
          }
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

      } catch (e) {
        console.error("Error pinterestimg:", e.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, { 
          text: `🌸 *Error:* ${e?.message || "No se pudo buscar"}` 
        });
      }
    },

    'pinimg': async (sock, message, args, isGroup) => {
      await module.exports.commands.pinterestimg(sock, message, args, isGroup);
    },

    'pimg': async (sock, message, args, isGroup) => {
      await module.exports.commands.pinterestimg(sock, message, args, isGroup);
    }
  }
};