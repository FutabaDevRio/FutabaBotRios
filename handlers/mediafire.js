// handlers/mediafire.js
const axios = require('axios');

module.exports = {
  name: 'MediaFire',
  description: 'Descarga archivos de MediaFire',
  
  commands: {
    'mediafire': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      const text = args || ""; // args ya es string

      if (!text || text.trim() === "") {
        return sock.sendMessage(chatId, {
          text: '🌸 *Uso:* .mediafire <link>\nEjemplo: .mediafire https://mediafire.com/file/ejemplo'
        });
      }

      if (!/^https?:\/\/(www\.)?mediafire\.com/.test(text.trim())) {
        return sock.sendMessage(chatId, {
          text: '🌸 *Link inválido*\nDebe ser un enlace de MediaFire'
        });
      }

      await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

      try {
        const apiUrl = `https://api.neoxr.eu/api/mediafire?url=${encodeURIComponent(text.trim())}&apikey=futababotrios`;
        const response = await axios.get(apiUrl);

        if (response.status !== 200) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = response.data;

        if (!data.status || !data.data?.url) {
          throw new Error("No se pudo obtener el enlace de descarga.");
        }

        const fileInfo = data.data;
        const fileResponse = await axios.get(fileInfo.url, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileResponse.data);

        const caption = `📁 *MEDIAFIRE*\n\n🌸 *Nombre:* ${fileInfo.title}\n📊 *Tamaño:* ${fileInfo.size}\n🎯 *Tipo:* ${fileInfo.mime}\n🔤 *Extensión:* ${fileInfo.extension}\n\n✨ *Futaba Rio*`;

        await sock.sendMessage(chatId, { text: caption });
        
        await sock.sendMessage(chatId, {
          document: fileBuffer,
          mimetype: fileInfo.mime,
          fileName: fileInfo.title
        });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

      } catch (err) {
        console.error("Error mediafire:", err.message);
        await sock.sendMessage(chatId, {
          text: `🌸 *Error:* ${err.message}`
        });

        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
      }
    }
  }
};