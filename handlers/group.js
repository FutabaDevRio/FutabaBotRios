// handlers/group.js
module.exports = {
  name: 'Grupo',
  description: 'Comandos para gestión de grupos',
  
  commands: {
    'infog': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        const metadata = await sock.groupMetadata(groupId);
        const owner = metadata.owner ? metadata.owner.split('@')[0] : 'Desconocido';
        const admins = metadata.participants.filter(p => p.admin).length;
        const total = metadata.participants.length;
        
        const info = `📊 *INFORMACIÓN DEL GRUPO*\n\n` +
                   `🔖 *Nombre:* ${metadata.subject}\n` +
                   `👥 *Participantes:* ${total} (${admins} admins)\n` +
                   `👑 *Creador:* @${owner}\n` +
                   `🔒 *Modo restringido:* ${metadata.restrict ? 'Sí' : 'No'}\n` +
                   `🔕 *Solo admins:* ${metadata.announce ? 'Sí' : 'No'}\n` +
                   `🆔 *ID:* ${groupId.replace('@g.us', '')}\n` +
                   `📝 *Descripción:* ${metadata.desc || 'Sin descripción'}`;
        
        await sock.sendMessage(groupId, { text: info });
      } catch (error) {
        console.error('Error en infog:', error);
        await sock.sendMessage(groupId, { 
          text: '❌ Error obteniendo información del grupo.' 
        });
      }
    },
    
    'list': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        const metadata = await sock.groupMetadata(groupId);
        let adminList = '👑 *ADMINISTRADORES:*\n';
        let memberList = '👤 *MIEMBROS:*\n';
        let adminCount = 0;
        let memberCount = 0;
        
        metadata.participants.forEach((p, i) => {
          const number = p.id.split('@')[0];
          if (p.admin) {
            adminCount++;
            adminList += `${adminCount}. @${number}\n`;
          } else {
            memberCount++;
            memberList += `${memberCount}. @${number}\n`;
          }
        });
        
        const list = `📋 *LISTA DE PARTICIPANTES*\n\n` +
                    `${adminList}\n${memberList}\n` +
                    `📊 *Total:* ${metadata.participants.length} (${adminCount} admins, ${memberCount} miembros)`;
        
        await sock.sendMessage(groupId, { text: list });
      } catch (error) {
        console.error('Error en list:', error);
        await sock.sendMessage(groupId, { 
          text: '❌ Error obteniendo lista de participantes.' 
        });
      }
    },
    
    'promote': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        if (!args) {
          await sock.sendMessage(groupId, { 
            text: `❌ *Uso:* \`.promote @usuario\`\nO responde a un mensaje del usuario.` 
          });
          return;
        }
        
        // Obtener usuario a promover
        let userToPromote;
        
        // Si es respuesta a un mensaje
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
          userToPromote = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } 
        // Si se menciona con @
        else if (args.includes('@')) {
          userToPromote = args.trim() + (args.endsWith('@s.whatsapp.net') ? '' : '@s.whatsapp.net');
        }
        // Si es solo número
        else {
          userToPromote = args.trim().replace(/\D/g, '') + '@s.whatsapp.net';
        }
        
        // Verificar si el usuario está en el grupo
        const userInGroup = metadata.participants.find(p => p.id === userToPromote);
        if (!userInGroup) {
          await sock.sendMessage(groupId, { 
            text: `❌ El usuario no está en este grupo.` 
          });
          return;
        }
        
        // Promover usuario
        await sock.groupParticipantsUpdate(groupId, [userToPromote], 'promote');
        
        const userNumber = userToPromote.split('@')[0];
        await sock.sendMessage(groupId, { 
          text: `👑 *USUARIO PROMOVIDO*\n\n@${userNumber} ahora es administrador del grupo.`,
          mentions: [userToPromote]
        });
        
      } catch (error) {
        console.error('Error en promote:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al promover*\nAsegúrate que:\n• El bot sea admin\n• El usuario esté en el grupo\n• No intentes promover al dueño` 
        });
      }
    },
    
    'demote': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        if (!args) {
          await sock.sendMessage(groupId, { 
            text: `❌ *Uso:* \`.demote @usuario\`\nO responde a un mensaje del usuario.` 
          });
          return;
        }
        
        // Obtener usuario a degradar
        let userToDemote;
        
        // Si es respuesta a un mensaje
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
          userToDemote = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } 
        // Si se menciona con @
        else if (args.includes('@')) {
          userToDemote = args.trim() + (args.endsWith('@s.whatsapp.net') ? '' : '@s.whatsapp.net');
        }
        // Si es solo número
        else {
          userToDemote = args.trim().replace(/\D/g, '') + '@s.whatsapp.net';
        }
        
        // No permitir degradar al dueño
        if (userToDemote === metadata.owner) {
          await sock.sendMessage(groupId, { 
            text: `❌ No puedes degradar al dueño del grupo.` 
          });
          return;
        }
        
        // Verificar si el usuario está en el grupo y es admin
        const userInGroup = metadata.participants.find(p => p.id === userToDemote);
        if (!userInGroup) {
          await sock.sendMessage(groupId, { 
            text: `❌ El usuario no está en este grupo.` 
          });
          return;
        }
        
        if (!userInGroup.admin) {
          await sock.sendMessage(groupId, { 
            text: `❌ El usuario ya no es administrador.` 
          });
          return;
        }
        
        // Degradar usuario
        await sock.groupParticipantsUpdate(groupId, [userToDemote], 'demote');
        
        const userNumber = userToDemote.split('@')[0];
        await sock.sendMessage(groupId, { 
          text: `⬇️ *USUARIO DEGRADADO*\n\n@${userNumber} ya no es administrador del grupo.`,
          mentions: [userToDemote]
        });
        
      } catch (error) {
        console.error('Error en demote:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al degradar*\nAsegúrate que:\n• El bot sea admin\n• No intentes degradar al dueño\n• El usuario sea admin` 
        });
      }
    },
    
    'ban': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        // Obtener usuario a expulsar
        let userToBan;
        
        // Si es respuesta a un mensaje
        if (message.message?.extendedTextMessage?.contextInfo?.participant) {
          userToBan = message.message.extendedTextMessage.contextInfo.participant;
        }
        // Si se pasa como argumento
        else if (args) {
          if (args.includes('@')) {
            userToBan = args.trim() + (args.endsWith('@s.whatsapp.net') ? '' : '@s.whatsapp.net');
          } else {
            userToBan = args.trim().replace(/\D/g, '') + '@s.whatsapp.net';
          }
        } else {
          await sock.sendMessage(groupId, { 
            text: `❌ *Uso:* \`.ban @usuario\`\nO responde a un mensaje del usuario.` 
          });
          return;
        }
        
        // No permitir expulsar al dueño
        if (userToBan === metadata.owner) {
          await sock.sendMessage(groupId, { 
            text: `❌ No puedes expulsar al dueño del grupo.` 
          });
          return;
        }
        
        // No permitir expulsar al bot
        if (userToBan.includes(sock.user.id.split(':')[0])) {
          await sock.sendMessage(groupId, { 
            text: `❌ No puedo expulsarme a mí mismo.` 
          });
          return;
        }
        
        // Verificar si el usuario está en el grupo
        const userInGroup = metadata.participants.find(p => p.id === userToBan);
        if (!userInGroup) {
          await sock.sendMessage(groupId, { 
            text: `❌ El usuario no está en este grupo.` 
          });
          return;
        }
        
        // Expulsar usuario
        await sock.groupParticipantsUpdate(groupId, [userToBan], 'remove');
        
        const userNumber = userToBan.split('@')[0];
        await sock.sendMessage(groupId, { 
          text: `⛔ *USUARIO EXPULSADO*\n\n@${userNumber} ha sido expulsado del grupo.`,
          mentions: [userToBan]
        });
        
      } catch (error) {
        console.error('Error en ban:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al expulsar*\nAsegúrate que:\n• El bot sea admin\n• No intentes expulsar al dueño\n• El usuario esté en el grupo` 
        });
      }
    },
    
    'add': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        if (!args) {
          await sock.sendMessage(groupId, { 
            text: `❌ *Uso:* \`.add [número]\`\nEjemplo: \`.add 584142404632\`` 
          });
          return;
        }
        
        // Limpiar número
        const cleanNumber = args.trim().replace(/\D/g, '');
        if (cleanNumber.length < 10) {
          await sock.sendMessage(groupId, { 
            text: `❌ Número inválido. Debe tener al menos 10 dígitos.` 
          });
          return;
        }
        
        const userToAdd = cleanNumber + '@s.whatsapp.net';
        
        // Verificar si ya está en el grupo
        const userInGroup = metadata.participants.find(p => p.id === userToAdd);
        if (userInGroup) {
          await sock.sendMessage(groupId, { 
            text: `❌ El usuario ya está en el grupo.` 
          });
          return;
        }
        
        // Agregar usuario
        await sock.groupParticipantsUpdate(groupId, [userToAdd], 'add');
        
        await sock.sendMessage(groupId, { 
          text: `✅ *USUARIO AGREGADO*\n\n@${cleanNumber} ha sido invitado al grupo.`,
          mentions: [userToAdd]
        });
        
      } catch (error) {
        console.error('Error en add:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al agregar*\nAsegúrate que:\n• El bot sea admin\n• El número sea válido\n• El usuario no esté ya en el grupo` 
        });
      }
    },
    
    'silenciar': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        // Activar modo "solo admins" (announce = true)
        await sock.groupSettingUpdate(groupId, 'announcement');
        
        await sock.sendMessage(groupId, { 
          text: `🔕 *GRUPO SILENCIADO*\n\nAhora solo los administradores pueden enviar mensajes en este grupo.`
        });
        
      } catch (error) {
        console.error('Error en silenciar:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al silenciar grupo*\nAsegúrate que el bot sea administrador.` 
        });
      }
    },
    
    'desilenciar': async (sock, message, args, isGroup) => {
      const groupId = message.key.remoteJid;
      const senderId = message.key.participant || message.key.remoteJid;
      
      if (!isGroup) {
        await sock.sendMessage(groupId, { 
          text: '❌ Este comando solo funciona en grupos.' 
        });
        return;
      }
      
      try {
        // Verificar si el que envía es admin
        const metadata = await sock.groupMetadata(groupId);
        const senderParticipant = metadata.participants.find(p => p.id === senderId);
        
        if (!senderParticipant || !senderParticipant.admin) {
          await sock.sendMessage(groupId, { 
            text: '⛔ *Permiso denegado*\nSolo administradores pueden usar este comando.' 
          });
          return;
        }
        
        // Desactivar modo "solo admins" (announce = false)
        await sock.groupSettingUpdate(groupId, 'not_announcement');
        
        await sock.sendMessage(groupId, { 
          text: `🔊 *GRUPO ACTIVADO*\n\nAhora todos los miembros pueden enviar mensajes en este grupo.`
        });
        
      } catch (error) {
        console.error('Error en desilenciar:', error);
        await sock.sendMessage(groupId, { 
          text: `❌ *Error al activar grupo*\nAsegúrate que el bot sea administrador.` 
        });
      }
    },
    
    'kick': async (sock, message, args, isGroup) => {
      // Alias para .ban
      module.exports.commands.ban(sock, message, args, isGroup);
    },
    
    'remove': async (sock, message, args, isGroup) => {
      // Alias para .ban
      module.exports.commands.ban(sock, message, args, isGroup);
    }
  }
};