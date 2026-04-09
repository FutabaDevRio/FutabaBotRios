// handlers/kiss.js
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  name: 'Kiss',
  description: 'Envía diferentes tipos de besos aesthetic',
  
  commands: {
    'kiss': async (sock, message, args, isGroup) => {
      try {
        const chatId = message.key.remoteJid;
        
        if (!chatId.endsWith("@g.us")) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *Solo en grupos*' 
          });
          return;
        }
        
        // Buscar usuario mencionado/citado
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        let targetId;
        
        if (ctx?.participant) {
          targetId = ctx.participant;
        } else if (ctx?.mentionedJid?.length > 0) {
          targetId = ctx.mentionedJid[0];
        }
        
        if (!targetId) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *Menciona a alguien*\n.kiss @usuario' 
          });
          return;
        }
        
        const senderId = message.key.participant || chatId;
        
        if (targetId === senderId) {
          await sock.sendMessage(chatId, { 
            text: '🌸 *No auto-besos*' 
          });
          return;
        }
        
        // Reacción
        await sock.sendMessage(chatId, {
          react: { text: '💋', key: message.key }
        });
        
        // Tipos de beso
        const kissTypes = [
          {
            name: "💋 APASIONADO",
            emoji: "🔥",
            intensity: "Alta",
            duration: "Largo",
            phrases: [
              "Sin Palabras",
              "Son Tan Tiernos.",
              "......",
              "Q Lindos"
            ],
            gifs: [
              "https://media.tenor.com/I3VQxlpXy5AAAAAM/kiss.gif",
              "https://media.tenor.com/YI7mygUPU90AAAAM/kiss.gif"
            ]
          },
          {
            name: "🌸 TIERNO",
            emoji: "💕",
            intensity: "Suave",
            duration: "Corto",
            phrases: [
              "...",
            ],
            gifs: [
              "https://media.tenor.com/mI2JpGc4fjkAAAAM/kiss.gif",
              "https://media.tenor.com/b7JZ_6aDweQAAAAM/kiss-anime.gif"
            ]
          },
          {
            name: "⚡ INTENSO",
            emoji: "💫",
            intensity: "Extrema",
            duration: "Medio",
            phrases: [
              "Despues de esto...q somos?",
            ],
            gifs: [
              "https://media.tenor.com/t7U5JJH7-u8AAAAM/kiss.gif",
              "https://media.tenor.com/pzNwS-YXwocAAAAM/kiss.gif"
            ]
          }
        ];
        
        // Seleccionar tipo aleatorio
        const kissType = kissTypes[Math.floor(Math.random() * kissTypes.length)];
        const phrase = kissType.phrases[Math.floor(Math.random() * kissType.phrases.length)];
        const gifUrl = kissType.gifs[Math.floor(Math.random() * kissType.gifs.length)];
        
        // Nombres
        const senderName = senderId.split('@')[0];
        const targetName = targetId.split('@')[0];
        
        // Detalles aleatorios
        const details = {
          temperatura: `${Math.floor(Math.random() * 30) + 30}°C`,
          electricidad: `${Math.floor(Math.random() * 100)}%`,
          duracionReal: `${(Math.random() * 5 + 1).toFixed(1)}s`,
          efecto: ["Confundid@", "Mesmerizer", "...."][Math.floor(Math.random() * 3)]
        };
        
        // Mensaje aesthetic
        const kissMessage = `
╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
        ${kissType.emoji} ${kissType.name}
╰── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╯

💝 *@${senderName}* → *@${targetName}*

${phrase}

✨ *Detalles:*
   • Tipo: ${kissType.name}
   • Intensidad: ${kissType.intensity}
   • Duración: ${kissType.duration}
   • Efecto: ${details.efecto}

╰───────────── ⋅ ⋅ ────────────╯
        *Futaba Rio*
`;
        
        // Buscar imagen en /rios
        let localImage = null;
        const riosDir = path.join(__dirname, '..', 'kissimg');
        
        if (fs.existsSync(riosDir)) {
          const images = fs.readdirSync(riosDir).filter(f => 
            /\.(jpg|jpeg|png)$/i.test(f)
          );
          
          if (images.length > 0) {
            const randomImg = images[Math.floor(Math.random() * images.length)];
            localImage = {
              path: path.join(riosDir, randomImg),
              buffer: fs.readFileSync(path.join(riosDir, randomImg))
            };
          }
        }
        
        // Enviar
        if (localImage && localImage.buffer) {
          // Con imagen local de /rios
          await sock.sendMessage(chatId, {
            image: localImage.buffer,
            caption: kissMessage,
            mentions: [senderId, targetId]
          });
        } else {
          // Con GIF de internet
          await sock.sendMessage(chatId, {
            video: { url: gifUrl },
            gifPlayback: true,
            caption: kissMessage,
            mentions: [senderId, targetId]
          });
        }
        
        // Reacción según tipo
        const reactionEmoji = kissType.emoji === '🔥' ? '❤️‍🔥' : 
                             kissType.emoji === '💕' ? '💖' : '✨';
        
        await sock.sendMessage(chatId, {
          react: { text: reactionEmoji, key: message.key }
        });
        
        console.log(`💋 ${kissType.name}: ${senderId} -> ${targetId}`);
        
      } catch (error) {
        console.error('Error en kiss:', error);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🌸 *Error enviando beso*' 
        });
      }
    },
    
    // Comando específico para tipo de beso
    'beso': async (sock, message, args, isGroup) => {
      await module.exports.commands.kiss(sock, message, args, isGroup);
    },
    
    // Comando para ver estadísticas de besos
    'besos': async (sock, message, args, isGroup) => {
      try {
        const chatId = message.key.remoteJid;
        
        if (!chatId.endsWith("@g.us")) {
          await sock.sendMessage(chatId, { text: '🌸 Solo grupos' });
          return;
        }
        
        await sock.sendMessage(chatId, { 
          text: `💋 *TIPOS DE BESOS*\n\n` +
                `🔥 .kiss - Beso apasionado\n` +
                `🌸 .kiss - Beso tierno\n` +
                `⚡ .kiss - Beso intenso\n\n` +
                `✨ Cada beso es único y especial\n` +
                `*Futaba Rio*`
        });
        
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🌸 Error' 
        });
      }
    }
  }
};