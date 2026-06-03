# OpenZero Discord Bot: Claude Developer Manual

Welcome, Claude! This file outlines the **OpenZero Discord Bot** codebase for Anthropic Claude-based agents or developers. It covers code architecture, global config properties, interaction patterns (Slash Commands & Buttons), and maintenance scripts.

---

## Codebase Architecture Overview

The codebase is built on **Node.js** using **discord.js v14.26+** (supporting Discord Message Components V2) with ES modules syntax.

### Key Components:
- **`src/index.js`**: Bootstraps the bot. Configures essential intents (`Guilds`, `GuildMessages`, `MessageContent`, `DirectMessages`) and uncaught error handlers.
- **`src/config.js`**: Holds global configurations (default embed color `0xffd700` and activity details). All embeds inherit colors from here.
- **`src/utils/logger.js`**: Custom Winston logging wrapper. Injects Unicode icons for log levels and prefixes timestamps. Output is colorized using Chalk.
- **`src/utils/v2Embed.js`**: Fluid wrapper class translating basic metadata (Title, Description, Color, ActionRows) into Discord's new Components V2 layout.
- **`src/handlers/`**: Houses loaders for commands and events.
- **`src/events/`**: Registers message listeners, command executors, and button Click interactions.

---

## Global Configuration (`src/config.js`)

Centralized parameters are defined in `src/config.js`:
```javascript
export const config = {
  embedColor: 0xffd700, // Accent color for all V2Embed containers (Gold)
  activity: {
    name: 'GTA 6',
    type: 'PLAYING'    // Mapped via ready.js to ActivityType
  }
};
```
To update the bot's status or the default aesthetic theme, edit this file directly.

---

## Interaction Management

### Slash Commands (`src/commands/`)
Slash commands are loaded dynamically. Each command file exports a default object:
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('cmdname')
    .setDescription('description')
    .setDMPermission(false), // Restricts to servers
  async execute(interaction) {
    // Execution logic
  }
};
```

#### New Custom System Commands:
- **`/webhook`**:
  - `create`: Create a new webhook on a specific channel with optional profile picture (pfp) URL. Includes an interactive `Salin URL Webhook` Button.
  - `info`: Fetch details of an existing webhook by ID or Discord Webhook URL. Includes an interactive `Salin URL Webhook` Button.
- **`/role`**:
  - `add`: Add a role to a target member.
  - `remove`: Remove a role from a target member.
  - `id`: Inspect specific role details (mention, ID, hex color, position).

Both commands require appropriate admin permissions (`ManageWebhooks` and `ManageRoles` respectively) and are replied to ephemerally.

### Components V2 & V2Embed Builder
Traditional rich embeds are deprecated in favor of **Components V2**. When returning responses:
1. Initialize a `new V2Embed()` (it automatically pulls `config.embedColor`).
2. Add fields and description contents.
3. Attach internal button action rows using `.addActionRow(actionRow)`.
4. Run `embed.build()` and reply/edit using `MessageFlags.IsComponentsV2`.

### Button Clicking & Updates
Button interactions must be intercepted within the `InteractionCreate` listener (`src/events/interactionCreate.js`).
1. Filter by `interaction.isButton()`.
2. Target the specific `interaction.customId` (e.g. `ping_refresh`).
3. Call `await interaction.deferUpdate()` to avoid timeouts.
4. Execute recalculations.
5. Reconstruct your `V2Embed` and edit the response using `await interaction.editReply(...)`.

---

## Posting & Editing Server Rules (`src/scripts/sendRules.js`)

To publish or update rules in channel `1498000052839383191`, we run a script that edits a specific Discord message (ID: `1511157565868871870`) in place:
```bash
npm run send-rules
```
This script builds the entire rules content in a clean, less-emoji style using the `V2Embed` class and appends the links as action row buttons inside the gold-bordered container.
