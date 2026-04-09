// handlers/general.js - VERSIÓN CORREGIDA
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'General',
  description: 'Comandos generales básicos del bot',
  
  commands: {
    'ping': async (sock, message, args, isGroup) => {
      const start = Date.now();
      const pingMsg = await sock.sendMessage(message.key.remoteJid, { 
        text: '🏓 *Calculando latencia...*' 
      });
      const end = Date.now();
      const latency = end - start;
      
      try {
        await sock.sendMessage(message.key.remoteJid, {
          delete: pingMsg.key
        });
      } catch (e) {}
      
      await sock.sendMessage(message.key.remoteJid, { 
        text: `🏓 *Pong!*\n\n` +
              `📡 *Latencia:* ${latency}ms\n` +
              `🕐 *Hora:* ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}\n` +
              `⚡ *Estado:* Conexión estable`
      });
    },
    
    'help': async (sock, message, args, isGroup) => {
      const helpText = `
╔════════════════════════╗
                 🤍 𝗙𝗨𝗧𝗔𝗕𝗔 𝗥𝗜𝗢 𝘃³.⁰
                Your preferred bot ✨
╚════════════════════════╝

┌── 📋 𝖦𝖤𝖭𝖤𝖱𝖠𝖫𝖤𝖲 ──┐
│ ▧ .help   ‣ Menú  
│ ▧ .ping   ‣ Latencia
│ ▧ .time   ‣ Reloj
│ ▧ .calc   ‣ Math
│ ▧ .creditos   ‣ creditos del bot
└──────────────────────┘

┌── 🧠 𝖨𝖭𝖳𝖤𝖫𝖨𝖦𝖤𝖭𝖢𝖨𝖠 ──┐
│ ◉ .ai     ‣ Gemini  
│ ◉ .dsp    ‣ DeepSeek 
│ ◉ .gpt    ‣ ChatGPT  
│ ◉ .trad   ‣ Traducir
│ ◉ .write  ‣ Escribir
└──────────────────────┘

┌── 📥 𝖣𝖤𝖲𝖢𝖠𝖱𝖦𝖠𝖲 ──┐
│ 📥 .tiktok │ .ig │ .ytmp3 and mp4
└──────────────────────┘

┌── 👥 𝖦𝖤𝖲𝖳𝖨𝖮𝖭 ──┐
│ ◈ .infog   ◈ .list
│ ◈ .add     ◈ .ban
│ ◈ .promote ◈ .demote
│ ◈ .silenciar / .desilenciar
└──────────────────────┘

┌── 💝 𝖠𝖬𝖮𝖱 ──┐
│ 💋 .kiss   ‣ Besar
│ 💘 .ship   ‣ Compatibilidad
│ 💞 .pareja ‣ Unir parejas
└──────────────────────┘

┌── 🛠️ 𝖠𝖣𝖬𝖨𝖭 ──┐
│ 🧹 .clear  ‣ Limpiar servidor
│ 💾 .space  ‣ Ver espacio
└──────────────────────┘
   🔬 𝖫𝗈𝗀𝗂𝖼 𝗂𝗌 𝗍𝗁𝖾 𝗈𝗇𝗅𝗒 𝗐𝖺𝗒.
      `;
      
      try {
        // CORRECCIÓN: Buscar fredit.mp4 en lugar de fredit.mp4
        const videoPath = path.join(__dirname, '..', 'rios', 'ftedit.mp4');
        const imagePath = path.join(__dirname, '..', 'rios', 'Futaba.jpeg');
        
        console.log(`🎬 Buscando video en: ${videoPath}`);
        console.log(`📁 Existe video: ${fs.existsSync(videoPath)}`);
        
        if (fs.existsSync(videoPath)) {
          console.log('✅ Video encontrado, enviando...');
          const videoBuffer = fs.readFileSync(videoPath);
          const stats = fs.statSync(videoPath);
          console.log(`📊 Tamaño video: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          await sock.sendMessage(message.key.remoteJid, {
            video: videoBuffer,
            gifPlayback: true,
            caption: helpText
          });
          console.log('✅ Video enviado exitosamente');
          
        } else if (fs.existsSync(imagePath)) {
          console.log('🖼️ Enviando imagen como fallback...');
          const imageBuffer = fs.readFileSync(imagePath);
          
          await sock.sendMessage(message.key.remoteJid, {
            image: imageBuffer,
            caption: helpText
          });
          
        } else {
          console.log('📝 Enviando solo texto...');
          await sock.sendMessage(message.key.remoteJid, { 
            text: helpText 
          });
        }
      } catch (error) {
        console.error('❌ Error enviando help:', error);
        // Fallback a solo texto
        await sock.sendMessage(message.key.remoteJid, { 
          text: helpText 
        });
      }
    },
    
    'menu': async (sock, message, args, isGroup) => {
      // Alias de help
      await module.exports.commands.help(sock, message, args, isGroup);
    },
    
    'time': async (sock, message, args, isGroup) => {
      const now = new Date();
      
      const timeText = `
🕐 *RELOJ GLOBAL*

🌍 *Fecha y Hora Actual:*
📅 ${now.toLocaleDateString('es-ES', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
⏰ ${now.toLocaleTimeString('es-ES', { 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit',
  hour12: true 
})}

⏳ *Timestamp Unix:* ${Math.floor(now.getTime() / 1000)}
📊 *Milisegundos:* ${now.getTime()}
      `;
      
      // Buscar video
      try {
        const videoPath = path.join(__dirname, '..', 'rios', 'ftedit.mp4'); // CORREGIDO
        
        if (fs.existsSync(videoPath)) {
          const videoBuffer = fs.readFileSync(videoPath);
          
          await sock.sendMessage(message.key.remoteJid, {
            video: videoBuffer,
            gifPlayback: true,
            caption: timeText
          });
        } else {
          await sock.sendMessage(message.key.remoteJid, { text: timeText });
        }
      } catch (error) {
        console.error('Error enviando time:', error);
        await sock.sendMessage(message.key.remoteJid, { text: timeText });
      }
    },
    
    'calc': async (sock, message, args, isGroup) => {
      if (!args) {
        const calcHelp = `🧮 *CALCULADORA*\n\n` +
                        `❌ *Uso:* \`.calc [expresión]\`\n\n` +
                        `📌 *Ejemplos:*\n` +
                        `• \`.calc 2+2\`\n` +
                        `• \`.calc 15*3\`\n` +
                        `• \`.calc (5+3)*2\``;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: calcHelp 
        });
        return;
      }
      
      try {
        // Expresión segura
        const expression = args.replace(/[^0-9+\-*/().% ]/g, '');
        const result = eval(expression);
        
        const calcResult = `🧮 *CALCULADORA*\n\n` +
                          `📝 *Expresión:* ${args}\n` +
                          `✅ *Resultado:* ${result}`;
        
        // Intentar con video
        try {
          const videoPath = path.join(__dirname, '..', 'rios', 'ftedit.mp4'); // CORREGIDO
          
          if (fs.existsSync(videoPath)) {
            const videoBuffer = fs.readFileSync(videoPath);
            
            await sock.sendMessage(message.key.remoteJid, {
              video: videoBuffer,
              gifPlayback: true,
              caption: calcResult
            });
          } else {
            await sock.sendMessage(message.key.remoteJid, { 
              text: calcResult 
            });
          }
        } catch (videoError) {
          console.error('Error enviando calc con video:', videoError);
          await sock.sendMessage(message.key.remoteJid, { 
            text: calcResult 
          });
        }
        
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ *Error en cálculo*\nVerifica la expresión matemática.' 
        });
      }
    },
    
    // Nuevo comando para ver el video directamente
    'video': async (sock, message, args, isGroup) => {
      try {
        const videoPath = path.join(__dirname, '..', 'rios', 'ftedit.mp4'); // CORREGIDO
        
        console.log(`🎥 Intentando enviar video desde: ${videoPath}`);
        
        if (fs.existsSync(videoPath)) {
          console.log('✅ Video encontrado');
          const videoBuffer = fs.readFileSync(videoPath);
          const stats = fs.statSync(videoPath);
          console.log(`📊 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          await sock.sendMessage(message.key.remoteJid, {
            video: videoBuffer,
            gifPlayback: true,
            caption: '✨ *Futaba Rio* ✨\nVideo aesthetic del bot'
          });
          
          console.log('✅ Video enviado');
        } else {
          console.log('❌ Video NO encontrado');
          // Listar archivos en /rios para debug
          const riosDir = path.join(__dirname, '..', 'rios');
          if (fs.existsSync(riosDir)) {
            const files = fs.readdirSync(riosDir);
            console.log('📂 Archivos en /rios:', files);
          }
          
          await sock.sendMessage(message.key.remoteJid, { 
            text: '🌸 *Video fredit.mp4 no encontrado*\nArchivos en /rios: ' + 
                  (fs.existsSync(riosDir) ? fs.readdirSync(riosDir).join(', ') : 'No existe carpeta')
          });
        }
      } catch (error) {
        console.error('❌ Error enviando video:', error);
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ Error: ${error.message}` 
        });
      }
    },
    
    'gif': async (sock, message, args, isGroup) => {
      // Alias de video
      await module.exports.commands.video(sock, message, args, isGroup);
    },
    
    // Comando para debug del video
    'debugvideo': async (sock, message, args, isGroup) => {
      try {
        const riosDir = path.join(__dirname, '..', 'rios');
        const videoPath = path.join(riosDir, 'ftedit.mp4');
        
        let debugInfo = `🔍 *DEBUG VIDEO*\n\n`;
        
        debugInfo += `📁 Carpeta /rios existe: ${fs.existsSync(riosDir)}\n`;
        
        if (fs.existsSync(riosDir)) {
          const files = fs.readdirSync(riosDir);
          debugInfo += `📂 Archivos: ${files.join(', ')}\n`;
          debugInfo += `🎬 Buscando: fredit.mp4\n`;
          debugInfo += `✅ Encontrado: ${files.includes('ftedit.mp4')}\n`;
          
          if (files.includes('ftedit.mp4')) {
            const stats = fs.statSync(videoPath);
            debugInfo += `📊 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
            debugInfo += `📅 Modificado: ${new Date(stats.mtime).toLocaleString()}\n`;
          }
        }
        
        debugInfo += `\n📍 Ruta completa:\n${videoPath}`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: debugInfo 
        });
        
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ Debug error: ${error.message}` 
        });
      }
    }
  }
};