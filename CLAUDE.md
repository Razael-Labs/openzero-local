# OpenZero Discord Bot: Claude Developer Manual

Welcome, Claude! This file outlines the **OpenZero Discord Bot** codebase for Anthropic Claude-based agents or developers. It covers code architecture, global config properties, interaction patterns (Slash Commands & Buttons), and maintenance scripts.

---

## Codebase Architecture Overview

The codebase is built on **Node.js** using **discord.js v14.26+** (supporting Discord Message Components V2) with ES modules syntax.

### Key Components:
- **`src/index.js`**: Bootstraps the bot. Configures essential intents (`Guilds`, `GuildMessages`, `MessageContent`, `DirectMessages`, `GuildPresences`), imports the global CalVer version, and uncaught error handlers.
- **`src/version.js`**: Stores the global version code in CalVer (`YY.MM.DD`) format. Updated automatically upon release deployment.
- **`src/config.js`**: Holds global configurations, including sequential color selection for embeds and activity details.
- **`src/utils/logger.js`**: Custom Winston logging wrapper with Chalk formatting.
- **`src/utils/v2Embed.js`**: Fluid wrapper class translating basic metadata (Title, Description, Color, ActionRows) into Discord's new Components V2 layout.
- **`src/utils/i18n.js`**: i18n helper utility providing the `t(key, locale, replaceData)` translation helper. Dict locales are situated under `src/locales/` (`id.json` and `en.json`).
- **`src/utils/supabase.js`**: Connects to Supabase to insert and retrieve message records. Safely falls back to `src/utils/database.js` local JSON methods if credentials are not specified.
- **`src/utils/database.js`**: Local JSON storage utility for handling local message counts and logging fallbacks.
- **`src/handlers/`**: Houses loaders for commands and events.
- **`src/events/`**: Registers message listeners, command executors, cooldown validations, and button click interactions.

---

## Global Configuration (`src/config.js`)

Centralized parameters are defined in `src/config.js`. It features a stateful getter to sequentially cycle embed accent colors for every message:
```javascript
let currentColorIndex = 0;

export const config = {
  embedColors: [
    0x6e4cc1, // Purple (#6e4cc1)
    0x242221, // Dark Black (#242221)
    0xf58e25, // Orange (#f58e25)
    0xfdfdfd  // White (#fdfdfd)
  ],
  get embedColor() {
    const color = this.embedColors[currentColorIndex];
    currentColorIndex = (currentColorIndex + 1) % this.embedColors.length;
    return color;
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
- **`/webhook`** (Utility): Create or view details of webhooks with copy URL buttons.
- **`/role`** (Utility): Assign, remove, or view positions and IDs of server roles.
- **`/music-search`** (Utility): Query Apple iTunes Music API for tracks. Show cover art, navigate results page-by-page, fetch lyrics via LRCLIB integration with a button click, and link direct previews. Utilizes Discord Message Components V2 and i18n support.
- **`/purge`** (Moderation): Bulk delete messages (1-100, default is 100). Automatically filters out messages older than 14 days to comply with Discord API limits.
- **`Translate to English`** (Context Menu Command): Translates any targeted message to English. Accessed via right-clicking/long-pressing a message -> **Apps** -> **Translate to English**. Powered by the lightweight `@vitalets/google-translate-api` package.
- **`User Info`** (Context Menu Command - Consolidated): Consolidated user profiling command showing global properties (ID, Username, Bot/System status, badges, banner color), server-specific details (Roles, Server Nickname, server avatar, boosting status, key permissions), joined dates, status/presence activity, and message counts. Includes download action buttons for global avatar, server avatar, and banner. Fully localizable (supports ID and EN-US).
- **`Messages Record`** (Context Menu Command): Retrieves and lists the last 15 messages sent by the user in this guild over the past 7 days. Facilitates behavioral monitoring. Fully localizable.


---

## Supabase Logging & 7-Day Pruning
*   **Logging:** All guild message events trigger `recordMessage` which saves the message details to Supabase.
*   **Pruning:** A cleanup task running on startup and repeating every 24 hours deletes message records older than 7 days (`cleanupOldMessages`).
*   **Fallback:** If `SUPABASE_URL` and `SUPABASE_KEY` are not set in `.env`, the bot silently logs messages locally in `data/database.json`.

---

## Posting & Editing Server Rules (`src/scripts/sendRules.js`)

To publish or update rules in the rules channel, run the script from the terminal:
```bash
npm run send-rules
```

## Running & Testing the Project
- Install dependencies: `npm install`
- Run Jest test suites: `npm test`
- Run production bot: `npm start`
- Run development bot: `npm run dev`

---

## Git Branching & Release Pipeline

- **`release` (Default)**: Represents the stable codebase. Changes here are merged/committed by **Razael-Fox Bot**. Pushes here trigger GitHub Actions (`.github/workflows/package.yml`) to generate a `.tar.gz` archive and upload it to GitHub Releases.
- **`dev`**: Active development branch for developers using personal credentials (`razaeldotexe`). Push events here do not trigger package builds.
