const fs = require("fs");
const path = require("path");
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const NodeCache = require("node-cache");
const Pino = require("pino");
const qrcode = require("qrcode-terminal");

// Configuración del bot
const BOT_CONFIG = {
  prefix: '.',
  name: 'Futaba Rio',
  version: '3.0',
  ownerNumber: '584142404632@s.whatsapp.net'
};

// Configuración de reconexión
const MAX_RETRIES = 5;
const INITIAL_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_DELAY = 60000;

// Configuración de caches
const logger = Pino({ level: "fatal" });
const msgRetryCounterCache = new NodeCache({
  stdTTL: 1800,
  deleteOnExpire: true,
  useClones: false
});

// ==================== INTERFAZ MEJORADA ====================

function showQR(qr) {
  console.clear();
  
  console.log('\x1b[38;5;213m' + `
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ███████╗██╗   ██╗████████╗ █████╗ ██████╗  █████╗         ║
  ║   ██╔════╝██║   ██║╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗        ║
  ║   █████╗  ██║   ██║   ██║   ███████║██████╔╝███████║        ║
  ║   ██╔══╝  ██║   ██║   ██║   ██╔══██║██╔══██╗██╔══██║        ║
  ║   ██║     ╚██████╔╝   ██║   ██║  ██║██████╔╝██║  ██║        ║
  ║   ╚═╝      ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝        ║
  ║                                                              ║
  ║              [ v3.0 • FUTABA RIO BOT • ]                     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  ` + '\x1b[0m');
  
  console.log('\n\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m');
  console.log('\x1b[1;95m' + '                  🔐 CONEXIÓN WHATSAPP REQUERIDA' + '\x1b[0m');
  console.log('\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m\n');
  
  console.log('\x1b[1;97m' + '📱 ' + '\x1b[1;93m' + 'PASOS PARA CONECTAR:' + '\x1b[0m');
  console.log('\x1b[38;5;245m' + ' 1. 📲 Abre WhatsApp en tu teléfono');
  console.log(' 2. ⋮  Toca el menú (tres puntos)');
  console.log(' 3. 🔗 Selecciona "Dispositivos vinculados"');
  console.log(' 4. ➕ Toca "Vincular un dispositivo"');
  console.log(' 5. 📷 Escanea el código QR' + '\x1b[0m');
  
  console.log('\n\x1b[1;32m' + '🔄 Generando código QR...\n' + '\x1b[0m');
  
  qrcode.generate(qr, { small: true }, function (qrcode) {
    console.log('\x1b[48;5;232m' + qrcode + '\x1b[0m');
    
    console.log('\n\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m');
    console.log('\x1b[1;33m' + '💡 Este código expira en 30 segundos' + '\x1b[0m');
    console.log('\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m\n');
  });
}

function showConnectedScreen(sock) {
  console.clear();
  
  console.log('\x1b[38;5;46m' + `
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ██████╗  ██████╗ ████████╗    ██████╗ ██████╗ ███╗   ██╗  ║
  ║   ██╔══██╗██╔═══██╗╚══██╔══╝   ██╔════╝██╔═══██╗████╗  ██╗  ║
  ║   ██████╔╝██║   ██║   ██║█████╗██║     ██║   ██║██╔██╗ ██║  ║
  ║   ██╔═══╝ ██║   ██║   ██║╚════╝██║     ██║   ██║██║╚██╗██║  ║
  ║   ██║     ╚██████╔╝   ██║      ╚██████╗╚██████╔╝██║ ╚████║  ║
  ║   ╚═╝      ╚═════╝    ╚═╝       ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  ` + '\x1b[0m');
  
  console.log('\n\x1b[1;92m' + '═'.repeat(70) + '\x1b[0m');
  console.log('\x1b[1;96m' + '                  ✅ CONEXIÓN ESTABLECIDA' + '\x1b[0m');
  console.log('\x1b[1;92m' + '═'.repeat(70) + '\x1b[0m\n');
  
  console.log('\x1b[1;97m' + '📊 ' + '\x1b[1;96m' + 'INFORMACIÓN DEL SISTEMA' + '\x1b[0m');
  console.log('\x1b[38;5;245m' + '┌──────────────────────────────────────────────────────────┐');
  console.log(`│ \x1b[1;93m🤖 Bot:\x1b[0m \x1b[38;5;255m${BOT_CONFIG.name}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m📱 Número:\x1b[0m \x1b[38;5;255m${sock.user?.id || 'No disponible'}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m⚡ Versión:\x1b[0m \x1b[38;5;255mv${BOT_CONFIG.version}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m💡 Prefijo:\x1b[0m \x1b[38;5;255m${BOT_CONFIG.prefix}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m👤 Usuario:\x1b[0m \x1b[38;5;255m${sock.user?.name || 'No configurado'}\x1b[38;5;245m`);
  console.log('│                                                    │');
  console.log(`│ \x1b[1;92m🟢 Estado:\x1b[0m \x1b[38;5;46mOPERATIVO\x1b[38;5;245m`);
  console.log('└──────────────────────────────────────────────────────────┘' + '\x1b[0m');
  
  console.log('\n\x1b[1;92m' + '═'.repeat(70) + '\x1b[0m');
  console.log('\x1b[1;96m' + '           ✨ ESCRIBE .help PARA VER LOS COMANDOS' + '\x1b[0m');
  console.log('\x1b[1;92m' + '═'.repeat(70) + '\x1b[0m\n');
  
  const now = new Date();
  console.log('\x1b[38;5;244m' + `🕐 Conectado el: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}` + '\x1b[0m\n');
}

// ==================== CARGAR HANDLERS ====================

function loadHandlers() {
  const handlers = {};
  const handlersDir = path.join(__dirname, 'handlers');
  
  // Verificar si existe la carpeta handler
  if (!fs.existsSync(handlersDir)) {
    console.log('\x1b[1;91m❌ ERROR: No se encontró la carpeta "handler/"\x1b[0m');
    console.log('\x1b[1;93m   Creando estructura de carpetas...\x1b[0m');
    
    // Crear la carpeta handler
    fs.mkdirSync(handlersDir, { recursive: true });
    
    // Crear los handlers básicos si no existen
    const basicHandlers = {
      'general.js': `module.exports = {
  name: 'General',
  description: 'Comandos generales del bot',
  
  commands: {
    'ping': async (sock, message, args, isGroup) => {
      const start = Date.now();
      const end = Date.now();
      const latency = end - start;
      
      await sock.sendMessage(message.key.remoteJid, { 
        text: \`🏓 *Pong!*\\n📡 Latencia: \${latency}ms\\n🕐 \${new Date().toLocaleTimeString('es-ES')}\` 
      });
    },
    
    'help': async (sock, message, args, isGroup) => {
      const helpText = \`
╔══════════════════════════╗
         •  『🌸 *Futaba Rio* 🌸』  •
╚══════════════════════════╝

📋 *Generales*
• .help - Esta ayuda
• .ping - Verificación conexión
• .time - Hora actual
• .calc [expresión] - Calculadora

👥 *Grupo*
• .infog - Información del grupo
• .list - Listar participantes
• .promote @usuario - Dar admin
• .demote @usuario - Quitar admin
• .ban @usuario - Expulsar usuario
• .add número - Agregar usuario

🔧 *Owner*
• .setadmin @usuario - Dar permisos admin
• .setuser @usuario - Quitar permisos

📥 *Descargas*
• .tiktok [url] - Descargar TikTok
• .ig [url] - Descargar Instagram\`;
      
      await sock.sendMessage(message.key.remoteJid, { text: helpText });
    },
    
    'time': async (sock, message, args, isGroup) => {
      const now = new Date();
      const timeText = \`🕐 *HORA ACTUAL*\\n\\n\` +
                     \`📅 *Fecha:* \${now.toLocaleDateString('es-ES', { 
                       weekday: 'long', 
                       year: 'numeric', 
                       month: 'long', 
                       day: 'numeric' 
                     })}\\n\` +
                     \`⏰ *Hora:* \${now.toLocaleTimeString('es-ES')}\\n\` +
                     \`🌍 *Zona:* \${Intl.DateTimeFormat().resolvedOptions().timeZone}\`;
      
      await sock.sendMessage(message.key.remoteJid, { text: timeText });
    },
    
    'calc': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: \`❌ *Uso:* \\\`.calc [expresión]\\\`\\nEjemplo: \\\`.calc 2+2*3\\\`\` 
        });
        return;
      }
      
      try {
        const sanitized = args.replace(/[^0-9+\\-*/().%^&|<>!= ]/g, '');
        const result = eval(sanitized);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: \`🧮 *CALCULADORA*\\n\\n\` +
                \`📝 *Expresión:* \${args}\\n\` +
                \`✅ *Resultado:* \${result}\` 
        });
      } catch (error) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ *Error en cálculo*\\nVerifica la expresión matemática.' 
        });
      }
    }
  }
};`,
      
      'group.js': `module.exports = {
  name: 'Grupo',
  description: 'Comandos para administrar grupos',
  
  commands: {
    'infog': async (sock, message, args, isGroup) => {
      if (!isGroup) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ Este comando solo funciona en grupos' 
        });
        return;
      }
      
      const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
      
      const infoText = \`📊 *INFORMACIÓN DEL GRUPO*

👥 *Nombre:* \${groupMetadata.subject}
🆔 *ID:* \${groupMetadata.id}
👑 *Creador:* \${groupMetadata.owner}
📅 *Creado:* \${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
👥 *Participantes:* \${groupMetadata.participants.length}
🔒 *Estado:* \${groupMetadata.restrict ? '🔐 Restringido' : '🔓 Abierto'}
🌐 *Anuncios:* \${groupMetadata.announce ? '📢 Activado' : '🔇 Desactivado'}\`;
      
      await sock.sendMessage(message.key.remoteJid, { text: infoText });
    },
    
    'list': async (sock, message, args, isGroup) => {
      if (!isGroup) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ Este comando solo funciona en grupos' 
        });
        return;
      }
      
      const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
      const participants = groupMetadata.participants;
      
      let listText = \`📋 *LISTA DE PARTICIPANTES* (\${participants.length})\\n\\n\`;
      
      participants.forEach((participant, index) => {
        const adminBadge = participant.admin ? '👑 ' : '';
        listText += \`\${index + 1}. \${adminBadge}\${participant.id.split('@')[0]}\\n\`;
      });
      
      await sock.sendMessage(message.key.remoteJid, { text: listText });
    }
  }
};`,
      
      'downloader.js': `module.exports = {
  name: 'Descargas',
  description: 'Comandos para descargar contenido',
  
  commands: {
    'tiktok': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ *Uso:* .tiktok [url]\\nEjemplo: .tiktok https://tiktok.com/@usuario/video/123456' 
        });
        return;
      }
      
      await sock.sendMessage(message.key.remoteJid, { 
        text: '📥 *PROCESANDO TIKTOK...*\\n\\nDescarga en progreso...' 
      });
      
      // Aquí iría la lógica de descarga de TikTok
      // Por ahora es solo un placeholder
      await sock.sendMessage(message.key.remoteJid, { 
        text: '⚠️ *FUNCIÓN EN DESARROLLO*\\n\\nLa descarga de TikTok está en desarrollo. Próximamente disponible.' 
      });
    },
    
    'ig': async (sock, message, args, isGroup) => {
      if (!args) {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ *Uso:* .ig [url]\\nEjemplo: .ig https://instagram.com/p/ABC123' 
        });
        return;
      }
      
      await sock.sendMessage(message.key.remoteJid, { 
        text: '📥 *PROCESANDO INSTAGRAM...*\\n\\nDescarga en progreso...' 
      });
      
      // Aquí iría la lógica de descarga de Instagram
      // Por ahora es solo un placeholder
      await sock.sendMessage(message.key.remoteJid, { 
        text: '⚠️ *FUNCIÓN EN DESARROLLO*\\n\\nLa descarga de Instagram está en desarrollo. Próximamente disponible.' 
      });
    }
  }
};`
    };
    
    // Crear los archivos de handlers
    for (const [fileName, content] of Object.entries(basicHandlers)) {
      const filePath = path.join(handlersDir, fileName);
      fs.writeFileSync(filePath, content);
      console.log(`\x1b[1;92m📝 Handler creado: ${fileName}\x1b[0m`);
    }
  }
  
  // Cargar todos los handlers disponibles
  try {
    const handlerFiles = fs.readdirSync(handlersDir).filter(file => file.endsWith('.js'));
    
    if (handlerFiles.length === 0) {
      console.log('\x1b[1;91m❌ No se encontraron handlers en la carpeta handler/\x1b[0m');
      return handlers;
    }
    
    console.log('\x1b[1;97m📂 Cargando handlers...\x1b[0m');
    
    let totalCommands = 0;
    let loadedHandlers = 0;
    
    for (const file of handlerFiles) {
      try {
        const handlerPath = path.join(handlersDir, file);
        const handlerName = file.replace('.js', '');
        
        // Limpiar cache para recarga en caliente
        delete require.cache[require.resolve(handlerPath)];
        
        const handlerModule = require(handlerPath);
        
        // Manejar diferentes formatos de exportación
        let handler = handlerModule;
        if (handlerModule && handlerModule.default) {
          handler = handlerModule.default;
        }
        
        if (handler && handler.commands && typeof handler.commands === 'object') {
          handlers[handlerName] = handler;
          loadedHandlers++;
          
          const commandCount = Object.keys(handler.commands).length;
          totalCommands += commandCount;
          
          console.log(`\x1b[1;92m✅ Handler: ${handlerName}\x1b[0m (${commandCount} comandos)`);
        } else {
          console.log(`\x1b[1;91m❌ Handler ${handlerName} tiene formato incorrecto\x1b[0m`);
        }
        
      } catch (error) {
        console.error(`\x1b[1;91m❌ Error cargando ${file}:\x1b[0m`, error.message);
      }
    }
    
    // Mostrar resumen
    console.log('\n\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m');
    console.log(`\x1b[1;95m📊 RESUMEN: ${loadedHandlers} handlers • ${totalCommands} comandos\x1b[0m`);
    
    if (loadedHandlers > 0) {
      console.log('\x1b[1;96m📋 HANDLERS CARGADOS:\x1b[0m');
      for (const [handlerName, handler] of Object.entries(handlers)) {
        console.log(`\x1b[1;93m• ${handlerName}:\x1b[0m ${handler.description || 'Sin descripción'}`);
        console.log(`  📝 Comandos: ${Object.keys(handler.commands).join(', ')}`);
      }
    }
    
    console.log('\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m\n');
    
  } catch (error) {
    console.error('\x1b[1;91m❌ Error accediendo al directorio handler:\x1b[0m', error.message);
  }
  
  return handlers;
}

// ==================== MANEJAR COMANDOS ====================

async function handleCommand(sock, message, body, isGroup, handlers) {
  const args = body.slice(BOT_CONFIG.prefix.length).trim().split(' ');
  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1).join(' ');
  
  // Buscar el comando en todos los handlers
  for (const handlerName in handlers) {
    const handler = handlers[handlerName];
    
    if (handler.commands && handler.commands[command]) {
      console.log(`\x1b[1;92m🎯 Comando ejecutado: ${command} (Handler: ${handlerName})\x1b[0m`);
      
      try {
        await handler.commands[command](sock, message, commandArgs, isGroup);
        return;
      } catch (error) {
        console.error(`\x1b[1;91m❌ Error ejecutando ${command}:\x1b[0m`, error);
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *Error al ejecutar* .${command}\n\nDetalle: ${error.message}` 
        });
      }
      return;
    }
  }
  
  // Comando no encontrado - SIMPLEMENTE IGNORAR (sin mensaje al usuario)
  console.log(`\x1b[1;90m⚠️  Comando ignorado: ${command}\x1b[0m`);
  // No envía ningún mensaje, solo lo registra en consola
}

// ==================== CÓDIGO PRINCIPAL ====================

(async () => {
  console.clear();
  console.log('\x1b[38;5;213m' + `
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ███████╗██╗   ██╗████████╗ █████╗ ██████╗  █████╗         ║
  ║   ██╔════╝██║   ██║╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗        ║
  ║   █████╗  ██║   ██║   ██║   ███████║██████╔╝███████║        ║
  ║   ██╔══╝  ██║   ██║   ██║   ██╔══██║██╔══██╗██╔══██║        ║
  ║   ██║     ╚██████╔╝   ██║   ██║  ██║██████╔╝██║  ██║        ║
  ║   ╚═╝      ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝        ║
  ║                                                              ║
  ║              [ v3.0 • FUTABA RIO BOT • BY SKY ]              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  ` + '\x1b[0m');
  
  console.log('\n\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m');
  console.log('\x1b[1;95m' + '                  🌸 INICIALIZANDO SISTEMA 🌸' + '\x1b[0m');
  console.log('\x1b[1;36m' + '═'.repeat(70) + '\x1b[0m\n');

  console.log('\x1b[1;97m' + '📋 ' + '\x1b[1;96m' + 'INFORMACIÓN DE CONFIGURACIÓN:' + '\x1b[0m');
  console.log('\x1b[38;5;245m' + '┌──────────────────────────────────────────────────────────┐');
  console.log(`│ \x1b[1;93m🤖 Bot:\x1b[0m \x1b[38;5;255m${BOT_CONFIG.name}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m👑 Owner:\x1b[0m \x1b[38;5;255m${BOT_CONFIG.ownerNumber}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m⚡ Versión:\x1b[0m \x1b[38;5;255mv${BOT_CONFIG.version}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m💡 Prefijo:\x1b[0m \x1b[38;5;255m${BOT_CONFIG.prefix}\x1b[38;5;245m`);
  console.log(`│ \x1b[1;93m🔧 Plataforma:\x1b[0m \x1b[38;5;255mNode.js ${process.version}\x1b[38;5;245m`);
  console.log('└──────────────────────────────────────────────────────────┘' + '\x1b[0m');
  
  console.log('\n');

  // Cargar handlers
  const handlers = loadHandlers();

  // Verificar si hay handlers cargados
  if (Object.keys(handlers).length === 0) {
    console.log('\x1b[1;91m⚠️  ADVERTENCIA: No se cargaron handlers\x1b[0m');
    console.log('\x1b[1;93m   El bot funcionará sin comandos\x1b[0m\n');
  }

  // Conectar al WhatsApp
  const { state, saveCreds } = await useMultiFileAuthState("./sessions");
  let retries = 0;
  let qrGenerated = false;

  async function connect() {
    try {
      const { version } = await fetchLatestBaileysVersion();
      
      console.log("\n\x1b[1;36m🔄 Iniciando conexión con WhatsApp...\x1b[0m");
      
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        version,
        printQRInTerminal: false,
        msgRetryCounterCache,
        syncFullHistory: false,
        fireInitQueries: true,
        defaultQueryTimeoutMs: 60000,
        generateHighQualityLinkPreview: true,
      });

      // Manejar eventos de conexión
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !qrGenerated) {
          qrGenerated = true;
          console.log('\n\x1b[1;32m🔄 Generando código de conexión...\x1b[0m');
          showQR(qr);
          
          setTimeout(() => {
            if (connection !== "open") {
              qrGenerated = false;
              console.log('\n\x1b[1;33m🔄 El código QR ha expirado. Esperando nuevo...\x1b[0m');
            }
          }, 30000);
        }

        if (connection === "connecting") {
          console.log("\x1b[1;36m🔄 Conectando...\x1b[0m");
        } else if (connection === "open") {
          qrGenerated = false;
          retries = 0;
          showConnectedScreen(sock);
        } else if (connection === "close") {
          await handleDisconnect(lastDisconnect?.error);
        }
      });

      // Actualizar credenciales
      sock.ev.on("creds.update", saveCreds);

      // Manejar mensajes
      sock.ev.on("messages.upsert", async (m) => {
        if (m.type !== 'notify') return;
        
        const message = m.messages[0];
        if (!message.message) return;
        
        const body = message.message.conversation || 
                     message.message.extendedTextMessage?.text || 
                     message.message.imageMessage?.caption ||
                     message.message.videoMessage?.caption || '';
        
        const groupId = message.key.remoteJid;
        const isGroup = groupId?.includes('@g.us');
        const senderId = message.key.participant || groupId;

        if (body && body.startsWith(BOT_CONFIG.prefix)) {
          console.log(`\x1b[1;97m📩 ${isGroup ? '📢 Grupo' : '👤 Privado'} - De: ${senderId}\x1b[0m`);
          
          // Procesar comandos
          await handleCommand(sock, message, body, isGroup, handlers);
        }
      });

      return sock;
    } catch (error) {
      console.error("\x1b[1;91m❌ Error en la conexión:\x1b[0m", error.message);
      await handleDisconnect(error);
    }
  }

  async function handleDisconnect(error) {
    const boomError = new Boom(error);
    const reason = boomError.output?.statusCode || DisconnectReason.connectionLost;
    
    console.log(`\n\x1b[1;91m❌ Desconectado: ${reason}\x1b[0m`);

    if (retries < MAX_RETRIES) {
      const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, retries), MAX_RECONNECT_DELAY);
      retries++;
      
      console.log(`\x1b[1;33m🔄 Reconectando en ${delay / 1000} segundos... (Intento ${retries}/${MAX_RETRIES})\x1b[0m\n`);
      
      setTimeout(() => {
        console.log('\x1b[1;36m🔄 Iniciando reconexión...\x1b[0m');
        connect();
      }, delay);
    } else {
      console.log('\x1b[1;91m❌ Máximo número de reconexiones alcanzado. Cerrando...\x1b[0m');
      process.exit(1);
    }
  }

  // Iniciar conexión
  await connect();
})();