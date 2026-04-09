// handlers/toimg.js
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

// Función para desencapsular mensajes
const unwrap = (m) => {
  if (!m) return null;
  let n = m;
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n = n.viewOnceMessage?.message ||
        n.viewOnceMessageV2?.message ||
        n.viewOnceMessageV2Extension?.message ||
        n.ephemeralMessage?.message;
  }
  return n;
};

module.exports = {
  name: 'ToImage',
  description: 'Convierte stickers en imágenes',
  
  commands: {
    'toimg': async (sock, message, args, isGroup) => {
      try {
        // Verificar si es respuesta a un sticker
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMessage) {
          await sock.sendMessage(message.key.remoteJid, { 
            text: '⚠️ *DEBES RESPONDER A UN STICKER*\n\n' +
                  'Ejemplo: .toimg (respondiendo a un sticker)'
          });
          return;
        }
        
        // Desencapsular el mensaje
        const inner = unwrap(quotedMessage);
        const sticker = inner?.stickerMessage;
        
        if (!sticker) {
          await sock.sendMessage(message.key.remoteJid, { 
            text: '❌ *NO SE ENCONTRÓ UN STICKER*\n\n' +
                  'Asegúrate de responder a un sticker válido.'
          });
          return;
        }
        
        // Reacción de procesando
        try {
          await sock.sendMessage(message.key.remoteJid, {
            react: { text: '⏳', key: message.key }
          });
        } catch (e) {
          console.log('No se pudo enviar reacción');
        }
        
        console.log(`🔄 Procesando sticker para: ${message.key.remoteJid}`);
        
        // Informar al usuario
        const processingMsg = await sock.sendMessage(message.key.remoteJid, { 
          text: '🔄 *PROCESANDO STICKER...*\n\nConvirtiendo a imagen, por favor espera...'
        });
        
        try {
          // Descargar el sticker - FORMA CORRECTA para baileys
          let stickerBuffer;
          
          if (sticker) {
            // Método 1: Usar downloadAndSaveMediaMessage si está disponible
            if (typeof sock.downloadAndSaveMediaMessage === 'function') {
              const tempPath = path.join(__dirname, '..', 'tmp', `sticker_${Date.now()}.webp`);
              await sock.downloadAndSaveMediaMessage(sticker, {}, tempPath);
              stickerBuffer = await fs.readFile(tempPath);
              await fs.unlink(tempPath).catch(() => {});
            } 
            // Método 2: Usar downloadContentFromMessage
            else if (typeof sock.downloadContentFromMessage === 'function') {
              const stream = await sock.downloadContentFromMessage(sticker, 'sticker');
              const chunks = [];
              for await (const chunk of stream) {
                chunks.push(chunk);
              }
              stickerBuffer = Buffer.concat(chunks);
            }
            // Método 3: Usar la función interna de baileys
            else {
              // Importar dinámicamente la función de baileys
              const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
              const stream = await downloadContentFromMessage(sticker, 'sticker');
              const chunks = [];
              for await (const chunk of stream) {
                chunks.push(chunk);
              }
              stickerBuffer = Buffer.concat(chunks);
            }
          }
          
          if (!stickerBuffer || stickerBuffer.length === 0) {
            throw new Error('No se pudo descargar el sticker');
          }
          
          // Intentar convertir con Sharp
          let imageBuffer;
          try {
            imageBuffer = await sharp(stickerBuffer)
              .png()
              .toBuffer();
            
            console.log(`✅ Sticker convertido a PNG: ${imageBuffer.length} bytes`);
          } catch (sharpError) {
            console.log('Sharp falló, usando webp original:', sharpError.message);
            imageBuffer = stickerBuffer; // Usar el webp original
          }
          
          // Eliminar mensaje de procesamiento
          try {
            if (processingMsg?.key) {
              await sock.sendMessage(message.key.remoteJid, {
                delete: processingMsg.key
              });
            }
          } catch (e) {}
          
          // Enviar la imagen convertida
          await sock.sendMessage(message.key.remoteJid, {
            image: imageBuffer,
            caption: `🖼️ *STICKER CONVERTIDO*\n\n` +
                     `✅ ¡Conversión exitosa!\n` +
                     `📏 Tamaño: ${Math.round(imageBuffer.length / 1024)} KB\n` +
                     `🎨 Formato: ${imageBuffer === stickerBuffer ? 'WEBP (original)' : 'PNG'}\n` +
                     `✨ Comando: .toimg`
          });
          
          // Reacción de éxito
          try {
            await sock.sendMessage(message.key.remoteJid, {
              react: { text: '✅', key: message.key }
            });
          } catch (e) {}
          
        } catch (downloadError) {
          console.error('Error descargando/convirtiendo:', downloadError);
          
          // Eliminar mensaje de procesamiento
          try {
            if (processingMsg?.key) {
              await sock.sendMessage(message.key.remoteJid, {
                delete: processingMsg.key
              });
            }
          } catch (e) {}
          
          await sock.sendMessage(message.key.remoteJid, { 
            text: '❌ *ERROR EN LA CONVERSIÓN*\n\n' +
                  'No se pudo procesar el sticker.\n' +
                  'Posibles causas:\n' +
                  '• El sticker está corrupto\n' +
                  '• Es un formato no soportado\n' +
                  '• Error de descarga'
          });
          
          try {
            await sock.sendMessage(message.key.remoteJid, {
              react: { text: '❌', key: message.key }
            });
          } catch (e) {}
        }
        
      } catch (error) {
        console.error('❌ Error general en toimg:', error);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ *ERROR INESPERADO*\n\n' + error.message
        });
      }
    },
    
    'stickerimg': async (sock, message, args, isGroup) => {
      // Alias del comando
      await module.exports.commands.toimg(sock, message, args, isGroup);
    }
  }
};