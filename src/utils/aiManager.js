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

  // 9. Plugin Install/Uninstall
  if (
    query.includes('plugin') &&
    (
      // Ensure we match specific actions explicitly and avoid false matching queries like "tak terinstall" / "belum terinstall"
      /\b(?:install|pasang|aktifkan|uninstall|nonaktifkan|copot)\b/.test(query)
    ) &&
    !query.includes('apa ') &&
    !query.includes('what ') &&
    !query.includes('list') &&
    !query.includes('daftar') &&
    !query.includes('belum') &&
    !query.includes('tidak') &&
    !query.includes('tak')
  ) {
    const isInstall =
      query.includes('install') || query.includes('pasang') || query.includes('aktifkan');
    const nameMatch =
      prompt.match(/(?:plugin|nama|name)\s+['"]?([a-zA-Z0-9_-]+)/i) ||
      prompt.match(
        /(?:install|uninstall|pasang|copot|aktifkan|nonaktifkan)\s+([a-zA-Z0-9_-]+)/i
      );
    
    let resolvedName = nameMatch ? nameMatch[1] : '';
    
    // Fallback: If the parsed name is not a valid plugin key, search for a known plugin name in the query string
    if (resolvedName && !plugins[resolvedName]) {
      const knownPlugin = Object.keys(plugins)
        .filter(k => k !== 'plugin')
        .find(k => query.includes(k.toLowerCase()));
      if (knownPlugin) {
        resolvedName = knownPlugin;
      }
    }

    return {
      pluginName: 'plugin',
      args: {
        action: isInstall ? 'install' : 'uninstall',
        name: resolvedName
      }
    };
  }

  // 10. Server Stats
  if (
    (query.includes('member') || query.includes('channel') || query.includes('saluran') || query.includes('statistik') || query.includes('stats')) &&
    (query.includes('server') || query.includes('guild') || query.includes('discord'))
  ) {
    return {
      pluginName: 'serverStats',
      args: {}
    };
  }

  return null;
}

/**
 * Safely parse JSON strings, removing trailing commas in objects/arrays.
 * @param {string} str - JSON string to parse
 * @returns {any} Parsed JSON object
 */
export function safeJsonParse(str) {
  if (typeof str !== 'string') return str;
  const sanitized = str.trim().replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(sanitized);
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

  let resolvedPrompt = prompt;
  if (context.referencedMessage) {
    let refContent = context.referencedMessage.content || '';
    if (!refContent && context.referencedMessage.embeds && context.referencedMessage.embeds.length > 0) {
      const embed = context.referencedMessage.embeds[0];
      refContent = [embed.title, embed.description].filter(Boolean).join(' - ');
    }
    resolvedPrompt = `[Context: "${refContent}"] ${prompt}`;
  }

  // 1. Record User request in history
  await recordChat({ guildId, userId, role: 'user', content: resolvedPrompt });

  // Pre-check for serverStats queries to prevent hallucination when plugin is uninstalled
  const query = resolvedPrompt.toLowerCase().trim();
  const isPluginManagement = query.includes('plugin') && 
    (/\b(install|uninstall|pasang|copot|aktifkan|nonaktifkan)\b/.test(query));

  if (
    !isPluginManagement &&
    (query.includes('member') || query.includes('channel') || query.includes('saluran') || query.includes('statistik') || query.includes('stats')) &&
    (query.includes('server') || query.includes('guild') || query.includes('discord') || query.includes('ini'))
  ) {
    const { getInstalledPlugins } = await import('./pluginManager.js');
    const installedPlugins = context.installedPluginsForTesting || await getInstalledPlugins(guildId);
    const isTest = process.env.NODE_ENV === 'test';
    const isBypass = isTest && !context.enablePluginCheckForTesting;

    if (!isBypass && guildId !== 'GLOBAL') {
      if (!installedPlugins.includes('serverStats')) {
        const { V2Embed } = await import('./v2Embed.js');
        const systemAlertText = `⚠️ [SYSTEM DETECTION] Required plugin "serverStats" is not installed on this server. Ask an administrator to enable it using: /plugin install serverStats`;

        const embed = new V2Embed()
          .setTitle('System Alert: Missing Plugin 🛑')
          .setDescription(
            `**Detected Intent:** Server Statistics / Member & Channel Query\n` +
            `**Required Module:** \`serverStats\`\n` +
            `**Status:** Not installed or disabled in this guild.\n\n` +
            `Please instruct a server administrator to run the following slash command to enable this capability:\n` +
            `\`\`\`\n/plugin install serverStats\n\`\`\``
          )
          .build();

        await recordChat({ guildId, userId, role: 'assistant', content: systemAlertText });
        return {
          agentExecuted: true,
          pluginUsed: 'serverStats',
          action: 'error',
          result: {
            success: false,
            responseText: systemAlertText,
            embeds: [embed]
          }
        };
      } else {
        // If serverStats is installed, execute it directly to ensure 100% accuracy and bypass LLM hallucination
        const plugin = plugins['serverStats'];
        if (plugin) {
          logger.info(`[AI Agent] serverStats is installed. Routing stats query directly to plugin.`);
          const result = await plugin.execute({}, context);
          await recordChat({ guildId, userId, role: 'assistant', content: result.responseText });
          return {
            agentExecuted: true,
            pluginUsed: 'serverStats',
            action: 'get',
            result
          };
        }
      }
    }
  }

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

      const userLocale = context.locale || context.guild?.preferredLocale || config.language || 'en';
      const targetLang = userLocale.toLowerCase().startsWith('id') ? 'id' : 'en';
      const responseLangInstruction = targetLang === 'id'
        ? 'Always respond politely in Indonesian unless requested otherwise.'
        : 'Always respond politely in English unless requested otherwise.';

      // Get installed plugins for the guild to let AI know the status dynamically
      const { getInstalledPlugins } = await import('./pluginManager.js');
      const installedPlugins = context.installedPluginsForTesting || await getInstalledPlugins(guildId);
      const installedListStr = guildId === 'GLOBAL' ? 'all' : (installedPlugins.length > 0 ? installedPlugins.join(', ') : 'none');

      // Construct messages list
      const systemMessage = {
        role: 'system',
        content: `You are Fox, a helpful AI assistant and manager for this Discord Server.
You have access to tools for playing music, managing webhooks, roles, moderating, translating, checking Instagram profiles, checking server statistics, and installing/uninstalling plugins.
Currently installed/enabled plugins in this server: ${installedListStr}.
If the user's request matches one of your tools, you MUST call the appropriate tool.
If the user asks for server statistics, member counts, or channel counts, you must use the "serverStats" tool.
If a user requests information or actions that require a plugin/tool that is NOT currently installed/enabled, you MUST NOT guess, hallucinate, or invent the details. Instead, politely inform the user that the plugin (e.g. "serverStats") is not enabled/installed, and instruct them to install it using the "/plugin install <plugin_name>" command.
For channel mentions like <#1234567890>, extract only the numeric ID (e.g., 1234567890) for channelId parameters.
${responseLangInstruction} Current User: ${context.user?.tag || 'Unknown'}`
      };

      const messages = [
        systemMessage,
        ...history.map((h) => ({
          role: h.role,
          content: h.content
        }))
      ];

      // Append stats reminder at the end if serverStats is installed and requested
      const isStats = (query.includes('member') || query.includes('channel') || query.includes('saluran') || query.includes('statistik') || query.includes('stats')) &&
        (query.includes('server') || query.includes('guild') || query.includes('discord') || query.includes('ini'));
      if (isStats && installedPlugins.includes('serverStats')) {
        messages.push({
          role: 'system',
          content: 'REMINDER: You MUST call the "serverStats" tool to fetch real-time server statistics. Do NOT guess or invent numbers, and do NOT reuse numbers from the chat history. Call the tool now.'
        });
      }

      // Append plugin management reminder if user requests plugin installation/uninstallation
      const isPluginReq = query.includes('plugin') && 
        (/\b(install|uninstall|pasang|copot|aktifkan|nonaktifkan)\b/.test(query) || query.includes('install kan') || query.includes('aktifkan untukku'));
      if (isPluginReq) {
        messages.push({
          role: 'system',
          content: 'REMINDER: You MUST call the "plugin" tool to install or uninstall plugins. Do NOT pretend that the plugin was successfully installed/uninstalled or respond that it was done without calling the "plugin" tool first.'
        });
      }

      // Request to Groq API
      let loopCount = 0;
      const maxLoops = 5;
      let assistantMessage = null;
      let executedPlugins = [];
      let finalResponseText = '';
      let isAgentExecuted = false;

      while (loopCount < maxLoops) {
        let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.groq.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: config.groq.model,
            messages: messages,
            ...(loopCount === 0 ? { tools: tools, tool_choice: 'auto' } : {}),
            temperature: 0.7
          })
        });

        let pluginName = null;
        let pluginArgs = null;
        let toolCallId = null;

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
          if (loopCount === 0 && errBody && errBody.error && errBody.error.failed_generation) {
            const failedGen = errBody.error.failed_generation;
            const match = failedGen.match(/<function=(\w+)>\s*({.*?})/s);
            if (match) {
              pluginName = match[1];
              try {
                pluginArgs = safeJsonParse(match[2]);
                assistantMessage = { role: 'assistant', content: null, tool_calls: [] };
                logger.info(
                  `[AI Agent] Groq request returned status 400 (tool_use_failed), but successfully recovered tool call from failed_generation: plugin="${pluginName}"`,
                  pluginArgs
                );
              } catch (e) {
                logger.error(`[AI Agent] Failed to parse recovered tool call args:`, e);
              }
            }
          }

          // If we didn't recover a valid tool call, retry WITHOUT tools
          if (!pluginName || !pluginArgs) {
            logger.warn(
              `[AI Agent] Groq request with tools failed (Status ${response.status}). Retrying WITHOUT tools for compatibility...`
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
            const choice = resBody.choices?.[0];
            assistantMessage = choice?.message;
          }
        } else {
          const resBody = await response.json();
          logger.info(`[AI Agent Debug] Groq raw response: ${JSON.stringify(resBody)}`);
          const choice = resBody.choices?.[0];
          assistantMessage = choice?.message;
        }

        if (!assistantMessage) break;

        // Push assistant response to messages for history context of the next iterations
        messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls
        });

        // Determine tool calls
        let xmlToolCalls = [];
        if (assistantMessage.content) {
          // Match standard XML formats, looser XML tags, and malformed tags
          const regex1 = /<(\w+)=({.*?})><\/\1>/g;
          let match;
          while ((match = regex1.exec(assistantMessage.content)) !== null) {
            xmlToolCalls.push({ name: match[1], args: safeJsonParse(match[2]) });
          }

          const regex2 = /<(\w+)>\s*({.*?})\s*<\/(?:\1|function)>/g;
          let match2;
          while ((match2 = regex2.exec(assistantMessage.content)) !== null) {
            xmlToolCalls.push({ name: match2[1], args: safeJsonParse(match2[2]) });
          }

          const regex3 = /<function=(\w+)>\s*({.*?})\s*(?:<\/function>|<\/\1>|<function>|$)/g;
          let match3;
          while ((match3 = regex3.exec(assistantMessage.content)) !== null) {
            xmlToolCalls.push({ name: match3[1], args: safeJsonParse(match3[2]) });
          }
        }

        const toolCalls = assistantMessage.tool_calls || [];
        const hasToolCalls = toolCalls.length > 0 || xmlToolCalls.length > 0 || (pluginName && pluginArgs);

        if (!hasToolCalls) {
          finalResponseText = assistantMessage.content || '';
          break;
        }

        // Process tool calls from Groq or recovered tool call
        if (toolCalls.length > 0 || (pluginName && pluginArgs)) {
          const activeToolCalls = toolCalls.length > 0 
            ? toolCalls 
            : [{ id: 'recovered', function: { name: pluginName, arguments: JSON.stringify(pluginArgs) } }];

          for (const toolCall of activeToolCalls) {
            const pName = toolCall.function.name;
            const pArgs = safeJsonParse(toolCall.function.arguments);
            const plugin = plugins[pName];
            let result;

            if (plugin) {
              const { getInstalledPlugins } = await import('./pluginManager.js');
              const installedPlugins = context.installedPluginsForTesting || await getInstalledPlugins(guildId);
              const isTest = process.env.NODE_ENV === 'test';
              const isBypass = isTest && !context.enablePluginCheckForTesting;

              if (!isBypass && guildId !== 'GLOBAL' && pName !== 'plugin' && !installedPlugins.includes(pName)) {
                result = { success: false, error: `Plugin **${pName}** belum diaktifkan/diinstal di server ini. Silakan minta administrator untuk mengaktifkannya terlebih dahulu.` };
              } else {
                try {
                  logger.info(`[AI Agent] Triggering plugin "${pName}" with arguments:`, pArgs);
                  if (pName === 'webhook' && pArgs.action === 'create' && context.channel) {
                    pArgs.channelId = context.channel.id;
                  }
                  result = await plugin.execute(pArgs, context);
                } catch (err) {
                  result = { success: false, error: err.message };
                }
              }
            } else {
              result = { success: false, error: `Plugin ${pName} not found.` };
            }

            isAgentExecuted = true;
            executedPlugins.push({ name: pName, action: pArgs.action, result });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: pName,
              content: JSON.stringify(result)
            });
          }
        } 
        // Process XML tool calls
        else if (xmlToolCalls.length > 0) {
          for (const xmlCall of xmlToolCalls) {
            const pName = xmlCall.name;
            const pArgs = xmlCall.args;
            const plugin = plugins[pName];
            let result;

            if (plugin) {
              const { getInstalledPlugins } = await import('./pluginManager.js');
              const installedPlugins = context.installedPluginsForTesting || await getInstalledPlugins(guildId);
              const isTest = process.env.NODE_ENV === 'test';
              const isBypass = isTest && !context.enablePluginCheckForTesting;

              if (!isBypass && guildId !== 'GLOBAL' && pName !== 'plugin' && !installedPlugins.includes(pName)) {
                result = { success: false, error: `Plugin **${pName}** belum diaktifkan/diinstal di server ini. Silakan minta administrator untuk mengaktifkannya terlebih dahulu.` };
              } else {
                try {
                  logger.info(`[AI Agent] Triggering plugin "${pName}" (XML parsed) with arguments:`, pArgs);
                  if (pName === 'webhook' && pArgs.action === 'create' && context.channel) {
                    pArgs.channelId = context.channel.id;
                  }
                  result = await plugin.execute(pArgs, context);
                } catch (err) {
                  result = { success: false, error: err.message };
                }
              }
            } else {
              result = { success: false, error: `Plugin ${pName} not found.` };
            }

            isAgentExecuted = true;
            executedPlugins.push({ name: pName, action: pArgs?.action, result });

            messages.push({
              role: 'user',
              content: `System notification: Tool ${pName} executed. Result: ${JSON.stringify(result)}`
            });
          }
        }

        loopCount++;
      }

      if (finalResponseText === '' && assistantMessage) {
        finalResponseText = assistantMessage.content || 'Tugas selesai dijalankan.';
      }

      if (isAgentExecuted) {
        const lastExec = executedPlugins[executedPlugins.length - 1];
        await recordChat({ guildId, userId, role: 'assistant', content: finalResponseText });
        return {
          agentExecuted: true,
          pluginUsed: lastExec.name,
          action: lastExec.action,
          result: {
            ...lastExec.result,
            responseText: finalResponseText
          }
        };
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
  const classification = classifyIntentMock(resolvedPrompt);

  if (classification) {
    const { pluginName, args } = classification;
    const plugin = plugins[pluginName];

    if (plugin) {
      // Check if plugin is installed for this guild (excluding the manager itself)
      const { getInstalledPlugins } = await import('./pluginManager.js');
      const installedPlugins = context.installedPluginsForTesting || await getInstalledPlugins(guildId);
      const isTest = process.env.NODE_ENV === 'test';
      const isBypass = isTest && !context.enablePluginCheckForTesting;
      
      if (!isBypass && guildId !== 'GLOBAL' && pluginName !== 'plugin' && !installedPlugins.includes(pluginName)) {
        const notInstalledText = `Maaf, plugin **${pluginName}** belum diaktifkan/diinstal di server ini. Silakan minta administrator untuk mengaktifkannya terlebih dahulu menggunakan perintah \`/plugin install ${pluginName}\`.`;
        await recordChat({ guildId, userId, role: 'assistant', content: notInstalledText });
        return {
          agentExecuted: false,
          responseText: notInstalledText
        };
      }

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
