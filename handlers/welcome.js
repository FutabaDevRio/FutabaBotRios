const fs = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Ruta base para imágenes de bienvenida
const IMG_DIR = path.join(__dirname, '..', 'bienvenidahandler');
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'welcome.json');

// Función para convertir stream a Buffer
async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

// Cargar configuraciones guardadas
let welcomeConfig = {};
try {
    fs.ensureDirSync(path.dirname(CONFIG_FILE));
    if (fs.existsSync(CONFIG_FILE)) {
        welcomeConfig = fs.readJSONSync(CONFIG_FILE);
    } else {
        fs.writeJSONSync(CONFIG_FILE, {}, { spaces: 2 });
        welcomeConfig = {};
    }
} catch (e) {
    console.error('Error cargando welcome.json:', e);
    welcomeConfig = {};
}

function saveConfig() {
    fs.ensureDirSync(path.dirname(CONFIG_FILE));
    fs.writeJSONSync(CONFIG_FILE, welcomeConfig, { spaces: 2 });
}

// Función para enviar bienvenida
async function sendWelcome(sock, groupId, newParticipants) {
    const config = welcomeConfig[groupId];
    if (!config || !config.enabled) return;

    try {
        const groupMeta = await sock.groupMetadata(groupId);
        const groupName = groupMeta.subject;

        for (const jid of newParticipants) {
            const memberName = `@${jid.split('@')[0]}`;
            let caption = config.text || '';

            caption = caption
                .replace(/{group}/g, groupName)
                .replace(/{user}/g, memberName)
                .replace(/{total}/g, groupMeta.participants.length);

            if (!caption.trim()) {
                caption = `✨ *Bienvenid@ ${memberName}* ✨\n\n` +
                          `🌸 Gracias por unirte a *${groupName}*\n` +
                          `👥 Ahora somos ${groupMeta.participants.length} miembros\n` +
                          `📜 Lee las reglas y disfruta tu estadía 💖`;
            }

            if (config.image) {
                const imagePath = path.join(IMG_DIR, groupId, 'welcome.jpg');
                if (fs.existsSync(imagePath)) {
                    await sock.sendMessage(groupId, {
                        image: fs.readFileSync(imagePath),
                        caption: caption,
                        mentions: [jid]
                    });
                } else {
                    await sock.sendMessage(groupId, { text: caption, mentions: [jid] });
                }
            } else {
                await sock.sendMessage(groupId, { text: caption, mentions: [jid] });
            }
        }
    } catch (err) {
        console.error('Error en sendWelcome:', err);
    }
}

// comandos
const commands = {};

commands.setwelcome = async (sock, message, args, isGroup, senderJid) => {
    if (!isGroup) {
        await sock.sendMessage(message.key.remoteJid, { text: '❌ Solo disponible en grupos.' });
        return;
    }
    const groupId = message.key.remoteJid;

    const botOwner = require('../index').BOT_CONFIG?.ownerNumber;
    const groupMeta = await sock.groupMetadata(groupId);
    const senderIsAdmin = groupMeta.participants.some(p => p.id === senderJid && p.admin);
    const senderIsOwner = senderJid === botOwner;

    if (!senderIsOwner && !senderIsAdmin) {
        await sock.sendMessage(groupId, { text: '❌ Solo el owner del bot o un admin del grupo pueden usar este comando.' });
        return;
    }

    const welcomeText = args || '';

    if (!welcomeConfig[groupId]) welcomeConfig[groupId] = {};
    welcomeConfig[groupId].text = welcomeText;
    welcomeConfig[groupId].enabled = true;
    saveConfig();

    await sock.sendMessage(groupId, {
        text: `✅ Bienvenida personalizada *actualizada*:\n\n${welcomeText || 'Sin texto (se usará el default)'}`
    });
};

commands.setwelcomeimg = async (sock, message, args, isGroup, senderJid) => {
    if (!isGroup) {
        await sock.sendMessage(message.key.remoteJid, { text: '❌ Solo disponible en grupos.' });
        return;
    }
    const groupId = message.key.remoteJid;
    const botOwner = require('../index').BOT_CONFIG?.ownerNumber;
    const groupMeta = await sock.groupMetadata(groupId);
    const senderIsAdmin = groupMeta.participants.some(p => p.id === senderJid && p.admin);
    const senderIsOwner = senderJid === botOwner;
    if (!senderIsOwner && !senderIsAdmin) {
        await sock.sendMessage(groupId, { text: '❌ Solo el owner del bot o un admin del grupo pueden usar este comando.' });
        return;
    }

    let mediaBuffer;
    try {
        const msg = message.message;
        let mediaMsg = null;
        let mediaType = null;

        // Detectar medio en mensaje actual o citado
        if (msg.imageMessage) {
            mediaMsg = message;
            mediaType = 'image';
        } else if (msg.videoMessage) {
            mediaMsg = message;
            mediaType = 'video';
        } else if (msg.extendedTextMessage && msg.extendedTextMessage.contextInfo && msg.extendedTextMessage.contextInfo.quotedMessage) {
            const quoted = msg.extendedTextMessage.contextInfo.quotedMessage;
            if (quoted.imageMessage) {
                mediaMsg = {
                    key: message.key,
                    message: {
                        imageMessage: quoted.imageMessage
                    }
                };
                mediaType = 'image';
            } else if (quoted.videoMessage) {
                mediaMsg = {
                    key: message.key,
                    message: {
                        videoMessage: quoted.videoMessage
                    }
                };
                mediaType = 'video';
            } else if (quoted.documentMessage) {
                mediaMsg = {
                    key: message.key,
                    message: {
                        documentMessage: quoted.documentMessage
                    }
                };
                mediaType = 'document';
            } else {
                await sock.sendMessage(groupId, { text: '❌ El mensaje citado no contiene una imagen, video o documento válido.' });
                return;
            }
        } else {
            await sock.sendMessage(groupId, { text: '❌ Debes enviar una imagen o responder a una imagen con este comando.' });
            return;
        }

        if (!mediaMsg) {
            await sock.sendMessage(groupId, { text: '❌ No se pudo identificar el medio.' });
            return;
        }

        console.log(`📥 Descargando ${mediaType}...`);

        // Intentar usar downloadMediaMessage (puede devolver Buffer o Stream)
        try {
            if (typeof sock.downloadMediaMessage === 'function') {
                const result = await sock.downloadMediaMessage(mediaMsg);
                if (Buffer.isBuffer(result)) {
                    mediaBuffer = result;
                    console.log('✅ Media descargada como Buffer (downloadMediaMessage)');
                } else if (result && typeof result.pipe === 'function') {
                    // Es un stream, convertirlo a buffer
                    console.log('🔄 downloadMediaMessage devolvió un Stream, convirtiendo a Buffer...');
                    mediaBuffer = await streamToBuffer(result);
                    console.log('✅ Stream convertido a Buffer');
                } else {
                    console.log('⚠️ downloadMediaMessage devolvió un tipo inesperado:', typeof result);
                    throw new Error('Tipo de retorno inesperado de downloadMediaMessage');
                }
            } else {
                throw new Error('sock.downloadMediaMessage no es una función');
            }
        } catch (err) {
            console.log('⚠️ Falló downloadMediaMessage, usando downloadContentFromMessage:', err.message);
            // Usar downloadContentFromMessage como alternativa
            const stream = await downloadContentFromMessage(
                mediaMsg.message.imageMessage || mediaMsg.message.videoMessage || mediaMsg.message.documentMessage,
                mediaType === 'image' ? 'image' : (mediaType === 'video' ? 'video' : 'document')
            );
            mediaBuffer = await streamToBuffer(stream);
            console.log('✅ Media descargada con downloadContentFromMessage');
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            await sock.sendMessage(groupId, { text: '❌ El medio descargado está vacío.' });
            return;
        }

        console.log(`✅ Media descargada, tamaño: ${mediaBuffer.length} bytes`);

    } catch (err) {
        console.error('❌ Error descargando media:', err);
        await sock.sendMessage(groupId, { text: `❌ Error al descargar: ${err.message}` });
        return;
    }

    // Guardar imagen
    const groupDir = path.join(IMG_DIR, groupId);
    fs.ensureDirSync(groupDir);
    const imgPath = path.join(groupDir, 'welcome.jpg');
    fs.writeFileSync(imgPath, mediaBuffer);

    if (!welcomeConfig[groupId]) welcomeConfig[groupId] = {};
    welcomeConfig[groupId].image = true;
    welcomeConfig[groupId].enabled = true;
    saveConfig();

    await sock.sendMessage(groupId, { text: '🖼️ Imagen de bienvenida *actualizada* correctamente.' });
};

commands.delwelcome = async (sock, message, args, isGroup, senderJid) => {
    if (!isGroup) {
        await sock.sendMessage(message.key.remoteJid, { text: '❌ Solo disponible en grupos.' });
        return;
    }
    const groupId = message.key.remoteJid;
    const botOwner = require('../index').BOT_CONFIG?.ownerNumber;
    const groupMeta = await sock.groupMetadata(groupId);
    const senderIsAdmin = groupMeta.participants.some(p => p.id === senderJid && p.admin);
    const senderIsOwner = senderJid === botOwner;
    if (!senderIsOwner && !senderIsAdmin) {
        await sock.sendMessage(groupId, { text: '❌ Solo el owner del bot o un admin del grupo pueden usar este comando.' });
        return;
    }

    delete welcomeConfig[groupId];
    saveConfig();
    const groupDir = path.join(IMG_DIR, groupId);
    if (fs.existsSync(groupDir)) {
        fs.removeSync(groupDir);
    }
    await sock.sendMessage(groupId, { text: '🗑️ Bienvenida eliminada.' });
};

// Exportar el módulo correctamente
module.exports = {
    name: 'Bienvenida',
    description: 'Sistema de bienvenida personalizable',
    commands,
    sendWelcome,
    welcomeConfig
};
