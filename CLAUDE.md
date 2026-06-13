# OpenZero Discord Bot: Claude Developer Manual

Welcome, Claude! This file outlines the **OpenZero Discord Bot** codebase for Anthropic Claude-based agents or developers. It covers code architecture, global config properties, interaction patterns (Slash Commands & Buttons), and maintenance scripts.

---

## Codebase Architecture Overview

The codebase is built on **Node.js** using **discord.js v14.26+** (supporting Discord Message Components V2) with ES modules syntax.

### Key Components:
- **`src/index.js`**: Bootstraps the bot. Configures essential intents (`Guilds`, `GuildMessages`, `MessageContent`, `DirectMessages`, `GuildPresences`), imports the global SemVer version, and uncaught error handlers.
- **`src/version.js`**: Stores the global version code in SemVer (`1.7.60`) format, synchronized from the root `VERSION` file.
- **`src/config.js`**: Wrapper re-exporting the root global configuration `config.js`.
- **`src/utils/logger.js`**: Custom Winston logging wrapper with Chalk formatting.
- **`src/utils/v2Embed.js`**: Fluid wrapper class translating basic metadata (Title, Description, Color, ActionRows) into Discord's new Components V2 layout.
- **`src/utils/color.js`**: Color strategy classes (SpecificColor, SequentialColor, RandomColor).
- **`src/utils/i18n.js`**: i18n helper utility providing the `t(key, locale, replaceData)` translation helper. Default bot locale is set to English (`en`). Dict locales are situated under `src/locales/` (`id.json` and `en.json`).
- **`src/utils/supabase.js`**: Connects to Supabase to insert and retrieve message records. Safely falls back to `src/utils/database.js` local JSON methods if credentials are not specified.
- **`src/utils/database.js`**: Local JSON storage utility for handling local message counts and logging fallbacks.
- **`src/handlers/`**: Houses loaders for commands and events.
- **`src/events/`**: Registers message listeners, command executors, cooldown validations, and button click interactions.

---

## Global Configuration (`config.js`)

Centralized parameters are defined in the root `config.js`. It features a coloring strategy pattern (`colorStrategy`) to customize how embed accent colors are resolved:
```javascript
import { SequentialColor } from './src/utils/color.js';

export const config = {
  // Global Bot Credentials & Environment config
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
  sentryDsn: process.env.SENTRY_DSN,

  // Local JSON Database Configuration
  database: {
    dir: dbDir,
    name: dbName,
    path: dbPath
  },

  // Color Strategy: SpecificColor, SequentialColor, or RandomColor
  colorStrategy: new SequentialColor([
    0x6e4cc1, // Purple (#6e4cc1)
    0x242221, // Dark Black (#242221)
    0xf58e25, // Orange (#f58e25)
    0xfdfdfd  // White (#fdfdfd)
  ]),
  get embedColor() {
    return this.colorStrategy.getColor();
  }
};
```

---

## Interaction Management

### Slash Commands & Context Menus (`src/commands/`)
Slash commands and Context Menu Commands are loaded dynamically. Each command file exports a default object:
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('cmdname')
    .setDescription('description')
    .setDMPermission(false),
  async execute(interaction) {
    // Execution logic
  }
};
```

#### Cooldowns & Anti-Spam
A 3-second cooldown is enforced globally per command per user in `src/events/interactionCreate.js`. Attempting to spam commands will return an ephemeral `V2Embed` indicating the remaining wait time.

#### Current System Commands:
- **`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`** (Music Player): Play and control music playback in voice channels. Uses a dual pipeline resolver: `yt-dlp` acts as the primary resolver with signature decryption arguments (`--js-runtimes node`, `--remote-components ejs:github`, `--extractor-args "youtube:player_client=android,web"`) and falls back to `play-dl` for non-rate-limit errors. If `yt-dlp` fails due to rate limits, it aborts immediately to bypass `play-dl` and prevent unhandled promise rejections.
- **`/webhook`** (Utility): Create or view details of webhooks with copy URL buttons.
- **`/role`** (Utility): Assign, remove, or view positions and IDs of server roles.
- **`/music-search`** (Utility): Query Apple iTunes Music API for tracks. Show cover art, navigate results page-by-page, fetch lyrics via LRCLIB integration with a button click, and link direct previews. Utilizes Discord Message Components V2 and i18n support.
- **`/help` & `/menu`** (Utility): Shows a beautifully styled interactive category navigation menu for all bot commands using `V2Embed`, custom Font Awesome symbols (e.g. `oz_border_all` for All category, `oz_tools` for Utility, `oz_black_tie` for Moderation, and `oz_music` for Music), and full translation support. Features a customizable title format: `<icon> Help Menu`. Can be set up via `npm run setup-emojis`.
- **`/purge`** (Moderation): Bulk delete messages (1-100, default is 100). Automatically filters out messages older than 14 days to comply with Discord API limits.
- **`Translate to English`** (Context Menu Command): Translates any targeted message to English. Accessed via right-clicking/long-pressing a message -> **Apps** -> **Translate to English**. Powered by the lightweight `@vitalets/google-translate-api` package.
- **`User Info`** (Context Menu Command - Consolidated): Consolidated user profiling command showing global properties (ID, Username, Bot/System status, badges, banner color), server-specific details (Roles, Server Nickname, server avatar, boosting status, key permissions), joined dates, status/presence activity, and message counts. Includes download action buttons for global avatar, server avatar, and banner. Fully localizable (supports ID and EN-US, defaults to EN).
- **`Messages Record`** (Context Menu Command): Retrieves and lists the last 15 messages sent by the user in this guild over the past 7 days. Facilitates behavioral monitoring. Fully localizable.
- **`/fox`** (AI Agent / Utility): Direct prompt assistant query. Supports **Groq API** (`gemma2-9b-it`) and uses function calling schema to trigger plugins automatically. Also responds to mentions/pings.
- **`/plugin`** (Plugin Manager / Utility): Administrators can view (`/plugin list`), enable (`/plugin install`), and disable (`/plugin uninstall`) AI plugins. Command registrations to the Discord API are dynamically added/removed instantly.
- **`/bad-word`** (Moderation / Bad Word Plugin): Manage custom bad words. Defaults to disabled (uninstalled) and can be activated with `/plugin install badWord`. Features `add`, `remove`, and `list` subcommands. Words are dynamically compiled into pre-filter regex matching spaces and repeated character variations.
- **`/scam-link`** (Moderation): Manage custom blocked scam/phishing links. Admin-only command (`ManageGuild`) with `add`, `remove`, and `list` subcommands. Changes are synced with the custom database cache.

---

## AI Agent & Plugin Extension Architecture

The bot features a highly modular, decoupled AI agent architecture:
*   **Plugins (`src/plugins/`)**: Self-contained ES modules that expose standard manifest structures (name, description, parameter schemas) and `execute` hooks.
*   **AI Manager (`src/utils/aiManager.js`)**: Resolves prompt actions, handles the Groq Chat Completions client flow, and falls back to a local offline mockup matcher during testing or if the API key is not configured. Automatically retries failed tool-calling requests without tools if the model (like `gemma2-9b-it`) does not support function calling.
*   **Chat History (`src/utils/aiHistory.js`)**: Persists sequential thread history in Supabase table `ai_chat_history` with an automatic failover to the local JSON file database (`data/database.json`).
*   **Plugin Controller (`src/utils/pluginManager.js`)**: Tracks which plugins are active, mapping them to command names and allowing `/plugin` to dynamically load/unload commands in [src/handlers/commandHandler.js](file:///data/data/com.termux/files/home/openzero-local/src/handlers/commandHandler.js).

---

## Supabase Logging & 7-Day Pruning
*   **Logging:** All guild message events trigger `recordMessage` which saves the message details to Supabase. Operates using `upsert` with `onConflict: 'message_id'` to avoid duplicate key exceptions.
*   **Pruning:** A cleanup task running on startup and repeating every 24 hours deletes message records older than 7 days (`cleanupOldMessages`).
*   **Fallback:** If `SUPABASE_URL` and `SUPABASE_KEY` are not set in `.env`, the bot silently logs messages locally in `data/database.json`.

---

## AI Moderation System (3-Layer Filtering)
- **Layer 1 (Pre-filter):** Validates message content against regex patterns in `src/moderation/preFilter.js`. It dynamically parses custom bad words from the database, compiling them into patterns matching spacing and symbol dividers (e.g. `p a n t e k` or `p*a*n*t*e*k`).
- **Layer 2 (User Cooldown):** Limits AI scan requests in `src/moderation/cooldown.js` to a 10-second window per user.
- **Layer 3 (AI Verification):** Calls the Groq Completions API with the `llama-3.1-8b-instant` model to confirm context in `src/moderation/aiAnalyzer.js`. Returns `CLEAN` to ignore safe flags.

---

## Scam Link & Anti-Phishing Filter System
- **Initialization & Local Cache:** The filter (`src/moderation/scamFilter.js`) downloads public scam links on startup from a remote repo, caching them locally in `data/scam_links.json`. It refreshes the list in-memory every 12 hours.
- **Custom Blacklist:** Custom scam/phishing domains are configured using the `/scam-link` slash command, storing them in Supabase's `custom_scam_links` table (with local fallback to `data/database.json`).
- **Detection & Action:** On every message (`src/events/messageCreate.js`), domains are extracted and matched (including parent/subdomain checks). If a match is found:
  - The message is deleted instantly.
  - A user warning is sent using a localized V2Embed.
  - A notification is sent to the `#moderator-only` log channel, separating the admin ping text and the V2 components to prevent legacy field compatibility errors.
  - The log embed formats distinct sections using Discord Components V2 `SeparatorBuilder` with dividers and spacing.

---

## Posting & Editing Server Rules (`src/scripts/sendRules.js`)

To publish or update rules in the rules channel, run the script from the terminal:
```bash
npm run send-rules
```

## Logging & Console Formatting

The system uses `winston` and `chalk` in `src/utils/logger.js` to structure and output clean console logs. It resolves the following log types with unique color-coding:
- **`INIT` (Magenta)**: Matches startup, bot initialization, and patch scripts (e.g. `patchPlayDl`).
- **`MSG` (Green)**: Matches guild and DM text message traffic logs.
- **`FETCH` (Blue)**: Matches files, API, and content fetch operations.
- **`CMD` (BlueBright)**: Matches slash command deployments, API registers, etc.
- **`OBTAINIUM` (YellowBright)**: Matches Obtainium Watcher execution logs.
- **`SUCCSESS`/`DONE` (Green)**: Successful completions.
- **`WARN` (Yellow)**: System warnings and fallbacks.
- **`ERROR`/`404` (Red)**: Exceptions, errors, and missing resources.
- **`UNKNOWN` (Gray)**: Fallback category.

---

## Running & Testing the Project
- Install dependencies: `npm install`
- Run Jest test suites: `npm test`
- Run production bot: `npm start`
- Run development bot: `npm run dev`
- Bump version code automatically: `npm run version:bump [major|minor|patch] [amount]` (defaults to `patch` and `auto` which calculates git commit count since last version update, e.g., `npm run version:bump patch 20`)
- Set arbitrary custom version: `npm run version:bump set "<version_name>"` (e.g. `npm run version:bump set "P-1.8"` or `npm run version:bump set "Prototype 1.8"`)

---

## Git Branching & Release Pipeline

- **`release` (Default)**: Represents the stable codebase. Changes here are merged/committed by **Razael-Fox Bot**.
- **`dev`**: Active development branch for developers using personal credentials (`razaeldotexe`).
- **Automated Release Scheduler**: A GitHub Actions workflow (`.github/workflows/scheduled-release.yml`) runs on a cron schedule every Saturday at 19:00 WIB (12:00 UTC). It automatically merges `dev` into `release` branch, runs tests, bumps the version using `npm run version:bump set "P-1.8"`, and pushes to the `release` branch using the bot credentials.
