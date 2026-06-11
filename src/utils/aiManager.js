import { plugins } from './pluginManager.js';
import { recordChat, getChatHistory } from './aiHistory.js';
import { config } from '../config.js';
import logger from './logger.js';

/**
 * Mock Pattern Matcher (Intent Classifier) to simulate AI routing without API/token cost.
 * @param {string} prompt
 * @returns {object|null}
 */
export function classifyIntentMock(prompt) {
  const query = prompt.toLowerCase().trim();

  // 1. Webhook - Create
  if (query.includes('webhook') && (query.includes('buat') || query.includes('create'))) {
    let title = 'Test';
    const nameMatch = prompt.match(/(?:nama|name|title|'|")\s*[:='"]?\s*([a-zA-Z0-9_-]+)/);
    if (nameMatch) {
      title = nameMatch[1];
    }
    let pfp = null;
    const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      pfp = urlMatch[1].replace(/['"]+$/, '');
    }

    return {
      pluginName: 'webhook',
      args: {
        action: 'create',
        title,
        channelId: 'MOCK_CHANNEL_ID',
        pfp
      }
    };
  }

  // 2. Webhook - List
  if (
    query.includes('webhook') &&
    (query.includes('list') || query.includes('daftar') || query.includes('semua'))
  ) {
    return {
      pluginName: 'webhook',
      args: {
        action: 'list'
      }
    };
  }

  // 3. Webhook - Info
  if (query.includes('webhook') && (query.includes('info') || query.includes('detail'))) {
    const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/) || prompt.match(/(\d{15,20})/);
    return {
      pluginName: 'webhook',
      args: {
        action: 'info',
        id_or_url: urlMatch ? urlMatch[1] : 'MOCK_WEBHOOK_ID'
      }
    };
  }

  // 3. Role - Add/Remove
  if (
    query.includes('role') &&
    (query.includes('tambah') || query.includes('add') || query.includes('berikan'))
  ) {
    const roleIdMatch =
      prompt.match(/role\s+(?:id\s+)?(\d{15,20})/i) ||
      prompt.match(/(?:role|id)\s*['"]?([a-zA-Z0-9_-]+)/i);
    const userIdMatch =
      prompt.match(/user\s+(\d{15,20})/i) || prompt.match(/member\s+(\d{15,20})/i);
    return {
      pluginName: 'role',
      args: {
        action: 'add',
        userId: userIdMatch ? userIdMatch[1] : 'MOCK_USER_ID',
        roleId: roleIdMatch ? roleIdMatch[1] : 'MOCK_ROLE_ID'
      }
    };
  }

  // 4. Music - Play
  if (query.includes('play') || query.includes('putar') || query.includes('lagu')) {
    let is247 =
      query.includes('24/7') ||
      query.includes('24 jam') ||
      query.includes('menetap') ||
      query.includes('always-on') ||
      query.includes('selamanya');
    let song = prompt
      .replace(/fox/i, '')
      .replace(/tolong/i, '')
      .replace(/play/i, '')
      .replace(/putar/i, '')
      .replace(/lagu/i, '')
      .replace(/musik/i, '')
      .replace(/music/i, '')
      .replace(/24\/7/i, '')
      .replace(/24 jam/i, '')
      .replace(/menetap/i, '')
      .replace(/selamanya/i, '')
      .replace(/dengan auto-next aktif/i, '')
      .replace(/auto-next aktif/i, '')
      .replace(/di\s+<#\d+>/i, '')
      .replace(/<#\d+>/i, '')
      .trim();
    return {
      pluginName: 'music',
      args: {
        action: 'play',
        query: song || 'lofi beats',
        twentyFourSeven: is247
      }
    };
  }

  // 5. Music - Control
  if (query.includes('pause') || query.includes('tangguhkan')) {
    return { pluginName: 'music', args: { action: 'pause' } };
  }
  if (query.includes('resume') || query.includes('lanjutkan')) {
    return { pluginName: 'music', args: { action: 'resume' } };
  }
  if (query.includes('skip') || query.includes('lompati')) {
    return { pluginName: 'music', args: { action: 'skip' } };
  }
  if (query.includes('stop') || query.includes('hentikan')) {
    return { pluginName: 'music', args: { action: 'stop' } };
  }

  // 6. Moderation - Purge
  if (query.includes('purge') || (query.includes('hapus') && query.includes('pesan'))) {
    const amountMatch = prompt.match(/(\d+)\s+pesan/i) || prompt.match(/hapus\s+(\d+)/i);
    return {
      pluginName: 'moderation',
      args: {
        action: 'purge',
        amount: amountMatch ? parseInt(amountMatch[1], 10) : 100
      }
    };
  }

  // 7. Translate
  if (query.includes('terjemah') || query.includes('translate')) {
    const textToTranslate = prompt
      .replace(/translate/i, '')
      .replace(/terjemahkan/i, '')
      .trim();
    return {
      pluginName: 'translate',
      args: {
        text: textToTranslate || 'Hello'
      }
    };
  }

  // 8. Instagram Stalker
  if (query.includes('instagram') || query.includes('ig ') || query.includes('stalk')) {
    const usnMatch = prompt.match(/(?:username|usn|ig|stalk|instagram)\s+['"]?([a-zA-Z0-9_\.]+)/i);
    return {
      pluginName: 'instagram',
      args: {
        username: usnMatch ? usnMatch[1] : 'razael'
      }
    };
  }

  return null;
}

/**
 * Main entrypoint for the AI agent execution.
 * @param {string} prompt - User request string
 * @param {object} context - Execution context { client, guild, channel, member, user }
 * @returns {Promise<object>} The agent execution result
 */
export async function runAgent(prompt, context) {
  const guildId = context.guild?.id || 'GLOBAL';
  const userId = context.user?.id || 'UNKNOWN';

  // 1. Record User request in history
  await recordChat({ guildId, userId, role: 'user', content: prompt });

  // 2. Fetch recent chat history
  const history = await getChatHistory(guildId, userId, 15);
  logger.info(
    `[AI Agent] Processing user prompt: "${prompt}" with ${history.length} messages of history context.`
  );

  const hasApiKey =
    config.nodeEnv !== 'test' &&
    config.groq.apiKey &&
    config.groq.apiKey !== 'YOUR_GROQ_API_KEY_HERE';

  if (hasApiKey) {
    try {
      logger.info(
        `[AI Agent] Running real AI Agent with Groq provider using model ${config.groq.model}`
      );

      // Map plugins to OpenAI function calling format
      const tools = Object.values(plugins).map((p) => ({
        type: 'function',
        function: {
          name: p.name,
          description: p.description,
          parameters: p.parameters
        }
      }));

      // Construct messages list
      const systemMessage = {
        role: 'system',
        content: `You are Fox, a helpful AI assistant and manager for this Discord Server.
You have access to tools for playing music, managing webhooks, roles, moderating, translating, and checking Instagram profiles.
If the user's request matches one of your tools, you MUST call the appropriate tool.
For channel mentions like <#1234567890>, extract only the numeric ID (e.g., 1234567890) for channelId parameters.
Always respond politely in Indonesian unless requested otherwise. Current User: ${context.user?.tag || 'Unknown'}`
      };

      const messages = [
        systemMessage,
        ...history.map((h) => ({
          role: h.role,
          content: h.content
        }))
      ];

      // Request to Groq API
      let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.groq.model,
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.7
        })
      });

      // Handle Tool Calls
      let pluginName = null;
      let pluginArgs = null;
      let toolCallId = null;
      let assistantMessage = null;

      if (!response.ok) {
        let errorDetails = '';
        let errBody = null;
        try {
          errBody = await response.json();
          errorDetails = JSON.stringify(errBody);
        } catch {
          errorDetails = await response.text();
        }

        // Try to recover tool call from failed_generation if any
        if (errBody && errBody.error && errBody.error.failed_generation) {
          const failedGen = errBody.error.failed_generation;
          // Format is like: <function=instagram>{"username": "markzuckerberg"}
          const match = failedGen.match(/<function=(\w+)>\s*({.*?})/s);
          if (match) {
            pluginName = match[1];
            try {
              pluginArgs = JSON.parse(match[2]);
              logger.info(
                `[AI Agent] Groq request returned status 400 (tool_use_failed), but successfully recovered tool call from failed_generation: plugin="${pluginName}"`,
                pluginArgs
              );
            } catch (e) {
              logger.error(`[AI Agent] Failed to parse recovered tool call args:`, e);
            }
          }
        }

        // If we didn't recover a valid tool call, log warning and retry WITHOUT tools
        if (!pluginName || !pluginArgs) {
          logger.warn(
            `[AI Agent] Groq request with tools failed (Status ${response.status}). Details: ${errorDetails}. Retrying WITHOUT tools for compatibility...`
          );
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.groq.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: config.groq.model,
              messages: messages,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            throw new Error(`Groq API returned status ${response.status}`);
          }

          const resBody = await response.json();
          logger.info(`[AI Agent Debug] Groq raw response: ${JSON.stringify(resBody)}`);
          const choice = resBody.choices?.[0];
          assistantMessage = choice?.message;

          if (assistantMessage?.content) {
            // Match standard XML format: <instagram={"username": "test"}></instagram>
            const xmlMatch = assistantMessage.content.match(/<(\w+)=({.*?})><\/\1>/s);
            if (xmlMatch) {
              pluginName = xmlMatch[1];
              try {
                pluginArgs = JSON.parse(xmlMatch[2]);
                logger.info(
                  `[AI Agent] Extracted tool call from text content: plugin="${pluginName}"`,
                  pluginArgs
                );
              } catch (e) {
                logger.error(`[AI Agent] Failed to parse JSON from XML tool tag:`, e);
              }
            } else {
              // Fallback: Match looser XML tags
              const looseMatch = assistantMessage.content.match(
                /<(\w+)>\s*({.*?})["']?\s*<\/(?:\1|function)>/s
              );
              if (looseMatch) {
                pluginName = looseMatch[1];
                try {
                  const cleanedJson = looseMatch[2].trim();
                  pluginArgs = JSON.parse(cleanedJson);
                  logger.info(
                    `[AI Agent] Extracted loose tool call from text content: plugin="${pluginName}"`,
                    pluginArgs
                  );
                } catch (e) {
                  logger.error(`[AI Agent] Failed to parse loose JSON from XML tool tag:`, e);
                }
              }
            }
          }

          // If still no plugin and we have assistantMessage content, handle simple conversational response
          if (!pluginName && assistantMessage?.content) {
            const responseText = assistantMessage.content;
            await recordChat({ guildId, userId, role: 'assistant', content: responseText });
            return {
              agentExecuted: false,
              responseText
            };
          }
        }
      } else {
        const resBody = await response.json();
        logger.info(`[AI Agent Debug] Groq raw response: ${JSON.stringify(resBody)}`);
        const choice = resBody.choices?.[0];
        assistantMessage = choice?.message;

        if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
          const toolCall = assistantMessage.tool_calls[0];
          pluginName = toolCall.function.name;
          pluginArgs = JSON.parse(toolCall.function.arguments);
          toolCallId = toolCall.id;
        } else if (assistantMessage?.content) {
          // Match standard XML format
          const xmlMatch = assistantMessage.content.match(/<(\w+)=({.*?})><\/\1>/s);
          if (xmlMatch) {
            pluginName = xmlMatch[1];
            try {
              pluginArgs = JSON.parse(xmlMatch[2]);
              logger.info(
                `[AI Agent] Extracted tool call from text content: plugin="${pluginName}"`,
                pluginArgs
              );
            } catch (e) {
              logger.error(`[AI Agent] Failed to parse JSON from XML tool tag:`, e);
            }
          } else {
            const looseMatch = assistantMessage.content.match(
              /<(\w+)>\s*({.*?})["']?\s*<\/(?:\1|function)>/s
            );
            if (looseMatch) {
              pluginName = looseMatch[1];
              try {
                const cleanedJson = looseMatch[2].trim();
                pluginArgs = JSON.parse(cleanedJson);
                logger.info(
                  `[AI Agent] Extracted loose tool call from text content: plugin="${pluginName}"`,
                  pluginArgs
                );
              } catch (e) {
                logger.error(`[AI Agent] Failed to parse loose JSON from XML tool tag:`, e);
              }
            }
          }
        }

        // If no plugin but has content, handle simple conversational response
        if (!pluginName && assistantMessage?.content) {
          const responseText = assistantMessage.content;
          await recordChat({ guildId, userId, role: 'assistant', content: responseText });
          return {
            agentExecuted: false,
            responseText
          };
        }
      }

      if (pluginName && pluginArgs) {
        const plugin = plugins[pluginName];
        if (plugin) {
          logger.info(`[AI Agent] Triggering plugin "${pluginName}" with arguments:`, pluginArgs);

          // Inject runtime context overrides
          if (pluginName === 'webhook' && pluginArgs.action === 'create' && context.channel) {
            pluginArgs.channelId = context.channel.id;
          }

          const result = await plugin.execute(pluginArgs, context);

          let finalResponseText =
            result.responseText || `Berhasil mengeksekusi plugin ${pluginName}`;

          if (toolCallId) {
            // Send tool response back to LLM to generate conversational output
            const toolResultMessage = {
              role: 'tool',
              tool_call_id: toolCallId,
              name: pluginName,
              content: JSON.stringify(result)
            };

            const followUpMessages = [
              systemMessage,
              ...messages.slice(1),
              assistantMessage,
              toolResultMessage
            ];

            const followUpResponse = await fetch(
              'https://api.groq.com/openai/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${config.groq.apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: config.groq.model,
                  messages: followUpMessages,
                  temperature: 0.7
                })
              }
            );

            if (followUpResponse.ok) {
              const followUpResBody = await followUpResponse.json();
              finalResponseText =
                followUpResBody.choices?.[0]?.message?.content || finalResponseText;
            }
          }

          await recordChat({ guildId, userId, role: 'assistant', content: finalResponseText });

          return {
            agentExecuted: true,
            pluginUsed: pluginName,
            action: pluginArgs.action,
            result: {
              ...result,
              responseText: finalResponseText
            }
          };
        }
      }

      // Handle simple conversational responses
      if (assistantMessage?.content) {
        const responseText = assistantMessage.content;
        await recordChat({ guildId, userId, role: 'assistant', content: responseText });
        return {
          agentExecuted: false,
          responseText
        };
      }
    } catch (err) {
      logger.error('[AI Agent] Groq execution failed, falling back to mockup classifier:', err);
    }
  }

  // 3. Match plugin action using intent classifier fallback (Mock/Offline mode)
  const classification = classifyIntentMock(prompt);

  if (classification) {
    const { pluginName, args } = classification;
    const plugin = plugins[pluginName];

    if (plugin) {
      logger.info(
        `[AI Agent] [Mock Fallback] Matched plugin "${pluginName}" with arguments:`,
        args
      );

      if (pluginName === 'webhook' && args.action === 'create' && context.channel) {
        args.channelId = context.channel.id;
      }

      try {
        const result = await plugin.execute(args, context);
        const assistantText =
          result.responseText || `Action ${args.action} completed successfully.`;
        await recordChat({ guildId, userId, role: 'assistant', content: assistantText });

        return {
          agentExecuted: true,
          pluginUsed: pluginName,
          action: args.action,
          result
        };
      } catch (err) {
        logger.error(`[AI Agent] Plugin execution failed:`, err);
        return {
          agentExecuted: true,
          pluginUsed: pluginName,
          success: false,
          error: err.message
        };
      }
    }
  }

  const responseText = `Halo! Saya adalah Fox (AI). Saya tidak dapat memahami atau menjalankan perintah tersebut secara otomatis. Silakan tanyakan hal lain atau gunakan fitur-fitur seperti buat webhook, memutar lagu, atau menerjemahkan kalimat.`;
  await recordChat({ guildId, userId, role: 'assistant', content: responseText });

  return {
    agentExecuted: false,
    responseText
  };
}
