// handlers/pareja.js
module.exports = {
  name: 'Pareja',
  description: 'Une a dos usuarios en pareja aesthetic',
  
  commands: {
    'pareja': async (sock, message, args, isGroup) => {
      try {
        const chatId = message.key.remoteJid;
        
        // Buscar menciones
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctx?.mentionedJid || [];
        
        if (mentioned.length < 2) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *Debes mencionar a 2 usuarios*\n\nEjemplo: .pareja @user1 @user2'
          });
          return;
        }
        
        const user1 = mentioned[0];
        const user2 = mentioned[1];
        
        // Reacción
        await sock.sendMessage(chatId, {
          react: { text: '💘', key: message.key }
        });
        
        // Porcentaje random
        const score = Math.floor(Math.random() * 101);
        
        // Determinar emoji y frase según score
        let heart, phrase;
        
        if (score >= 90) {
          heart = "💘";
          phrase = "✨ *Alma gemela* - Destinados a estar juntos";
        } else if (score >= 70) {
          heart = "💖";
          phrase = "🌟 *Conexión perfecta* - Vibraciones en armonía";
        } else if (score >= 50) {
          heart = "💞";
          phrase = "💫 *Buena química* - Se complementan bien";
        } else if (score >= 30) {
          heart = "💓";
          phrase = "🌙 *Compatibilidad media* - Podría funcionar";
        } else {
          heart = "💔";
          phrase = "☁️ *Poca conexión* - Difícil que funcione";
        }
        
        // Mensaje aesthetic
        const shipMessage = `
╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
        ${heart} *P A R E J A* ${heart}
╰── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╯

💝 *Unión:* 
   @${user1.split("@")[0]}
   ×
   @${user2.split("@")[0]}

✨ *Compatibilidad:*
   ${"█".repeat(Math.floor(score/10))}${"░".repeat(10-Math.floor(score/10))}
   ${score}%

${phrase}

╰───────────── ⋅ ⋅ ────────────╯
        *Futaba Rio*
`;
        
        await sock.sendMessage(chatId, {
          text: shipMessage,
          mentions: [user1, user2]
        });
        
        // Reacción final
        await sock.sendMessage(chatId, {
          react: { text: heart, key: message.key }
        });
        
      } catch (error) {
        console.error('Error en pareja:', error);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🌸 *Error creando pareja*' 
        });
      }
    },
    
    // Alias
    'match': async (sock, message, args, isGroup) => {
      await module.exports.commands.pareja(sock, message, args, isGroup);
    },
    
    'couple': async (sock, message, args, isGroup) => {
      await module.exports.commands.pareja(sock, message, args, isGroup);
    },
    
    'ship': async (sock, message, args, isGroup) => {
      await module.exports.commands.pareja(sock, message, args, isGroup);
    }
  }
};