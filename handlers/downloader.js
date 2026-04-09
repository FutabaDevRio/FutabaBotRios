// handlers/downloader.js
const axios = require('axios');

// Configuración de la API
const API_CONFIG = {
  baseUrl: 'https://api-sky.ultraplus.click',
  apiKey: 'futababotrios',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'futababotrios'
  }
};

// Función auxiliar para validar URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Función para extraer URL de los argumentos
function extractUrlFromArgs(args) {
  if (!args) return null;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = args.match(urlRegex);
  return matches ? matches[0] : args.trim();
}

// Función para obtener URL directa desde enlace indirecto de YouTube
async function getDirectYouTubeUrl(indirectUrl, type = 'audio') {
  try {
    console.log('Obteniendo URL directa desde:', indirectUrl);
    
    // Si ya es una URL directa de la API
    if (indirectUrl.includes(API_CONFIG.baseUrl)) {
      return indirectUrl;
    }
    
    // Si es un enlace de emma18.savenow.to, intentamos seguir redirecciones
    if (indirectUrl.includes('emma18.savenow.to') || indirectUrl.includes('savenow.to')) {
      // Hacer una solicitud GET con seguimiento de redirecciones
      const response = await axios.get(indirectUrl, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Aceptar redirecciones
        }
      });
      
      // Si después de las redirecciones obtenemos un archivo, usar esa URL
      const finalUrl = response.request?.res?.responseUrl || indirectUrl;
      console.log('URL final después de redirecciones:', finalUrl);
      
      // Verificar si es un archivo de medios
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('video/') || contentType.includes('audio/') || 
          contentType.includes('application/octet-stream')) {
        return finalUrl;
      }
      
      return indirectUrl;
    }
    
    return indirectUrl;
  } catch (error) {
    console.error('Error obteniendo URL directa:', error.message);
    return indirectUrl; // Devolver la original si falla
  }
}

module.exports = {
  name: 'Descargas',
  description: 'Comandos para descargar contenido de redes sociales',
  
  commands: {
    // ============ YOUTUBE MP3 ============
    'ytmp3': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🎵 *YOUTUBE A MP3*\n\n❌ *Uso:* .ytmp3 [url de YouTube]\n\nEj: .ytmp3 https://youtu.be/3iUgKH8c7p4'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '🎵 *PROCESANDO YOUTUBE A MP3...*\n\n⏳ Convirtiendo audio...'
        });
        
        const url = extractUrlFromArgs(args);
        if (!url || !isValidUrl(url)) {
          throw new Error('URL inválida');
        }
        
        // Obtener información del audio
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/youtube/resolve`,
          {
            url: url,
            type: "audio",
            quality: "highest"
          },
          {
            headers: API_CONFIG.headers,
            timeout: 60000
          }
        );
        
        console.log('YouTube MP3 Respuesta:', response.data);
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        if (!result || !result.media) {
          throw new Error('No se pudo obtener el audio');
        }
        
        // Obtener URL del audio
        let audioUrl = null;
        if (result.media.direct) {
          audioUrl = result.media.direct;
        } else if (result.media.dl_inline) {
          const dlPath = result.media.dl_inline.startsWith('/') ? result.media.dl_inline : `/${result.media.dl_inline}`;
          audioUrl = `${API_CONFIG.baseUrl}${dlPath}`;
        }
        
        if (!audioUrl) {
          throw new Error('No se pudo obtener enlace de audio');
        }
        
        console.log('URL de audio obtenida:', audioUrl);
        
        // Intentar obtener URL directa
        const directAudioUrl = await getDirectYouTubeUrl(audioUrl, 'audio');
        console.log('URL directa de audio:', directAudioUrl);
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {
            console.log('No se pudo eliminar mensaje');
          }
        }
        
        // Enviar información
        const infoText = `✅ *AUDIO MP3 LISTO*\n\n` +
                        `🎵 *Título:* ${result.title || 'Sin título'}\n` +
                        `👤 *Autor:* ${result.author?.name || 'Desconocido'}\n` +
                        `⬇️ *Enviando audio...*`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: infoText 
        });
        
        // ENVIAR COMO AUDIO (NO COMO DOCUMENTO)
        await sock.sendMessage(message.key.remoteJid, {
          audio: { 
            url: directAudioUrl 
          },
          mimetype: 'audio/mpeg',
          ptt: false, // No es mensaje de voz, es audio normal
          fileName: `${(result.title || 'audio_youtube').substring(0, 50).replace(/[^\w\s]/gi, '')}.mp3`
        });
        
      } catch (error) {
        console.error('Error YouTube MP3:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR YOUTUBE MP3*\n\n${error.message || 'Error'}`
        });
      }
    },
    
    // ============ YOUTUBE MP4 ============
    'ytmp4': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '🎬 *YOUTUBE A MP4*\n\n' +
                '❌ *Uso:* .ytmp4 [url de YouTube] [calidad]\n\n' +
                '📌 *Calidades:* 360, 480, 720, 1080\n' +
                '📌 *Ejemplo:* .ytmp4 https://youtu.be/abc123 720'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '🎬 *PROCESANDO YOUTUBE A MP4...*\n\n⏳ Descargando video...'
        });
        
        const url = extractUrlFromArgs(args);
        if (!url || !isValidUrl(url)) {
          throw new Error('URL inválida');
        }
        
        // Extraer calidad
        const urlMatch = args.match(/(https?:\/\/[^\s]+)/);
        const urlPart = urlMatch ? urlMatch[0] : '';
        const qualityArg = args.replace(urlPart, '').trim();
        
        let selectedQuality = '360';
        if (qualityArg.includes('480')) selectedQuality = '480';
        if (qualityArg.includes('720')) selectedQuality = '720';
        if (qualityArg.includes('1080')) selectedQuality = '1080';
        if (qualityArg.includes('1440')) selectedQuality = '1440';
        if (qualityArg.includes('4k')) selectedQuality = '4k';
        
        console.log(`Solicitando video - URL: ${url}, Calidad: ${selectedQuality}`);
        
        // Obtener información del video
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/youtube/resolve`,
          {
            url: url,
            type: "video",
            quality: selectedQuality
          },
          {
            headers: API_CONFIG.headers,
            timeout: 90000
          }
        );
        
        console.log('YouTube MP4 Respuesta:', response.data);
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        if (!result || !result.media) {
          throw new Error('No se pudo obtener el video');
        }
        
        // Obtener URL del video
        let videoUrl = null;
        if (result.media.direct) {
          videoUrl = result.media.direct;
        } else if (result.media.dl_inline) {
          const dlPath = result.media.dl_inline.startsWith('/') ? result.media.dl_inline : `/${result.media.dl_inline}`;
          videoUrl = `${API_CONFIG.baseUrl}${dlPath}`;
        }
        
        if (!videoUrl) {
          throw new Error('No se pudo obtener enlace de video');
        }
        
        console.log('URL de video obtenida:', videoUrl);
        
        // Intentar obtener URL directa
        const directVideoUrl = await getDirectYouTubeUrl(videoUrl, 'video');
        console.log('URL directa de video:', directVideoUrl);
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {
            console.log('No se pudo eliminar mensaje');
          }
        }
        
        // Enviar información
        const infoText = `✅ *VIDEO MP4 LISTO*\n\n` +
                        `🎬 *Título:* ${result.title || 'Sin título'}\n` +
                        `👤 *Autor:* ${result.author?.name || 'Desconocido'}\n` +
                        `📊 *Calidad:* ${selectedQuality}p\n` +
                        `⬇️ *Enviando video...*`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: infoText 
        });
        
        // ENVIAR COMO VIDEO (NO COMO DOCUMENTO)
        await sock.sendMessage(message.key.remoteJid, {
          video: { 
            url: directVideoUrl 
          },
          mimetype: 'video/mp4',
          caption: `🎬 ${result.title || 'Video de YouTube'}\n📊 ${selectedQuality}p\n✅ Descargado via Futaba Rio Bot`,
          fileName: `${(result.title || 'video_youtube').substring(0, 50).replace(/[^\w\s]/gi, '')}.mp4`
        });
        
      } catch (error) {
        console.error('Error YouTube MP4:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR YOUTUBE MP4*\n\n${error.message || 'Error'}`
        });
      }
    },
    
    // ============ TIKTOK ============
    'tiktok': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '📱 *DESCARGAR TIKTOK*\n\n❌ *Uso:* .tiktok [url de TikTok]'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '📱 *DESCARGANDO TIKTOK...*\n\n⏳ Por favor espera...'
        });
        
        const url = extractUrlFromArgs(args);
        if (!url || !isValidUrl(url)) {
          throw new Error('URL inválida');
        }
        
        // Llamar a la API de TikTok
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/tiktok`,
          {
            url: url
          },
          {
            headers: API_CONFIG.headers,
            timeout: 30000
          }
        );
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        if (!result) {
          throw new Error('No se pudo procesar el TikTok');
        }
        
        // EXTRAER URL DEL VIDEO
        const videoUrl = result.media?.video;
        
        if (!videoUrl) {
          throw new Error('No se pudo extraer el video del TikTok');
        }
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        // Enviar información
        await sock.sendMessage(message.key.remoteJid, { 
          text: `✅ *TIKTOK DESCARGADO*\n\n` +
                `👤 *Usuario:* ${result.author?.username || result.author?.name || 'Desconocido'}\n` +
                `⬇️ *Enviando video...*`
        });
        
        // ENVIAR COMO VIDEO
        await sock.sendMessage(message.key.remoteJid, {
          video: { url: videoUrl },
          mimetype: 'video/mp4',
          fileName: `tiktok_${Date.now()}.mp4`,
          caption: `📱 TikTok de @${result.author?.username || 'usuario'}\n\n` +
                  `${result.title || ''}\n\n` +
                  `❤️ ${result.stats?.likes || 0} 👁️ ${result.stats?.views || 0}\n` +
                  `✅ Descargado via Futaba Rio Bot`
        });
        
      } catch (error) {
        console.error('Error TikTok:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR TIKTOK*\n\n${error.message || 'Error desconocido'}`
        });
      }
    },
    
    // ============ INSTAGRAM ============
    'ig': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '📸 *DESCARGAR INSTAGRAM*\n\n❌ *Uso:* .ig [url de Instagram]'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '📸 *DESCARGANDO INSTAGRAM...*\n\n⏳ Por favor espera...'
        });
        
        const url = extractUrlFromArgs(args);
        if (!url || !isValidUrl(url)) {
          throw new Error('URL inválida');
        }
        
        // Llamar a la API de Instagram
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/instagram`,
          {
            url: url
          },
          {
            headers: API_CONFIG.headers,
            timeout: 30000
          }
        );
        
        console.log('Instagram Respuesta:', response.data);
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        if (!result || !result.media || !result.media.items || result.media.items.length === 0) {
          throw new Error('No se encontraron medios');
        }
        
        // Tomar el primer item
        const firstItem = result.media.items[0];
        const mediaUrl = firstItem.url;
        const isVideo = firstItem.type === 'video';
        
        if (!mediaUrl) {
          throw new Error('No se pudo obtener el enlace');
        }
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        // Enviar información
        await sock.sendMessage(message.key.remoteJid, { 
          text: `✅ *CONTENIDO DE INSTAGRAM*\n\n` +
                `📊 *Tipo:* ${isVideo ? 'Video' : 'Imagen'}\n` +
                `⬇️ *Enviando...*`
        });
        
        // ENVIAR COMO MEDIO CORRECTO
        if (isVideo) {
          await sock.sendMessage(message.key.remoteJid, {
            video: { url: mediaUrl },
            mimetype: 'video/mp4',
            fileName: `instagram_${Date.now()}.mp4`,
            caption: `📸 Instagram\n✅ Descargado via Futaba Rio Bot`
          });
        } else {
          await sock.sendMessage(message.key.remoteJid, {
            image: { url: mediaUrl },
            caption: `📸 Instagram\n✅ Descargado via Futaba Rio Bot`
          });
        }
        
      } catch (error) {
        console.error('Error Instagram:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR INSTAGRAM*\n\n${error.message || 'Error desconocido'}`
        });
      }
    },
    
    // ============ PINTEREST CORREGIDO ============
    'pinterest': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '📌 *DESCARGAR PINTEREST*\n\n❌ *Uso:* .pinterest [url de Pinterest]'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '📌 *DESCARGANDO PINTEREST...*\n\n⏳ Por favor espera...'
        });
        
        const url = extractUrlFromArgs(args);
        if (!url || !isValidUrl(url)) {
          throw new Error('URL inválida');
        }
        
        // Llamar a la API de Pinterest
        const response = await axios.post(
          `${API_CONFIG.baseUrl}/pinterest`,
          {
            url: url
          },
          {
            headers: API_CONFIG.headers,
            timeout: 30000
          }
        );
        
        console.log('Pinterest Respuesta COMPLETA:', JSON.stringify(response.data, null, 2));
        
        if (!response.data || !response.data.status) {
          throw new Error(response.data?.message || 'Error en la API');
        }
        
        const result = response.data.result;
        if (!result) {
          throw new Error('No se pudo procesar el pin');
        }
        
        // BUSCAR URL DEL VIDEO - ESTRUCTURA CORRECTA
        let mediaUrl = null;
        let isVideo = false;
        
        // DEBUG: Mostrar estructura para diagnóstico
        console.log('Estructura del resultado:', {
          tieneMedia: !!result.media,
          tieneDownloads: !!result.downloads,
          mp4: result.media?.mp4,
          video: result.downloads?.video,
          video_inline: result.downloads?.video_inline
        });
        
        // PRIMERA OPCIÓN: Usar el MP4 directo (¡ESTA ES LA CORRECTA!)
        if (result.media?.mp4) {
          mediaUrl = result.media.mp4;
          isVideo = true;
          console.log('✅ Usando MP4 directo de media:', mediaUrl);
        }
        // SEGUNDA OPCIÓN: Usar downloads.video
        else if (result.downloads?.video) {
          const dlPath = result.downloads.video;
          // Si es ruta relativa, convertir a absoluta
          if (dlPath.startsWith('/')) {
            mediaUrl = `${API_CONFIG.baseUrl}${dlPath}`;
          } else {
            mediaUrl = dlPath;
          }
          isVideo = true;
          console.log('✅ Usando downloads.video:', mediaUrl);
        }
        // TERCERA OPCIÓN: Usar downloads.video_inline
        else if (result.downloads?.video_inline) {
          const dlPath = result.downloads.video_inline;
          if (dlPath.startsWith('/')) {
            mediaUrl = `${API_CONFIG.baseUrl}${dlPath}`;
          } else {
            mediaUrl = dlPath;
          }
          isVideo = true;
          console.log('✅ Usando downloads.video_inline:', mediaUrl);
        }
        // CUARTA OPCIÓN: Usar thumbnail como imagen
        else if (result.media?.thumbnail) {
          mediaUrl = result.media.thumbnail;
          isVideo = false;
          console.log('✅ Usando thumbnail como imagen:', mediaUrl);
        }
        
        if (!mediaUrl) {
          console.error('❌ No se encontró contenido. Estructura completa:', result);
          throw new Error('No se pudo extraer el contenido del pin');
        }
        
        // Eliminar mensaje de procesamiento
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        const title = result.title || "Contenido de Pinterest";
        const author = result.creator?.username || result.creator?.name || "Desconocido";
        
        // Enviar información
        const infoText = `✅ *CONTENIDO DE PINTEREST*\n\n` +
                        `🎬 *Título:* ${title}\n` +
                        `👤 *Autor:* ${author}\n` +
                        `📊 *Tipo:* ${isVideo ? 'Video' : 'Imagen'}\n` +
                        `⬇️ *Enviando...*`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: infoText 
        });
        
        // ENVIAR COMO MEDIO CORRECTO
        if (isVideo) {
          await sock.sendMessage(message.key.remoteJid, {
            video: { url: mediaUrl },
            mimetype: 'video/mp4',
            fileName: `pinterest_${Date.now()}.mp4`,
            caption: `📌 Pinterest Video\n🎬 ${title}\n👤 ${author}\n✅ Futaba Rio Bot`
          });
        } else {
          await sock.sendMessage(message.key.remoteJid, {
            image: { url: mediaUrl },
            caption: `📌 Pinterest Image\n🖼️ ${title}\n👤 ${author}\n✅ Futaba Rio Bot`
          });
        }
        
      } catch (error) {
        console.error('Error Pinterest:', error);
        
        if (processingMsg && processingMsg.key) {
          try {
            await sock.sendMessage(message.key.remoteJid, {
              delete: processingMsg.key
            });
          } catch (e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR PINTEREST*\n\n${error.message || 'Error desconocido'}\n\nPrueba con otro enlace.`
        });
      }
    }
  }
};

// Alias para comandos
module.exports.commands.yt = module.exports.commands.ytmp3;
module.exports.commands.youtube = module.exports.commands.ytmp4;
module.exports.commands.tt = module.exports.commands.tiktok;
module.exports.commands.instagram = module.exports.commands.ig;
module.exports.commands.pin = module.exports.commands.pinterest;