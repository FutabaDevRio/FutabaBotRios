// handlers/admin.js
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  name: 'Admin',
  description: 'Comandos de administración del servidor',
  requiresOwner: true,
  
  commands: {
    'clear': async (sock, message, args, isGroup) => {
      try {
        const chatId = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;
        
        // Verificar si es el owner usando global.BOT_CONFIG
        const ownerNumber = global.BOT_CONFIG?.ownerNumber || '584142404632@s.whatsapp.net';
        
        if (!userId.includes(ownerNumber.split('@')[0])) {
          await sock.sendMessage(chatId, { 
            text: '❌ *Comando exclusivo para el owner*' 
          });
          return;
        }
        
        // Reacción
        await sock.sendMessage(chatId, {
          react: { text: '🧹', key: message.key }
        });
        
        // Mensaje inicial
        const processingMsg = await sock.sendMessage(chatId, { 
          text: '🧹 *LIMPIANDO SERVIDOR...*\n\nPor favor espera...' 
        });
        
        let deletedFiles = 0;
        let freedSpace = 0;
        
        // ==================== LIMPIAR CACHE DE NODE ====================
        try {
          const cacheCount = Object.keys(require.cache).length;
          // Mantener módulos esenciales
          Object.keys(require.cache).forEach(key => {
            if (!key.includes('node_modules') && 
                !key.includes('/bin/') && 
                !key.includes('/lib/')) {
              delete require.cache[key];
            }
          });
          console.log(`🧹 Cache limpiado: ${cacheCount} módulos`);
        } catch (e) {
          console.log('⚠️ Error limpiando cache:', e.message);
        }
        
        // ==================== LIMPIAR CARPETA TMP ====================
        const tmpDir = path.join(__dirname, '..', 'tmp');
        
        if (fs.existsSync(tmpDir)) {
          try {
            const files = fs.readdirSync(tmpDir);
            
            for (const file of files) {
              try {
                const filePath = path.join(tmpDir, file);
                const stats = fs.statSync(filePath);
                
                // Eliminar TODO sin preguntar
                fs.unlinkSync(filePath);
                deletedFiles++;
                freedSpace += stats.size;
              } catch (fileError) {
                // Ignorar errores en archivos individuales
              }
            }
            
            console.log(`🗑️ TMP limpiado: ${files.length} archivos`);
          } catch (tmpError) {
            console.log('⚠️ Error limpiando tmp:', tmpError.message);
          }
        } else {
          // Crear carpeta tmp si no existe
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        // ==================== LIMPIAR SESSIONES TEMPORALES ====================
        const sessionsDir = path.join(__dirname, '..', 'sessions');
        
        if (fs.existsSync(sessionsDir)) {
          try {
            const sessionFiles = fs.readdirSync(sessionsDir);
            
            for (const file of sessionFiles) {
              // Eliminar archivos .temp, .tmp, .json antiguos
              if (file.endsWith('.temp') || file.endsWith('.tmp') || 
                  (file.endsWith('.json') && !file.includes('creds'))) {
                try {
                  const filePath = path.join(sessionsDir, file);
                  const stats = fs.statSync(filePath);
                  
                  // Eliminar si tiene más de 1 hora
                  if (Date.now() - stats.mtimeMs > 3600000) {
                    fs.unlinkSync(filePath);
                    deletedFiles++;
                    freedSpace += stats.size;
                  }
                } catch (e) {}
              }
            }
          } catch (sessError) {
            console.log('⚠️ Error limpiando sessions:', sessError.message);
          }
        }
        
        // ==================== MENSAJE FINAL ====================
        // Eliminar mensaje de procesamiento
        try {
          if (processingMsg?.key) {
            await sock.sendMessage(chatId, {
              delete: processingMsg.key
            });
          }
        } catch (e) {}
        
        const resultText = `
╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
         🧹 *LIMPIADO*
╰── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╯

✅ *Operaciones completadas:*
• Cache Node.js: Limpiado
• Archivos temporales: ${deletedFiles} eliminados
• Espacio liberado: ${(freedSpace / 1024 / 1024).toFixed(2)} MB

💾 *Recomendaciones:*
• Usa .clear regularmente
• Monitorea el espacio con .space
• Elimina archivos grandes manualmente

╰───────────── ⋅ ⋅ ────────────╯
        *Futaba Rio*
`;
        
        await sock.sendMessage(chatId, { 
          text: resultText 
        });
        
        // Reacción final
        await sock.sendMessage(chatId, {
          react: { text: '✅', key: message.key }
        });
        
        console.log(`✅ Clear ejecutado por ${userId}: ${deletedFiles} archivos, ${(freedSpace / 1024 / 1024).toFixed(2)}MB`);
        
      } catch (error) {
        console.error('❌ Error en clear:', error);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR EN LIMPIEZA*\n\n${error.message}` 
        });
      }
    },
    
    'space': async (sock, message, args, isGroup) => {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Obtener espacio en disco
        const { stdout } = await execPromise('df -h . 2>/dev/null || echo "No se pudo obtener info"');
        
        const spaceText = `
╭── ⋅ ⋅ ── ✦ ── ⋅ ⋅ ──╮
        💾 *ESPACIO*
╰── ⋅ ⋅ ── ⋅ ⋅ ──╯

${stdout.split('\n').slice(0, 3).join('\n')}

📁 *Carpetas temporales:*
• /tmp - ${fs.existsSync(path.join(__dirname, '..', 'tmp')) ? 'Activa' : 'No existe'}
• /sessions - ${fs.existsSync(path.join(__dirname, '..', 'sessions')) ? 'Activa' : 'No existe'}

💡 *Usa .clear para liberar espacio*

╰───────────── ⋅ ⋅ ────────────╯
        *Futaba Rio*
`;
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: spaceText 
        });
        
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ Error obteniendo espacio' 
        });
      }
    },
    
    'clean': async (sock, message, args, isGroup) => {
      // Alias de clear
      await module.exports.commands.clear(sock, message, args, isGroup);
    }
  }
};