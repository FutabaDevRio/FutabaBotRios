// handlers/creditos.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'Creditos',
  description: 'Muestra los créditos del bot aesthetic',
  
  commands: {
    'creditos': async (sock, message, args, isGroup) => {
      try {
        // Texto aesthetic de créditos
        const creditosText = `
╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
          ✨ *C R É D I T O S* ✨
╰── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╯

🌸 *CREACIÓN Y DESARROLLO:*
   └─  *Diego - Futaba*
       💻 Creador del Bot

🫂 *COLABORADORES ESPECIALES:*
   └─  *Diosito*
       ✨ Gracias
       🌟 Hizo q Me Funcionara el Bot
       💫 Amen

🎨 *EDICIÓN Y DISEÑO:*
   └─  *Natsuki B*
       🎬 Edición de video
       📱 TikTok: @natsuki.b1

╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
        🤍 *F U T A B A   R I O* 🤍
╰── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╯

💌 *Agradecimientos especiales:*
   • A todos los usuarios 💖
   • Bryank P tremendo edit lanzaste crack

🔮 *"Ggs"*
`;
        
        // Buscar video o imagen en /rios
        const riosDir = path.join(__dirname, '..', 'rios');
        let mediaBuffer = null;
        let mediaType = 'image';
        
        if (fs.existsSync(riosDir)) {
          // Buscar primero el video
          const videoPath = path.join(riosDir, 'ftedit.mp4');
          if (fs.existsSync(videoPath)) {
            mediaBuffer = fs.readFileSync(videoPath);
            mediaType = 'video';
          } else {
            // Buscar imagen
            const imageFiles = fs.readdirSync(riosDir).filter(f => 
              /\.(jpg|jpeg|png)$/i.test(f)
            );
            if (imageFiles.length > 0) {
              const imagePath = path.join(riosDir, imageFiles[0]);
              mediaBuffer = fs.readFileSync(imagePath);
              mediaType = 'image';
            }
          }
        }
        
        // Reacción
        await sock.sendMessage(message.key.remoteJid, {
          react: { text: '✨', key: message.key }
        });
        
        // Enviar créditos con media si existe
        if (mediaBuffer) {
          if (mediaType === 'video') {
            await sock.sendMessage(message.key.remoteJid, {
              video: mediaBuffer,
              gifPlayback: true,
              caption: creditosText
            });
          } else {
            await sock.sendMessage(message.key.remoteJid, {
              image: mediaBuffer,
              caption: creditosText
            });
          }
        } else {
          // Solo texto con estilo
          await sock.sendMessage(message.key.remoteJid, { 
            text: creditosText 
          });
        }
        
        // Reacción final
        await sock.sendMessage(message.key.remoteJid, {
          react: { text: '💝', key: message.key }
        });
        
      } catch (error) {
        console.error('Error en creditos:', error);
        
        // Versión de emergencia minimalista
        const fallbackText = `
✦・┈┈┈┈┈┈・✦・┈┈┈┈┈┈・✦

✨ *Créditos*

🌸 Creador: Diego - Futaba
🫂 Colaboradores: Diosito  
🎨 Edit y Video: Natsuki B
📱 TikTok: Natsuki.b1

🤍 *Futaba Rio*

✦・┈┈┈┈┈┈・✦・┈┈┈┈┈┈・✦
`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: fallbackText 
        });
      }
    },
    
    // Alias y variantes
    'credits': async (sock, message, args, isGroup) => {
      await module.exports.commands.creditos(sock, message, args, isGroup);
    },
    
    'team': async (sock, message, args, isGroup) => {
      await module.exports.commands.creditos(sock, message, args, isGroup);
    },
    
    'creador': async (sock, message, args, isGroup) => {
      await module.exports.commands.creditos(sock, message, args, isGroup);
    },
    
    // Versión minimalista
    'about': async (sock, message, args, isGroup) => {
      try {
        const aboutText = `
╭───────── ⋅ ⋅ ─────────╮
       🎀 *A B O U T* 🎀
╰───────── ⋅ ⋅ ─────────╯

💻 *Developer:* Diego - Futaba
✨ *Inspiración:* Diosito
🎬 *Edición:* Natsuki B
📱 *TikTok:* @natsuki.b1

🌸 *Bot:* Futaba Rio v3.0
⚡ *Estado:* Operativo
💝 *Propósito:* Hacer tu día mejor

╰───────── ⋅ ⋅ ─────────╯
        *Con amor 💖*
`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: aboutText 
        });
        
        await sock.sendMessage(message.key.remoteJid, {
          react: { text: '🌸', key: message.key }
        });
        
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🌸 *Sobre el bot*\n\nCreador: Diego\nEditor: Natsuki B\nTikTok: @natsuki.b1' 
        });
      }
    }
  }
};