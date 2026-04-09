const fetch = require("node-fetch");

module.exports = {
  name: 'IA',
  description: 'Comandos de inteligencia artificial',
  
  commands: {
    'pixai': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      const text = args;
      const participant = message.key.participant || message.key.remoteJid;
      const userMention = `@${participant.replace(/[^0-9]/g, "")}`;

      try {
        await sock.sendMessage(chatId, {
          react: { text: "🎨", key: message.key }
        });

        if (!text) {
          return sock.sendMessage(chatId, {
            text: `⚠️ *Uso incorrecto del comando.*\n✳️ *Ejemplo:* \`.pixai chica anime estilo ghibli\`\n🔹 *Describe lo que deseas generar.*`
          }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
          react: { text: "🔄", key: message.key }
        });

        const prompt = text;
        const apiUrl = `https://api.dorratz.com/v2/pix-ai?prompt=${encodeURIComponent(prompt)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const { images } = await res.json();
        if (!images?.length) {
          return sock.sendMessage(chatId, {
            text: "❌ *No se encontraron resultados.* Intenta con otra descripción."
          }, { quoted: message });
        }

        for (const imageUrl of images.slice(0, 4)) {
          await sock.sendMessage(chatId, {
            image: { url: imageUrl },
            caption: `🖼️ *Imagen generada para:* ${userMention}\n📌 *Prompt:* ${prompt}\n\n🍧 *API:* api.dorratz.com\n────────────\n🤖 _La Suki Bot_`,
            mentions: [participant]
          }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
          react: { text: "✅", key: message.key }
        });

      } catch (err) {
        console.error("❌ Error en .pixai:", err);
        await sock.sendMessage(chatId, {
          text: `❌ *Fallo al generar la imagen:*\n_${err.message}_`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
          react: { text: "❌", key: message.key }
        });
      }
    }
  }
};