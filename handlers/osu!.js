const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Ruta del archivo de la clave api
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'osu_config.json');

//  Funciones de configuracion

function loadConfig() {
    try {
        fs.ensureDirSync(path.dirname(CONFIG_FILE));
        if (fs.existsSync(CONFIG_FILE)) {
            return fs.readJSONSync(CONFIG_FILE);
        } else {
            const defaultConfig = { apiKey: '' };
            fs.writeJSONSync(CONFIG_FILE, defaultConfig, { spaces: 2 });
            return defaultConfig;
        }
    } catch (e) {
        console.error('Error cargando osu_config:', e);
        return { apiKey: '' };
    }
}

function saveConfig(config) {
    try {
        fs.ensureDirSync(path.dirname(CONFIG_FILE));
        fs.writeJSONSync(CONFIG_FILE, config, { spaces: 2 });
        return true;
    } catch (e) {
        console.error('Error guardando osu_config:', e);
        return false;
    }
}

// Api V1

async function getOsuUser(username, mode = 0, apiKey) {
    try {
        const res = await axios.get('https://osu.ppy.sh/api/get_user', {
            params: {
                k: apiKey,
                u: username,
                m: mode,
                type: 'string'
            }
        });
        return res.data[0] || null;
    } catch (e) {
        console.error('getOsuUser error:', e.message);
        return null;
    }
}

async function getOsuBest(userId, mode = 0, limit = 1, apiKey) {
    try {
        const res = await axios.get('https://osu.ppy.sh/api/get_user_best', {
            params: {
                k: apiKey,
                u: userId,
                m: mode,
                type: 'id',
                limit
            }
        });
        return res.data || [];
    } catch (e) {
        console.error('getOsuBest error:', e.message);
        return [];
    }
}

async function getBeatmapById(beatmapId, apiKey) {
    try {
        const res = await axios.get('https://osu.ppy.sh/api/get_beatmaps', {
            params: {
                k: apiKey,
                b: beatmapId
            }
        });
        return res.data[0] || null;
    } catch (e) {
        console.error('getBeatmapById error:', e.message);
        return null;
    }
}

// idk utilidades

function modsToString(modsBitmask) {
    const map = {
        1: 'NF', 2: 'EZ', 4: 'TD', 8: 'HD', 16: 'HR', 32: 'SD', 64: 'DT', 128: 'RX', 256: 'HT', 512: 'NC',
        1024: 'FL', 2048: 'AU', 4096: 'SO', 8192: 'AP', 16384: 'PF', 32768: 'K4', 65536: 'K5', 131072: 'K6',
        262144: 'K7', 524288: 'K8', 1048576: 'FI', 2097152: 'RN', 4194304: 'CN', 8388608: 'TP', 16777216: 'K9',
        33554432: 'KC', 67108864: 'K1', 134217728: 'K3', 268435456: 'K2', 536870912: 'SV2', 1073741824: 'MR'
    };
    let result = '';
    for (const [bit, mod] of Object.entries(map)) {
        if (modsBitmask & bit) result += mod;
    }
    return result || 'NM';
}

const MODE_NAMES = ['osu!', 'Taiko', 'Catch the Beat', 'osu!mania'];

function getModeFromArg(arg) {
    const lower = arg.toLowerCase();
    if (['taiko', '1'].includes(lower)) return 1;
    if (['ctb', 'catch', '2'].includes(lower)) return 2;
    if (['mania', '3'].includes(lower)) return 3;
    return 0;
}

// Comandos

const commands = {};

// .osuhelp
commands.osuhelp = async (sock, message, args, isGroup, senderJid) => {
    const helpText = `
╔════════════════════════════════╗
         🔐 CÓMO OBTENER TU API KEY DE OSU!
╚════════════════════════════════╝

📌 **Pasos para obtener tu API key:**

1. Inicia sesión en https://osu.ppy.sh
2. Ve a tu perfil → Configuración (⚙️)
3. Desplázate hasta el final de la página
4. En la sección "API Access", haz clic en "New API Key"
5. Copia la clave generada (ej: 4JIJEIOWQJDOIQWJDO02219)

⚠️ **ADVERTENCIAS IMPORTANTES:**

• 🔒 **Esta clave es PRIVADA** como tu contraseña no la registres en grupos publicos.
• ❌ No la compartas con nadie.
• 🚫 Cualquier Mal uso de esta no nos hacemos responsables.
• 👤 Eres responsable de tu cuenta, ¡protégela!

📝 **Para registrar tu clave en el bot:**

\`.osuapikey <tu_clave_aqui>\`

Ejemplo:
\`.osuapikey ( OSU KEY )\`

✅ La clave se guardará localmente en \`data/osu_config.json\`

🔍 **Verificar clave registrada:**
\`.osuapikey\` (sin argumentos, muestra si hay clave registrada)

💡 **Después de registrar la clave**, ya puedes usar:
\`.osu <nombre_de_usuario>\`

¡Disfruta del bot! 🎵
    `;
    await sock.sendMessage(message.key.remoteJid, { text: helpText });
};

//.osuapikey [clave
commands.osuapikey = async (sock, message, args, isGroup, senderJid) => {
    const config = loadConfig();

    // Si no se pasa clave, mostrar estado actual
    if (!args) {
        const hasKey = config.apiKey && config.apiKey.length > 0;
        const status = hasKey ? '✅ Clave API registrada' : '❌ No hay clave API registrada';
        const advice = hasKey ? '' : '\n\nUsa `.osuapikey <tu_clave>` para registrarla.';
        await sock.sendMessage(message.key.remoteJid, {
            text: `🔐 *Estado de API Key*\n\n${status}${advice}`
        });
        return;
    }

    // Guardar la nueva clave
    const newKey = args.trim();
    if (newKey.length < 10) {
        await sock.sendMessage(message.key.remoteJid, {
            text: '❌ La clave parece demasiado corta. Verifica que sea correcta.'
        });
        return;
    }

    // Confirmación de seguridad
    const confirmMsg = await sock.sendMessage(message.key.remoteJid, {
        text: `⚠️ *¿Estás seguro?*\n\nVas a registrar una API key privada.\n\n` +
              `📌 La clave se guardará en \`data/osu_config.json\`.\n` +
              `🔒 Solo tú deberías tener acceso a este archivo.\n\n` +
              `Responde con *SI* para confirmar, o *NO* para cancelar.\n` +
              `(Tienes 30 segundos para responder)`
    });

    // Esperar respuesta del usuario
    const response = await new Promise((resolve) => {
        const listener = async (m) => {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            const body = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || '';
            const sender = msg.key.participant || msg.key.remoteJid;
            
            if (sender === senderJid) {
                resolve(body.trim().toUpperCase());
            }
        };
        
        sock.ev.on('messages.upsert', listener);
        
        setTimeout(() => {
            resolve(null);
        }, 30000);
    });

    // Remover listener (simplificado, en producción se maneja mejor)
    // En la práctica, deberías guardar referencia al listener
    
    if (response === 'SI') {
        config.apiKey = newKey;
        if (saveConfig(config)) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '✅ *API key guardada correctamente!*\n\n' +
                      'Ya puedes usar `.osu <nombre_de_usuario>` 🎵\n' +
                      'Si necesitas ayuda, usa `.osuhelp`'
            });
        } else {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Error al guardar la API key. Verifica permisos de escritura.'
            });
        }
    } else if (response === 'NO' || response === null) {
        await sock.sendMessage(message.key.remoteJid, {
            text: '🛑 Registro de API key cancelado.'
        });
    } else {
        await sock.sendMessage(message.key.remoteJid, {
            text: '❌ Respuesta no válida. Escribe *SI* o *NO*.'
        });
    }
};

// .osu <usuario> [modo tipo sdt y mania taiko etc
commands.osu = async (sock, message, args, isGroup, senderJid) => {
    // Verificar si hay API key registrada
    const config = loadConfig();
    if (!config.apiKey || config.apiKey.length === 0) {
        await sock.sendMessage(message.key.remoteJid, {
            text: '❌ *No hay API key registrada*\n\n' +
                  'Para usar osu!, primero registra tu API key:\n' +
                  '`.osuapikey <tu_clave>`\n\n' +
                  'O usa `.osuhelp` para ver cómo obtenerla.'
        });
        return;
    }

    if (!args) {
        await sock.sendMessage(message.key.remoteJid, {
            text: '❌ *Uso:* `.osu <nombre> [modo]`\n' +
                  'Modos: osu (0), taiko (1), ctb (2), mania (3)\n' +
                  'Ejemplo: `.osu mrekk` o `.osu peppy taiko`\n\n' +
                  '📌 Usa `.osuhelp` para más información.'
        });
        return;
    }

    const parts = args.trim().split(/\s+/);
    const username = parts[0];
    let mode = 0;
    if (parts.length > 1) mode = getModeFromArg(parts[1]);

    try {
        // Obtener perfil
        const user = await getOsuUser(username, mode, config.apiKey);
        if (!user) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ Usuario "${username}" no encontrado.`
            });
            return;
        }

        // Mejor score
        const bests = await getOsuBest(user.user_id, mode, 1, config.apiKey);
        let topPlay = null;
        if (bests.length > 0) {
            const score = bests[0];
            const bm = await getBeatmapById(score.beatmap_id, config.apiKey);
            topPlay = { ...score, beatmap: bm };
        }

        // Construir mensaje
        const country = user.country || 'N/A';
        const rank = user.pp_rank ? `#${parseInt(user.pp_rank).toLocaleString()}` : 'N/A';
        const countryRank = user.pp_country_rank ? `#${parseInt(user.pp_country_rank).toLocaleString()}` : 'N/A';
        const level = user.level ? parseFloat(user.level).toFixed(2) : 'N/A';
        const accuracy = user.accuracy ? parseFloat(user.accuracy).toFixed(2) : 'N/A';
        const pp = user.pp_raw ? parseFloat(user.pp_raw).toFixed(0) : 'N/A';
        const playcount = user.playcount || 'N/A';
        const modeName = MODE_NAMES[mode] || 'osu!';

        let topInfo = 'No hay datos.';
        if (topPlay) {
            const bm = topPlay.beatmap;
            const mapName = bm ? `${bm.artist} - ${bm.title} [${bm.version}]` : 'Mapa desconocido';
            const ppScore = topPlay.pp ? parseFloat(topPlay.pp).toFixed(2) : 'N/A';
            const mods = topPlay.enabled_mods ? `+${modsToString(topPlay.enabled_mods)}` : '';
            const date = topPlay.date ? new Date(topPlay.date).toLocaleDateString('es-ES') : 'Fecha desconocida';
            topInfo = `🎵 **Mejor jugada:** ${mapName}\n    📊 PP: ${ppScore}pp | Mods: ${mods}\n    📅 ${date}`;
        }

        const profileLink = `https://osu.ppy.sh/users/${user.user_id}`;
        const caption = `
╔═══════════════════════╗
              🎵 osu! Player Profile
╚═══════════════════════╝

👤 **${user.username}** (${modeName})
🏆 **Rango Mundial:** ${rank}
🌍 **Rango Nacional (${country}):** ${countryRank}
⭐ **PP total:** ${pp}pp
🎯 **Precisión:** ${accuracy}%
📈 **Nivel:** ${level}
🎮 **Partidas jugadas:** ${playcount}

${topInfo}

🔗 **Perfil:** ${profileLink}
        `;

        // Imagen de perfil
        const avatarUrl = `https://a.ppy.sh/${user.user_id}`;
        let avatarBuffer;
        try {
            const resp = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            avatarBuffer = Buffer.from(resp.data);
        } catch (e) {
            console.log('No se pudo descargar avatar.');
        }

        if (avatarBuffer) {
            await sock.sendMessage(message.key.remoteJid, {
                image: avatarBuffer,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: `osu! perfil de ${user.username}`,
                        body: `Rango ${rank}`,
                        thumbnail: avatarBuffer,
                        sourceUrl: profileLink
                    }
                }
            });
        } else {
            await sock.sendMessage(message.key.remoteJid, { text: caption });
        }

    } catch (e) {
        console.error('Error en .osu:', e);
        await sock.sendMessage(message.key.remoteJid, {
            text: `❌ Error: ${e.message || 'desconocido'}`
        });
    }
};

module.exports = {
    name: 'Osu!',
    description: 'Comandos de perfil d osu!',
    commands
};
