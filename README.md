🌐 **Languages:** [English](README.md) | [Bahasa Indonesia](README_ID.md)

---

This is the **OpenZero Local Version**—a self-contained, standalone Discord bot designed to run entirely on your own local machine (such as a PC, Home Server, or Termux on Android). This project is **100% free of paid cloud API dependencies** (meaning no paid hosting or restrictive API limits). All data, logging, and processing run fully under your own control with zero subscription costs.

**GitHub Repository Description:** *OpenZero based Discord bot without any paid API dependency.*

---

## Key Features

1. **Pure Slash Commands**: Clean interaction using the modern Discord slash command interface.
2. **Consolidated "User Info" Profile Lookup** *(New)*: Right-click or long-press any user -> go to **Apps** -> select **User Info** to inspect a detailed profile dashboard. This replaces separate command queries and combines global account details (ID, badges, bot/system status, banner color), server metadata (roles, nickname, permissions, booster status), joined dates, online status/presence activity, total messages sent, and instant download buttons for the global avatar, server avatar, and profile banner.
3. **Behavioral Monitoring ("Messages Record")** *(New)*: Context menu command under **Apps** -> **Messages Record** that retrieves the last 15 messages sent by the user in any channel of this server within the last 7 days.
4. **Supabase Logging with Local Fallback** *(New)*: Logs all guild messages to a Supabase database for long-term audit and analysis. If Supabase keys are not set up, it automatically and silently falls back to writing records locally into `data/database.json`.
5. **7-Day Automatic Message Pruning** *(New)*: Periodic cleanup mechanism running on startup and every 24 hours to automatically delete message logs older than 7 days, maintaining a rolling audit window.
6. **Multi-Language i18n System** *(New)*: Automatic client-side language switching. Input commands and outputs (embeds, buttons, response texts) dynamically adjust between **Indonesian** and **English (US)** based on the user's Discord client settings (defaults to **English**).
7. **Context Menu Translation ("Translate to English")**: Right-click or long-press any message -> go to **Apps** -> select **Translate to English** to translate messages instantly to English. Works 100% free and without API keys using `@vitalets/google-translate-api` (perfect for Termux).
8. **Advanced Moderation Toolkit**:
   * `/purge`: Bulk delete messages in a channel (1-100, default is 100).
   * `/kick` & `/ban`: Kick or ban members with role hierarchy protection.
   * `/mute` & `/unmute`: Text mute (using Muted role) and Voice mute.
   * `/timeout`: Timeout members for a custom duration or remove timeout.
   * `/deafen` & `/undeafen`: Deafen or undeafen members in voice channels.
   * `/role`: Quick assignment, removal, or retrieval of detailed role IDs.
   * `/webhook`: Create, view details of, and manage webhooks.
   * `/music-search`: Search for music tracks using iTunes API. Renders high-resolution cover art, paginated results (3 tracks per page), instant lyrics lookup via LRCLIB API integration, and direct audio preview links using Discord Message Components V2.
    * `/help` & `/menu` *(New)*: Displays an interactive help panel. Groups commands dynamically based on their folder categories with custom Font Awesome symbols, interactive filter buttons, and full translation support. Features a customizable title format: `<icon> Help Menu`.
9. **Anti-Spam Cooldown System**: Global 3-second cooldown per command per user to prevent spam and rate limits.
10. **Flexible Color Strategies**: Automatically alternates the embed accent colors using a configurable coloring strategy (`SpecificColor`, `SequentialColor`, or `RandomColor` defined in root `config.js`).
11. **Premium V2 Layouts & Custom Font Awesome Emojis**: Renders response boxes using Discord's new Message Components V2 system (`ContainerBuilder`, `TextDisplayBuilder`, etc.) with interactive buttons embedded directly inside the container frame. Custom Font Awesome emojis are automatically mapped (e.g. `oz_letterboxd` for summaries, `oz_discord` for categories, `oz_border_all` for All category button, `oz_black_tie` for Moderation, `oz_music` for Music, and `oz_screwdriver_wrench` for Utility) and can be deployed with a single command.
12. **Local Logging**: Tracks chat activities and command executions locally in the console using Chalk colors and Winston log files (`logs/`) in English.
13. **Bot Status/Activity**: Automatically sets rich presence status (e.g., *Playing GTA 6*) on startup. Sets to `invisible` when running in a local development environment.
14. **Rules Deployment**: Easily post or edit clean, formatted server rules using a simple command line utility.
15. **Semantic Versioning (SemVer)** *(New)*: Globally tracks bot releases using the SemVer format (current version: `1.7.90`). Managed via a root `VERSION` file and synchronized dynamically to configurations.
16. **AI Agent Integration with Groq** *(New)*: Conversational prompt query using the `/fox` command or by mentioning/pinging the bot directly. Integrates the **Groq API** (defaulting to `gemma2-9b-it`) and uses function calling to automatically execute plugin tools (e.g. creating webhooks, playing music, managing roles). Features built-in 400 error interception and `failed_generation` parsing to ensure reliable tool execution even on models with tool use constraints (e.g., `llama-3.1-8b-instant`). Falls back to an offline mockup classification system when the API key is not configured.
17. **Dynamic Plugin Installer/Manager** *(New)*: Allows administrators to view, enable, and disable AI plugins dynamically using `/plugin list`, `/plugin install`, and `/plugin uninstall`. It instantly registers/deregisters slash commands from the Discord API on the fly.

---

## Installation Options

You can install this project by cloning the repository:

```bash
git clone https://github.com/Razael-Fox/openzero-local.git
cd openzero-local
```

---

## How to Use the Bot

Follow these steps to configure, invite, and run your local bot.

### Step 1: Prerequisites
Ensure you have **Node.js** installed on your system (v18 or higher) and a Discord account with **Developer Mode** enabled.

### Step 2: Get Bot Token & Client ID
1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top-right corner, name your bot, and create it.
3. Navigate to the **Bot** tab on the left menu, click **Reset Token**, and copy the token. This is your `DISCORD_TOKEN`.
4. Scroll down to the **Privileged Gateway Intents** section, enable **Message Content Intent** (required for chat logging) and **Presence Intent** (required for user status tracking), and click **Save Changes**.
5. Navigate to the **General Information** tab, and copy the **Application ID**. This is your `CLIENT_ID`.

### Step 3: Invite the Bot to Your Server
1. In the Developer Portal, go to **OAuth2** -> **URL Generator** on the left menu.
2. Under **Scopes**, select the **`bot`** and **`applications.commands`** checkboxes.
3. Under **Bot Permissions**, select the following basic permissions:
   * `Send Messages`
   * `Read Message History`
   * `Use Slash Commands`
4. Copy the URL generated at the bottom of the page, open it in a new browser tab, and authorize the bot for your server.

### Step 4: Get Your Server Guild ID (Recommended)
To make your bot's commands appear **instantly** in your test server without waiting for Discord's global propagation (which takes up to 1 hour):
1. In Discord, go to **User Settings** -> **Advanced** and enable **Developer Mode**.
2. Right-click your Server icon on the left navigation bar and click **Copy Server ID**. This is your `GUILD_ID`.

### Step 5: Configure the Environment File (.env)
1. Copy `.env.example` and rename the copy to `.env`.
2. Open the `.env` file and fill in the values:
   ```env
   DISCORD_TOKEN=YOUR_COPIED_BOT_TOKEN
   CLIENT_ID=YOUR_COPIED_CLIENT_ID
   GUILD_ID=YOUR_COPIED_SERVER_ID
   
   # Supabase Configuration (Optional - Falls back to local database if blank)
   SUPABASE_URL=YOUR_SUPABASE_URL_HERE
   SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY_HERE
   ```

### Step 6: Setup Custom Emojis (Optional but Recommended)
To enable custom Font Awesome emojis for help categories and other premium UI embeds, run the following command in your server (ensure the bot has `Manage Emojis and Stickers` permissions):
```bash
npm run setup-emojis
```

### Step 7: Activate & Start the Bot
1. Open a terminal in the bot's directory.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the bot:
   ```bash
   npm start
   ```
   *(Use `npm run dev` to automatically restart the bot whenever configurations or commands are updated).*
4. When you see `[Client] Login berhasil!` in the console, the bot is online!

### Step 8: Testing the Code
This repository comes with pre-configured unit tests to verify moderation, i18n, and context menu commands.
Run the tests using Jest:
```bash
npm test
```

---

## Git Branching & Release Pipeline

This project operates with two primary branches:
* **`release` (Default Branch)**: Represents the stable production state. All code is managed by the automated **Razael-Fox Bot** on this branch.
* **`dev` (Development Branch)**: Used by developers for minor changes, active coding, and testing. It uses personal developer credentials (`razaeldotexe`).
