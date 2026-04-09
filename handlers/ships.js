// handlers/ship.js
module.exports = {
  name: 'Ship',
  description: 'Calcula la compatibilidad entre usuarios',
  
  commands: {
    'ship': async (sock, message, args, isGroup) => {
      try {
        const chatId = message.key.remoteJid;
        
        // Verificar si es grupo
        if (!chatId.endsWith("@g.us")) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *Comando exclusivo para grupos*'
          });
          return;
        }
        
        // Reacción inicial
        try {
          await sock.sendMessage(chatId, {
            react: { text: '💝', key: message.key }
          });
        } catch (e) {}
        
        // Obtener metadata del grupo
        const metadata = await sock.groupMetadata(chatId);
        let participants = metadata.participants.map(p => p.id);
        
        // Verificar si hay suficientes participantes
        if (participants.length < 2) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *Necesito al menos 2 personas*'
          });
          return;
        }
        
        // Buscar usuarios mencionados
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctx?.mentionedJid || [];
        
        let user1, user2;
        
        // Si hay menciones, usarlas
        if (mentioned.length >= 2) {
          user1 = mentioned[0];
          user2 = mentioned[1];
        } else {
          // Selección aleatoria
          participants = participants.sort(() => Math.random() - 0.5);
          user1 = participants.pop();
          user2 = participants.pop();
        }
        
        // Calcular porcentaje
        const score = Math.floor(Math.random() * 101);
        
        // Determinar nivel y emojis
        let level, emojiBar, heart;
        
        if (score >= 90) {
          level = "💘 *Alma gemela*";
          emojiBar = "██████████";
          heart = "💕";
        } else if (score >= 75) {
          level = "✨ *Conexión perfecta*";
          emojiBar = "████████░░";
          heart = "💖";
        } else if (score >= 60) {
          level = "🌟 *Buena química*";
          emojiBar = "██████░░░░";
          heart = "💞";
        } else if (score >= 40) {
          level = "💫 *Compatibilidad media*";
          emojiBar = "████░░░░░░";
          heart = "💓";
        } else if (score >= 20) {
          level = "🌙 *Poca conexión*";
          emojiBar = "██░░░░░░░░";
          heart = "💔";
        } else {
          level = "☁️ *Incompatibles*";
          emojiBar = "░░░░░░░░░░";
          heart = "💢";
        }
        
        // Frases random estilo aesthetic
        const phrases = [
          "Sus estrellas están alineadas ✨",
          "Destinados a encontrarse 🌙",
          "Vibraciones complementarias 💫",
          "Energías que se atraen 🔮",
          "Unión de almas afines 🌸",
          "Campos magnéticos conectados ⚡",
          "Frecuencias en armonía 🎶",
          "Química natural 💞",
          "Polaridades opuestas se atraen 🌓",
          "Sincronía celestial ✨"
        ];
        
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        
        // Mensaje aesthetic
        const shipMessage = `
╭── ⋅ ⋅ ── ✩ ── ⋅ ⋅ ──╮
         💘 *S H I P* 💘
╰── ⋅ ⋅ ── ✩ ── ⋅ ⋅ ──╯

${heart} *Pareja:*
  @${user1.split("@")[0]} × @${user2.split("@")[0]}

✨ *Compatibilidad:*
  ${score}% ${emojiBar}

${level}

🌸 *${randomPhrase}*

╰───────────── ⋅ ⋅ ────────────╯
         *Futaba Rio*
`;
        
        // Enviar resultado
        await sock.sendMessage(chatId, {
          text: shipMessage,
          mentions: [user1, user2]
        });
        
        // Reacción final
        try {
          await sock.sendMessage(chatId, {
            react: { text: heart, key: message.key }
          });
        } catch (e) {}
        
      } catch (error) {
        console.error('Error en ship:', error);
        
        await sock.sendMessage(chatId, { 
          text: '🌸 *Error calculando la compatibilidad*'
        });
      }
    },
    
    // Alias
    'compatibilidad': async (sock, message, args, isGroup) => {
      await module.exports.commands.ship(sock, message, args, isGroup);
    },
    
    'pareja': async (sock, message, args, isGroup) => {
      await module.exports.commands.ship(sock, message, args, isGroup);
    },
    
    'love': async (sock, message, args, isGroup) => {
      await module.exports.commands.ship(sock, message, args, isGroup);
    }
  }
};