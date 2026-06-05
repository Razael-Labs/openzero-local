# OpenZero Discord Bot: AI Coding Agents Instructions

Welcome, Agent! This guide is created for LLM Coding Agents (such as Antigravity, Claude Engineer, or SWE-agent) to help you understand the architectural guidelines of the **OpenZero Discord Bot** codebase, locate files quickly, and write code that conforms to the existing coding standards.

---

## Codebase Map & Layout

Here is the directory structure you must adhere to:

```text
openzero-local/
├── .env                  # Environment secrets (Token, Client ID, Guild ID, Supabase URL/Key)
├── .env.example          # Template for secrets
├── package.json          # Dependency and script manager (ES Modules format)
├── GEMINI.md             # Guide for Gemini Developers
├── AGENTS.md             # This file (AI Agents guide)
├── CLAUDE.md             # Guide for Claude Developers
└── src/
    ├── index.js          # Entrypoint (initializes client, intent configurations, global error catchers)
    ├── version.js        # Global version configuration (CalVer format)
    ├── config.js         # Global configurations (default colors, presence status)
    ├── locales/          # Translation files for i18n
    │   ├── id.json       # Indonesian dictionary
    │   └── en.json       # English dictionary
    ├── utils/
    │   ├── logger.js     # Winston & Chalk logger utility (logs to console and logs/ folder)
    │   ├── v2Embed.js    # Custom fluent V2Embed helper wrapper for Discord Message Components V2
    │   ├── i18n.js       # Dynamic translation engine for localized input/output
    │   ├── database.js   # Local JSON database utility (msg counts and logging fallback)
    │   └── supabase.js   # Supabase database wrapper (message records with 7-day auto cleanup)
    ├── handlers/
    │   ├── commandHandler.js # Dynamic slash command loader & REST API deployment router
    │   └── eventHandler.js   # Dynamic event loader (registers ready, messageCreate, interactionCreate)
    ├── events/
    │   ├── ready.js          # On-ready: Sets presence activity, deploys slash commands, runs 7-day message cleanup
    │   ├── messageCreate.js  # Message observer logging every guild message to Supabase/Local database
    │   └── interactionCreate # Interaction router (splits into slash commands and buttons, handles cooldowns)
    ├── commands/
    │   ├── utility/
    │   │   ├── ping.js       # Slash command /ping (demonstrates button inside V2Embed container)
    │   │   ├── hello.js      # Slash command /hello (demonstrates optional user arguments)
    │   │   ├── webhook.js    # Slash command /webhook (create / info webhooks with button link)
    │   │   ├── role.js       # Slash command /role (add / remove / id configurations)
    │   │   ├── musicSearch.js # Slash command /music-search (iTunes search API, LRCLIB lyrics lookup, preview button link)
    │   │   ├── translate.js  # Context Menu Command 'Translate to English' via Apps selection
    │   │   ├── userInfo.js   # Context Menu 'User Info' (Consolidated global & guild profile)
    │   │   └── messagesRecord.js # Context Menu 'Messages Record' (7-day chat history inspector)
    │   └── moderation/
    │       ├── ban.js        # Slash command /ban
    │       ├── deafen.js     # Slash command /deafen
    │       ├── kick.js       # Slash command /kick
    │       ├── mute.js       # Slash command /mute
    │       ├── purge.js      # Slash command /purge (deletes 1-100 messages, default 100)
    │       ├── timeout.js    # Slash command /timeout
    │       ├── undeafen.js   # Slash command /undeafen
    │       └── unmute.js     # Slash command /unmute
    └── scripts/
        ├── sendRules.js  # Maintenance script to post/edit guild rules
        └── updateVersion.js # Script to automatically update version to CalVer format
```

---

## Agent Coding Rules & Standards

When extending or editing this codebase, you **must** strictly follow these rules:

### 1. JavaScript Standards
- **ES Modules**: We use `"type": "module"` in `package.json`. You must use `import / export` syntax, not CommonJS `require / module.exports`.
- **Imports**: When importing local files, you **must** specify the file extension (e.g., `import { config } from '../config.js';` instead of `../config`).

### 2. Slash & Context Menu Commands Extension
- All commands must be created under a category subfolder inside `src/commands/` (e.g. `src/commands/moderation/`).
- Export a default object containing:
  - `data`: a `SlashCommandBuilder` or `ContextMenuCommandBuilder` instance.
  - `execute(interaction)`: an async function executing the command.
- Set commands as Guild-only by adding `.setDMPermission(false)` to the builder if they are not meant for direct messages.
- Always use `.setNameLocalizations()` or `.setDescriptionLocalizations()` for command interface translating in Discord clients.

### 3. Events & Cooldowns
- All event listeners must be created in `src/events/`.
- The `interactionCreate` event listener contains a **3-second cooldown** system per command per user. If adding high-frequency features, verify they are compatible or exclude them from the global map if necessary.

### 4. Components V2 & Embedding
- Do **not** use legacy `EmbedBuilder` for messages. Always use the kustom helper class **`V2Embed`** (located at `src/utils/v2Embed.js`).
- Default colors in `V2Embed` are resolved sequentially from `config.embedColors` (defined in `src/config.js`) on every instantiation.
- When sending a `V2Embed` in a reply or edit, you must pass the `MessageFlags.IsComponentsV2` flag:
  ```javascript
  import { MessageFlags } from 'discord.js';
  import { V2Embed } from '../../utils/v2Embed.js';
  
  const embed = new V2Embed().setTitle('Title').setDescription('Content').build();
  await interaction.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
  ```

### 5. Interactive Routing (Buttons, Select Menus)
- Any button click or select menu interaction will trigger the `interactionCreate` event.
- If you add custom components with a `custom_id`, you must add a check block inside `src/events/interactionCreate.js` to intercept the interaction, call `await interaction.deferUpdate()`, run your logic, and call `interaction.editReply(...)` to update.

### 6. Internationalization (i18n) Engine
- Outputs must be translated dynamically using the `t` utility located at `src/utils/i18n.js`:
  ```javascript
  import { t } from '../../utils/i18n.js';
  const text = t('keyName', interaction.locale, { param: 'value' });
  ```
- Make sure keys are present in both `src/locales/id.json` and `src/locales/en.json`.

### 7. Dual Database Pipeline (Supabase + Local fallback)
- Logging/Audit records should run through `src/utils/supabase.js`.
- Always ensure there is a clean fallback to `src/utils/database.js` local JSON methods when Supabase is not configured. This preserves offline testing and keeps the CI/CD test suite green without external API calls.

---

## Logging Guidelines
Always utilize the custom logger imported from `src/utils/logger.js`.
- Use `logger.info('message')` for standard info.
- Use `logger.warn('message')` for non-blocking warnings.
- Use `logger.error('message', error)` for catches and exceptions.

## Unit Testing
Before committing or pushing any features, make sure all tests pass:
```bash
npm test
```
Test files are situated under the `tests/` directory (e.g. `tests/moderation.test.js`, `tests/translate.test.js`, `tests/musicSearch.test.js`).

---

## Git Branching & Release Pipeline Guidelines

As an AI Agent, you must adhere to the branching workflow rules:
* **Active Development**: All code modifications, new feature additions, and script improvements must be written, committed, and pushed on the **`dev`** branch using personal developer credentials (`razaeldotexe`).
* **Stable Releases**: Changes must be merged into the **`release`** branch (default branch) using **Razael-Fox Bot** credentials (`bot@razael-fox.my.id`). Pushing to `release` triggers the `.github/workflows/package.yml` GitHub Actions pipeline, which packages the repository files into `.tar.gz` and deploys it to the Releases page. Do not push code directly to `release` from your own git profile; always use the bot credentials when merging/committing on this branch.
