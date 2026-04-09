const axios = require("axios");

// Configuración de la API (ADAPTADA PARA FUTABA RIO)
const API_CONFIG = {
  baseUrl: "https://api-sky.ultraplus.click",
  apiKey: "futababotrios",
  headers: {
    "Content-Type": "application/json",
    "apikey": "futababotrios"
  }
};

// Almacenamiento temporal de trabajos pendientes
const pendingJobs = {};

module.exports = {
  name: 'Spotify',
  description: 'Descargar música de Spotify',
  
  commands: {
    // ============ SPOTIFY ============
    'spotify': async (sock, message, args, isGroup) => {
      const chatId = message.key.remoteJid;
      
      if (!args) {
        await sock.sendMessage(chatId, { 
          text: '🎵 *DESCARGAR DE SPOTIFY*\n\n❌ *Uso:* .spotify <canción o URL>\n\n📌 *Ejemplos:*\n• .spotify bad bunny\n• .spotify https://open.spotify.com/track/abc123'
        });
        return;
      }
      
      const query = args.trim();
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(chatId, { 
          text: '🎵 *BUSCANDO EN SPOTIFY...*\n\n⏳ Por favor espera...'
        });
        
        // Determinar si es URL o búsqueda
        const isUrl = /spotify\.com/i.test(query);
        const requestData = isUrl ? { url: query } : { query: query };
        
        // Llamar a la API
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/spotify`,
          requestData,
          {
            headers: API_CONFIG.headers,
            timeout: 30000
          }
        );
        
        console.log('Spotify Respuesta:', response.data);
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        const audioUrl = result?.media?.audio;
        
        if (!audioUrl) {
          throw new Error('No se pudo obtener el audio');
        }
        
        const title = result.title || "Canción de Spotify";
        const artist = result.artist || "Artista desconocido";
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
          } catch (e) {}
        }
        
        // Crear ID único para este trabajo
        const jobId = Date.now().toString();
        
        // Enviar mensaje con opciones
        const optionsText = `🎵 *SPOTIFY - OPCIONES*\n\n` +
                           `🎧 *Canción:* ${title}\n` +
                           `👤 *Artista:* ${artist}\n\n` +
                           `*Elige cómo descargar:*\n` +
                           `1️⃣ - Como audio normal\n` +
                           `2️⃣ - Como documento\n\n` +
                           `*Responde con el número de tu elección*`;
        
        const optionsMsg = await sock.sendMessage(chatId, { 
          text: optionsText 
        });
        
        // Guardar trabajo pendiente
        pendingJobs[jobId] = {
          chatId: chatId,
          audioUrl: audioUrl,
          title: title,
          artist: artist,
          optionsMsgId: optionsMsg.key.id,
          timestamp: Date.now()
        };
        
        // Configurar listener para respuesta (si no está configurado)
        if (!sock._spotifyListener) {
          sock._spotifyListener = true;
          
          sock.ev.on("messages.upsert", async (m) => {
            if (m.type !== 'notify') return;
            
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const responseChatId = msg.key.remoteJid;
            const responseText = msg.message.conversation || 
                               msg.message.extendedTextMessage?.text || '';
            
            // Buscar trabajo pendiente
            for (const [jobId, job] of Object.entries(pendingJobs)) {
              if (job.chatId === responseChatId && 
                  (responseText === '1' || responseText === '2')) {
                
                try {
                  const asDocument = responseText === '2';
                  
                  // Enviar mensaje de procesamiento
                  await sock.sendMessage(responseChatId, {
                    text: `⬇️ *DESCARGANDO AUDIO...*\n\nPor favor espera...`
                  });
                  
                  // Descargar audio
                  const audioResponse = await axios.get(job.audioUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                  });
                  
                  const audioBuffer = Buffer.from(audioResponse.data);
                  
                  // Enviar audio
                  if (asDocument) {
                    await sock.sendMessage(responseChatId, {
                      document: audioBuffer,
                      mimetype: 'audio/mpeg',
                      fileName: `${job.title} - ${job.artist}.mp3`,
                      caption: `🎵 ${job.title}\n👤 ${job.artist}\n✅ Descargado via Futaba Rio Bot`
                    });
                  } else {
                    await sock.sendMessage(responseChatId, {
                      audio: audioBuffer,
                      mimetype: 'audio/mpeg',
                      fileName: `${job.title} - ${job.artist}.mp3`
                    });
                    
                    await sock.sendMessage(responseChatId, {
                      text: `✅ *AUDIO ENVIADO*\n\n🎵 *Canción:* ${job.title}\n👤 *Artista:* ${job.artist}`
                    });
                  }
                  
                  // Eliminar trabajo pendiente
                  delete pendingJobs[jobId];
                  
                } catch (error) {
                  console.error('Error procesando Spotify:', error);
                  await sock.sendMessage(responseChatId, {
                    text: `❌ *ERROR AL DESCARGAR*\n\n${error.message}`
                  });
                }
                break;
              }
            }
            
            // Limpiar trabajos antiguos (más de 5 minutos)
            const now = Date.now();
            for (const [jobId, job] of Object.entries(pendingJobs)) {
              if (now - job.timestamp > 5 * 60 * 1000) {
                delete pendingJobs[jobId];
              }
            }
          });
        }
        
      } catch (error) {
        console.error('Error Spotify:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
          } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { 
          text: `❌ *ERROR SPOTIFY*\n\n${error.message || 'Error al procesar la solicitud'}`
        });
      }
    }
  }
};

// Alias para el comando
module.exports.commands.sp = module.exports.commands.spotify;