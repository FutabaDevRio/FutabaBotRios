// handlers/apk.js
const axios = require("axios");

module.exports = {
  name: 'APK',
  description: 'Busca y descarga APKs',
  
  commands: {
    'apk': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      const text = args || ""; // args ya es string

      if (!text || text.trim() === "") {
        return sock.sendMessage(chatId, {
          text: '🌸 *Uso:* .apk <nombre>\nEjemplo: .apk whatsapp'
        });
      }

      await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

      try {
        const apiUrl = `https://api.neoxr.eu/api/apk?q=${encodeURIComponent(text.trim())}&no=1&apikey=futababotrios`;
        const response = await axios.get(apiUrl);

        if (response.status !== 200) {
          throw new Error(`Error de la API: ${response.status}`);
        }

        const data = response.data;

        if (!data.status || !data.data || !data.file?.url) {
          throw new Error("No se pudo obtener información del APK.");
        }

        const apkInfo = data.data;
        const apkFile = data.file;

        const fileRes = await axios.get(apkFile.url, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileRes.data);

        const caption = `📱 *APK ENCONTRADA*\n\n🌸 *Nombre:* ${apkInfo.name}\n📊 *Tamaño:* ${apkInfo.size}\n⭐ *Rating:* ${apkInfo.rating}\n👥 *Instalaciones:* ${apkInfo.installs}\n👨‍💻 *Desarrollador:* ${apkInfo.developer}\n📁 *Categoría:* ${apkInfo.category}\n🔢 *Versión:* ${apkInfo.version}\n\n✨ *Futaba Rio*`;

        await sock.sendMessage(chatId, { text: caption });

        await sock.sendMessage(chatId, {
          document: fileBuffer,
          mimetype: "application/vnd.android.package-archive",
          fileName: apkFile.filename || `${apkInfo.name}.apk`
        });

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

      } catch (err) {
        console.error("Error APK:", err.message);
        await sock.sendMessage(chatId, {
          text: `🌸 *Error:* ${err.message}`
        });

        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
      }
    }
  }
};