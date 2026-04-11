//beso
const path = require('path');

//links de gif
const KISS_VIDEOS = [
  "https://files.catbox.moe/avpjt9.mp4",
  "https://files.catbox.moe/222uhf.mp4",
  "https://files.catbox.moe/o7n0y1.mp4",
  "https://files.catbox.moe/avpjt9.mp4",
  "me falta cñio"
];

// texto de besos
const kissTexts = [
  "💕 *@1* le dio un besito a *@2* ~",
  "💋 *@1* robó un beso de *@2*",
  " *@1* y *@2*... ¡Se dieron un beso! 💖",
  "🌸 *@1*: \"Toma este beso\" *@1* besó a *@2*",
  "💕 *@1* le dio un pico a *@2* y se sonrojaron ~",
  "✨ *@1* le dio un beso en la mejilla a *@2*",
  "💖 *@1* no pudo resistirse y besó a *@2* ~",
  " *@1* se acercó lentamente y... Beso a *@2*! 💕",
  "🌸 *Futaba Rio:* \"Que lindo ver a @1 y @2 juntos ~\" 💋"
];

// Cooldown de 30 segundos (más corto para besos)
const COOLDOWN_TIME = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  name: 'Kiss',
  description: 'Da un beso a alguien del grupo',
  
  commands: {
    'kiss': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      const senderNum = senderId.split('@')[0];
      
      // Reacción inicial
      await sock.sendMessage(chatId, {
        react: { text: '💋', key: message.key }
      });
      
      // Obtener destinatario
      let targetId = null;
      const contextInfo = message.message?.extendedTextMessage?.contextInfo;
      
      if (contextInfo?.participant) {
        targetId = contextInfo.participant;
      } else if (contextInfo?.mentionedJid?.length > 0) {
        targetId = contextInfo.mentionedJid[0];
      } else if (args && args.length > 0) {
        const rawNumber = args[0].replace(/[^0-9]/g, '');
        if (rawNumber) {
          targetId = `${rawNumber}@s.whatsapp.net`;
        }
      }
      
      if (!targetId) {
        await sock.sendMessage(chatId, {
          text: '💋 *Uso correcto:*\n\n`.kiss @usuario`\nO responde al mensaje de la persona que quieres besar ~\n\n🌸 *Futaba Rio:* \"~\" 💕'
        });
        return;
      }
      
      // Auto-beso
      if (targetId === senderId) {
        await sock.sendMessage(chatId, {
          text: '🥺 *Futaba Rio:*\n\n“No puedes besarte a ti mismo... pero yo te mando un besito virtual ~ 💋”'
        });
        await sock.sendMessage(chatId, {
          react: { text: '😘', key: message.key }
        });
        return;
      }
      
      // Cooldown
      const cooldownKey = `${senderId}_kiss`;
      const lastUsed = cooldowns.get(cooldownKey);
      if (lastUsed && (Date.now() - lastUsed) < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (Date.now() - lastUsed)) / 1000);
        await sock.sendMessage(chatId, {
          text: `⏳ *@${senderNum}*, espera ${remaining} segundos antes de dar otro besito ~`,
          mentions: [senderId]
        });
        return;
      }
      
      cooldowns.set(cooldownKey, Date.now());
      
      // Seleccionar video y texto aleatorio
      const randomVideo = KISS_VIDEOS[Math.floor(Math.random() * KISS_VIDEOS.length)];
      const targetNum = targetId.split('@')[0];
      const randomText = kissTexts[Math.floor(Math.random() * kissTexts.length)];
      const finalText = randomText
        .replace('@1', `@${senderNum}`)
        .replace('@2', `@${targetNum}`);
      
      try {
        // Enviar como GIF
        await sock.sendMessage(chatId, {
          video: { url: randomVideo },
          gifPlayback: true,
          caption: finalText,
          mentions: [senderId, targetId]
        });
        
        // Reacción final
        await sock.sendMessage(chatId, {
          react: { text: '💕', key: message.key }
        });
        
      } catch (error) {
        console.error('Error enviando kiss video:', error);
        
        // Fallback: solo texto
        await sock.sendMessage(chatId, {
          text: `💋 *@${senderNum}* le dio un beso a *@${targetNum}*\n\n🌸 *Futaba Rio:* “Qué romántico ~ 💕”`,
          mentions: [senderId, targetId]
        });
      }
    },
    
    // Alias
    'beso': async (sock, message, args, isGroup) => {
      await module.exports.commands.kiss(sock, message, args, isGroup);
    },
    
    'besitos': async (sock, message, args, isGroup) => {
      await module.exports.commands.kiss(sock, message, args, isGroup);
    }
  }
};
