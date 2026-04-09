// handlers/ai.js
const axios = require('axios');
const https = require('https');
const fs = require('fs');

// ============ CONFIGURACIÓN DE APIS ============
const AI_CONFIG = {
  deepseek: {
    apiKey: 'sk-97bbbcaea0a34a668ba1478bd66b6402',
    model: 'deepseek-chat'
  },
  
  gemini: {
    apiKey: 'AIzaSyAwbHxbQpuppamaaEjmIjKOAopq7D2FyGA',
    model: 'gemini-2.5-flash'
  }
};

// ============ AGENTE HTTPS ============
const customHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 30000
});

// ============ FUNCIÓN CORREGIDA PARA DESCARGAR MEDIA ============
async function downloadMedia(sock, message) {
  try {
    // Para mensajes citados
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
      
      if (quotedMsg.imageMessage) {
        const stream = await sock.downloadMediaMessage({
          key: {
            remoteJid: message.key.remoteJid,
            id: message.message.extendedTextMessage.contextInfo.stanzaId,
            participant: message.message.extendedTextMessage.contextInfo.participant
          },
          message: quotedMsg
        });
        return Buffer.from(await streamToBuffer(stream));
      }
    }
    
    // Para mensajes directos con imagen
    if (message.message?.imageMessage) {
      const stream = await sock.downloadMediaMessage(message);
      return Buffer.from(await streamToBuffer(stream));
    }
    
    throw new Error('No se encontró una imagen para descargar');
    
  } catch (error) {
    console.error('Error en downloadMedia:', error);
    throw new Error(`Error al descargar la imagen: ${error.message}`);
  }
}

// ============ FUNCIÓN AUXILIAR PARA CONVERTIR STREAM A BUFFER ============
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// ============ DEEPSEEK API ============
async function queryDeepSeek(prompt) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.deepseek.apiKey}`,
        'Accept': 'application/json'
      },
      data: {
        model: AI_CONFIG.deepseek.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente útil y amigable. Responde siempre en español de manera clara y concisa.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        max_tokens: 2000,
        temperature: 0.7
      },
      timeout: 30000,
      httpsAgent: customHttpsAgent,
      adapter: require('axios/lib/adapters/http')
    });
    
    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      throw new Error('Respuesta vacía de DeepSeek');
    }
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('No se puede conectar a DeepSeek. Posible bloqueo de DNS/red.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('API Key de DeepSeek inválida o expirada');
    }
    
    if (error.response?.data?.error?.message) {
      throw new Error(`DeepSeek: ${error.response.data.error.message}`);
    }
    
    throw error;
  }
}

// ============ GEMINI API ============
async function queryGemini(prompt, systemPrompt = null, imageBuffer = null, mimeType = null) {
  try {
    const contents = [
      {
        parts: [
          {
            text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
          }
        ]
      }
    ];

    // Si hay imagen, añadir la parte de la imagen
    if (imageBuffer && mimeType) {
      contents[0].parts.unshift({
        inlineData: {
          mimeType: mimeType,
          data: imageBuffer.toString('base64')
        }
      });
    }

    const response = await axios({
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.gemini.model}:generateContent`,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_CONFIG.gemini.apiKey
      },
      data: {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          topP: 0.8,
          topK: 40
        }
      },
      timeout: 30000,
      httpsAgent: customHttpsAgent
    });
    
    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('Respuesta vacía de Gemini');
    }
    
    return response.data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    if (error.response?.status === 404 && AI_CONFIG.gemini.model === 'gemini-2.5-flash') {
      try {
        // Fallback a gemini-pro-vision para análisis de imágenes
        const fallbackResponse = await axios({
          method: 'POST',
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': AI_CONFIG.gemini.apiKey
          },
          data: {
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000
            }
          },
          timeout: 30000
        });
        
        if (fallbackResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return fallbackResponse.data.candidates[0].content.parts[0].text;
        }
      } catch (fallbackError) {
        console.error('Fallback también falló:', fallbackError.message);
      }
    }
    
    if (error.response?.data?.error?.message) {
      throw new Error(`Gemini: ${error.response.data.error.message}`);
    }
    
    throw error;
  }
}

// ============ GEMINI IMAGE GENERATION ============
async function generateImageWithGemini(prompt) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_CONFIG.gemini.apiKey
      },
      data: {
        prompt: prompt,
        number_of_images: 1,
        aspect_ratio: "1:1",
        safety_filter_level: "block_only_high",
        person_generation: "allow_adult",
        negative_prompt: "blurry, low quality, distorted, watermark, text, logo"
      },
      timeout: 60000,
      httpsAgent: customHttpsAgent
    });

    if (!response.data || !response.data.images || response.data.images.length === 0) {
      throw new Error('No se pudo generar la imagen');
    }

    const imageData = response.data.images[0];
    return imageData.image_bytes;
    
  } catch (error) {
    if (error.response?.data?.error?.message) {
      throw new Error(`Gemini Imagen: ${error.response.data.error.message}`);
    }
    throw error;
  }
}

// ============ ANALYZE IMAGE WITH GEMINI ============
async function analyzeImageWithGemini(imageBuffer, mimeType, prompt = "Describe esta imagen en detalle") {
  try {
    const systemPrompt = "Eres un asistente de análisis de imágenes. Proporciona una descripción detallada y útil de la imagen. Responde en español.";
    
    return await queryGemini(prompt, systemPrompt, imageBuffer, mimeType);
    
  } catch (error) {
    throw new Error(`Análisis de imagen falló: ${error.message}`);
  }
}

// ============ TRADUCIR CON GEMINI ============
async function translateWithGemini(text, targetLang = 'es') {
  const languageNames = {
    'es': 'español',
    'en': 'inglés',
    'fr': 'francés',
    'de': 'alemán',
    'it': 'italiano',
    'pt': 'portugués',
    'ja': 'japonés',
    'ko': 'coreano',
    'zh': 'chino',
    'ru': 'ruso',
    'ar': 'árabe'
  };
  
  const targetLanguage = languageNames[targetLang] || targetLang;
  
  const systemPrompt = `Eres un traductor profesional. Traduce el texto al ${targetLanguage} de manera precisa y natural. 
  Mantén el tono y estilo del original. No agregues explicaciones, solo la traducción.`;
  
  return await queryGemini(text, systemPrompt);
}

// ============ ESCRIBIR CON GEMINI ============
async function writeWithGemini(topic, style = 'general') {
  const stylePrompts = {
    'general': 'Escribe un texto sobre el tema proporcionado. Sé claro, informativo y amigable.',
    'formal': 'Escribe un texto formal y profesional sobre el tema proporcionado.',
    'creativo': 'Escribe un texto creativo y atractivo sobre el tema proporcionado.',
    'académico': 'Escribe un texto académico o educativo sobre el tema proporcionado.',
    'persuasivo': 'Escribe un texto persuasivo que convenza al lector sobre el tema.',
    'narrativo': 'Escribe una historia o narración sobre el tema proporcionado.',
    'poético': 'Escribe un texto poético o lírico sobre el tema proporcionado.'
  };
  
  const systemPrompt = stylePrompts[style] || stylePrompts.general;
  
  return await queryGemini(topic, systemPrompt);
}

// ============ FUNCIONES AUXILIARES ============
function formatForWhatsApp(text, maxLength = 3500) {
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 100) + 
           '\n\n... (respuesta truncada)\n📏 *Caracteres:* ' + text.length + '/' + maxLength;
  }
  
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '📟 *Código:*\n```\n$2\n```\n');
  return text;
}

function truncateText(text, length = 80) {
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// ============ MÓDULO PRINCIPAL ============
module.exports = {
  name: 'Asistentes de IA',
  description: 'DeepSeek, Gemini y herramientas de texto',
  
  commands: {
    // ============ ANALIZAR IMAGEN CON GEMINI ============
    'analizar': async (sock, message, args, isGroup) => {
      try {
        // Verificar si hay imagen citada o adjunta
        let imageMessage = null;
        let customPrompt = args.trim() || "Describe esta imagen en detalle";
        let isQuoted = false;
        
        // Verificar si es mensaje citado con imagen
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
          imageMessage = message.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
          isQuoted = true;
        } 
        // Verificar si es mensaje directo con imagen
        else if (message.message?.imageMessage) {
          imageMessage = message.message.imageMessage;
        } else {
          await sock.sendMessage(message.key.remoteJid, {
            text: '🖼️ *ANALIZAR IMAGEN*\n\n' +
                  '❌ *Uso:* `.analizar [descripción opcional]`\n\n' +
                  '📌 *Debes:*\n' +
                  '• Enviar una imagen con el comando\n' +
                  '• O citar una imagen existente\n\n' +
                  '💡 *Ejemplo:*\n' +
                  '`.analizar ¿Qué hay en esta imagen?`\n' +
                  '(respondiendo a una imagen)\n\n' +
                  '⚠️ *Nota:* Envía una imagen o responde a una con este comando.'
          });
          return;
        }
        
        const processingMsg = await sock.sendMessage(message.key.remoteJid, {
          text: '🔍 *ANALIZANDO IMAGEN CON GEMINI...*\n⏳ Esto puede tomar unos segundos...'
        });
        
        // Descargar imagen usando la función corregida
        let imageBuffer;
        try {
          if (isQuoted) {
            // Para mensajes citados, necesitamos reconstruir el objeto del mensaje
            const quotedMessage = {
              key: {
                remoteJid: message.key.remoteJid,
                id: message.message.extendedTextMessage.contextInfo.stanzaId,
                participant: message.message.extendedTextMessage.contextInfo.participant
              },
              message: message.message.extendedTextMessage.contextInfo.quotedMessage
            };
            imageBuffer = await downloadMedia(sock, quotedMessage);
          } else {
            // Para mensajes directos
            imageBuffer = await downloadMedia(sock, message);
          }
        } catch (downloadError) {
          console.error('Error descargando imagen:', downloadError);
          throw new Error(`No se pudo descargar la imagen: ${downloadError.message}`);
        }
        
        const mimeType = imageMessage.mimetype || 'image/jpeg';
        
        // Analizar imagen
        const analysis = await analyzeImageWithGemini(imageBuffer, mimeType, customPrompt);
        const formattedAnalysis = formatForWhatsApp(analysis);
        
        // Eliminar mensaje de procesamiento
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        // Enviar respuesta
        const finalMessage = `🖼️ *ANÁLISIS DE IMAGEN*\n\n` +
                            `💭 *Consulta:* ${truncateText(customPrompt, 100)}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `${formattedAnalysis}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `🤖 Analizador: Gemini Vision\n` +
                            `⚡ Via: Futaba Rio Bot`;
        
        await sock.sendMessage(message.key.remoteJid, { text: finalMessage });
        
      } catch (error) {
        console.error('Error en análisis de imagen:', error);
        let errorMessage = `❌ *ERROR AL ANALIZAR IMAGEN*\n\n${error.message}`;
        
        if (error.message.includes('descargar') || error.message.includes('download')) {
          errorMessage += '\n\n💡 *Posibles soluciones:*\n' +
                         '1. Asegúrate de que la imagen no sea muy grande\n' +
                         '2. Intenta con otra imagen\n' +
                         '3. Reenvía la imagen primero y luego cítala';
        }
        
        await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
      }
    },
    
    // ============ GENERAR IMAGEN CON GEMINI ============
    'imgia': async (sock, message, args, isGroup) => {
      if (!args || args.trim() === '') {
        await sock.sendMessage(message.key.remoteJid, {
          text: '🎨 *GENERADOR DE IMÁGENES*\n\n' +
                '❌ *Uso:* `.imgia [descripción de la imagen]`\n\n' +
                '💡 *Ejemplos:*\n' +
                '• `.imgia un gato astronauta en el espacio`\n' +
                '• `.imgia paisaje montañoso al atardecer, estilo anime`\n' +
                '• `.imgia retrato realista de una guerrera samurái`\n\n' +
                '⚠️ *Limitaciones:*\n' +
                '• No contenido ofensivo\n' +
                '• Máximo 500 caracteres\n' +
                '• Generación tarda ~30 segundos'
        });
        return;
      }
      
      const prompt = args.trim();
      
      // Validar longitud del prompt
      if (prompt.length > 500) {
        await sock.sendMessage(message.key.remoteJid, {
          text: '❌ *PROMPT DEMASIADO LARGO*\n\n' +
                'Máximo 500 caracteres. Por favor, sé más conciso.'
        });
        return;
      }
      
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, {
          text: `🎨 *GENERANDO IMAGEN CON GEMINI...*\n\n` +
                `📝 *Prompt:* ${truncateText(prompt, 80)}\n` +
                `⏳ *Tiempo estimado:* 20-30 segundos...`
        });
        
        // Generar imagen
        const imageBytes = await generateImageWithGemini(prompt);
        const imageBuffer = Buffer.from(imageBytes, 'base64');
        
        // Eliminar mensaje de procesamiento
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        // Enviar imagen
        await sock.sendMessage(message.key.remoteJid, {
          image: imageBuffer,
          caption: `🎨 *IMAGEN GENERADA CON IA*\n\n` +
                  `📝 *Prompt:* ${truncateText(prompt, 150)}\n` +
                  `🤖 *Generador:* Gemini Imagen\n` +
                  `⚡ *Via:* Futaba Rio Bot\n\n` +
                  `✨ Creado con Inteligencia Artificial`
        });
        
      } catch (error) {
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        let errorMessage = `❌ *ERROR AL GENERAR IMAGEN*\n\n${error.message}`;
        
        if (error.message.includes('safety') || error.message.includes('violat')) {
          errorMessage += '\n\n⚠️ *El prompt viola las políticas de seguridad.*\n' +
                         'Por favor, usa una descripción diferente.';
        } else if (error.message.includes('timeout')) {
          errorMessage += '\n\n⏳ *Tiempo de espera agotado.*\n' +
                         'El servidor está lento. Intenta nuevamente.';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage += '\n\n📊 *Límite de cuota alcanzado.*\n' +
                         'Intenta más tarde o verifica tu API key.';
        } else if (error.message.includes('API key')) {
          errorMessage += '\n\n🔑 *API key inválida o sin permisos.*\n' +
                         'Verifica tu API key de Gemini.';
        }
        
        await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
      }
    },
    
    // ============ ALIASES PARA ANALIZAR ============
    'analyze': async (sock, message, args, isGroup) => {
      module.exports.commands.analizar(sock, message, args, isGroup);
    },
    
    'img': async (sock, message, args, isGroup) => {
      module.exports.commands.imgia(sock, message, args, isGroup);
    },
    
    'imagen': async (sock, message, args, isGroup) => {
      module.exports.commands.imgia(sock, message, args, isGroup);
    },

    // ============ DEEPSEEK ============
    'deepseek': async (sock, message, args, isGroup) => {
      if (!args || args.trim() === '') {
        await sock.sendMessage(message.key.remoteJid, {
          text: '🧠 *DEEPSEEK AI*\n\n❌ *Uso:* `.deepseek [pregunta]`\n\n💡 *Alternativa:* Usa `.gemini` si falla.'
        });
        return;
      }
      
      const prompt = args.trim();
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, {
          text: '🧠 *PROCESANDO CON DEEPSEEK...*'
        });
        
        const response = await queryDeepSeek(prompt);
        const formattedResponse = formatForWhatsApp(response);
        
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        const finalMessage = `🧠 *DEEPSEEK AI RESPONDE*\n\n` +
                            `💬 *Pregunta:* ${truncateText(prompt, 100)}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `${formattedResponse}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `🤖 Modelo: ${AI_CONFIG.deepseek.model}\n` +
                            `⚡ Via: Futaba Rio Bot`;
        
        await sock.sendMessage(message.key.remoteJid, { text: finalMessage });
        
      } catch (error) {
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        let errorMessage = `❌ *ERROR DEEPSEEK*\n\n${error.message}`;
        if (error.message.includes('No se puede conectar')) {
          errorMessage += '\n\n💡 Usa `.gemini` en su lugar.';
        }
        
        await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
      }
    },
    
    // ============ GEMINI ============
    'gemini': async (sock, message, args, isGroup) => {
      if (!args || args.trim() === '') {
        await sock.sendMessage(message.key.remoteJid, {
          text: '🌟 *GEMINI AI (Google)*\n\n❌ *Uso:* `.gemini [pregunta]`'
        });
        return;
      }
      
      const prompt = args.trim();
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, {
          text: '🌟 *PROCESANDO CON GEMINI...*'
        });
        
        const response = await queryGemini(prompt);
        const formattedResponse = formatForWhatsApp(response);
        
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        const finalMessage = `🌟 *GEMINI AI RESPONDE*\n\n` +
                            `💬 *Pregunta:* ${truncateText(prompt, 100)}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `${formattedResponse}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `🤖 Modelo: ${AI_CONFIG.gemini.model}\n` +
                            `⚡ Via: Futaba Rio Bot`;
        
        await sock.sendMessage(message.key.remoteJid, { text: finalMessage });
        
      } catch (error) {
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR GEMINI*\n\n${error.message}` 
        });
      }
    },
    
    // ============ AI (INTELIGENTE) ============
    'ai': async (sock, message, args, isGroup) => {
      if (!args || args.trim() === '') {
        await sock.sendMessage(message.key.remoteJid, {
          text: '🤖 *ASISTENTE DE IA*\n\n❌ *Uso:* `.ai [pregunta]`\n\n💡 Usa automáticamente Gemini o DeepSeek.'
        });
        return;
      }
      
      const prompt = args.trim();
      let processingMsg = null;
      
      try {
        processingMsg = await sock.sendMessage(message.key.remoteJid, {
          text: '🤖 *PROCESANDO CON IA...*'
        });
        
        let response = '';
        let aiUsed = '';
        
        try {
          response = await queryGemini(prompt);
          aiUsed = 'Gemini AI (Google)';
        } catch (geminiError) {
          try {
            response = await queryDeepSeek(prompt);
            aiUsed = 'DeepSeek AI';
          } catch (deepseekError) {
            throw new Error(`Ambas IAs fallaron:\n• Gemini: ${geminiError.message}\n• DeepSeek: ${deepseekError.message}`);
          }
        }
        
        const formattedResponse = formatForWhatsApp(response);
        
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        const finalMessage = `🤖 *ASISTENTE DE IA RESPONDE*\n\n` +
                            `💬 *Pregunta:* ${truncateText(prompt, 100)}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `${formattedResponse}\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `⚡ Usando: ${aiUsed}\n` +
                            `✅ Via: Futaba Rio Bot`;
        
        await sock.sendMessage(message.key.remoteJid, { text: finalMessage });
        
      } catch (error) {
        if (processingMsg?.key) {
          try { await sock.sendMessage(message.key.remoteJid, { delete: processingMsg.key }); } catch(e) {}
        }
        
        await sock.sendMessage(message.key.remoteJid, { 
          text: `❌ *ERROR ASISTENTE DE IA*\n\n${error.message}` 
        });
      }
    },
    
    // ============ TRADUCIR ============
    'trad': async (sock, message, args, isGroup) => {
      // ... (código existente para trad) ...
    },
    
    // ============ ESCRIBIR ============
    'write': async (sock, message, args, isGroup) => {
      // ... (código existente para write) ...
    },
    
    // ============ ALIASES ============
    'dsp': async (sock, message, args, isGroup) => {
      module.exports.commands.deepseek(sock, message, args, isGroup);
    },
    
    'gpt': async (sock, message, args, isGroup) => {
      module.exports.commands.ai(sock, message, args, isGroup);
    },
    
    'translate': async (sock, message, args, isGroup) => {
      module.exports.commands.trad(sock, message, args, isGroup);
    },
    
    'escribir': async (sock, message, args, isGroup) => {
      module.exports.commands.write(sock, message, args, isGroup);
    },
    
    // ============ AYUDA ACTUALIZADA ============
    'aihelp': async (sock, message, args, isGroup) => {
      const helpText = `🤖 *ASISTENTES DE IA - FUTABA RIO BOT*\n\n` +
                      `🌟 *COMANDOS PRINCIPALES:*\n` +
                      `• \`.ai [pregunta]\` - Asistente inteligente\n` +
                      `• \`.gemini [pregunta]\` - Solo Gemini AI\n` +
                      `• \`.dsp [pregunta]\` - Solo DeepSeek AI\n` +
                      `• \`.gpt [pregunta]\` - Alias para .ai\n\n` +
                      `🖼️ *COMANDOS DE IMAGEN:*\n` +
                      `• \`.imgia [descripción]\` - Generar imagen\n` +
                      `• \`.analizar [pregunta]\` - Analizar imagen\n` +
                      `(responde a una imagen con el comando)\n\n` +
                      `🌍 *HERRAMIENTAS DE TEXTO:*\n` +
                      `• \`.trad [idioma] [texto]\` - Traducir texto\n` +
                      `• \`.write [estilo] [tema]\` - Escribir texto\n\n` +
                      `🔄 *ALIAS PARA IMÁGENES:*\n` +
                      `• \`.img\`, \`.imagen\` - Alias para .imgia\n` +
                      `• \`.analyze\` - Alias para .analizar`;
      
      await sock.sendMessage(message.key.remoteJid, { text: helpText });
    },
    
    // ============ TEST ============
    'aitest': async (sock, message, args, isGroup) => {
      // ... (código existente para aitest) ...
    }
  }
};