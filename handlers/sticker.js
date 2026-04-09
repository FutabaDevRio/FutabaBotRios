const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
  name: 'Sticker Maker',
  description: 'Comandos para crear stickers aesthetic',
  
  commands: {
    's': async (sock, message, args, isGroup) => {
      try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const media = quoted || message.message;
        
        if (!media?.imageMessage && !media?.videoMessage) return;

        // Obtener nombre del usuario (usando pushName que es el nombre que aparece en WhatsApp)
        const userName = message.pushName || 'Usuario';
        
        // Decoraciones aesthetic
        const decors = ['🌸', '✨', '💫', '🌙', '💖', '🫧', '🎀', '⭐'];
        const decor = decors[Math.floor(Math.random() * decors.length)];
        
        // Descargar media
        const buffer = await downloadMediaMessage(
          { key: message.key, message: media },
          'buffer',
          {},
          { reuploadRequest: sock.updateMediaMessage }
        );

        if (!buffer) return;

        // Crear sticker aesthetic
        const sticker = new Sticker(buffer, {
          pack: '🌸 FutabaBot 🌸',
          author: `${decor} Por: ${userName} ${decor}`,
          type: StickerTypes.FULL,
          quality: 60,
          categories: ['🌸', '✨', '💫']
        });

        // Enviar sticker
        await sock.sendMessage(message.key.remoteJid, {
          sticker: await sticker.toBuffer()
        });

      } catch (error) {
        // Silencioso
      }
    }
  }
};