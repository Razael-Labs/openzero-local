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
6. **Multi-Language i18n System** *(New)*: Automatic client-side language switching. Input commands and outputs (embeds, buttons, response texts) dynamically adjust between **Indonesian** and **English (US)** based on the user's Discord client settings.
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
9. **Anti-Spam Cooldown System**: Global 3-second cooldown per command per user to prevent spam and rate limits.
10. **Sequential Color Shuffling**: Automatically alternates the embed accent colors in order for every message from a predefined list of colors:
    * `#6e4cc1` (Purple)
    * `#242221` (Dark Black)
    * `#f58e25` (Orange)
    * `#fdfdfd` (White)
11. **Premium V2 Layouts**: Renders response boxes using Discord's new Message Components V2 system (`ContainerBuilder`, `TextDisplayBuilder`, etc.) with interactive buttons embedded directly inside the container frame.
12. **Local Logging**: Tracks chat activities and command executions locally in the console using Chalk colors and Winston log files (`logs/`).
13. **Bot Status/Activity**: Automatically sets rich presence status (e.g., *Playing GTA 6*) on startup.
14. **Rules Deployment**: Easily post or edit clean, formatted server rules using a simple command line utility.
15. **Calendar Versioning (CalVer)** *(New)*: Globally tracks bot releases using the `YY.MM.DD` format (e.g. `26.06.05`). Automatically updates on startup and generates unique tag versions during CI/CD release deployments.

---

## Installation Options

You can install this project using either of the following methods:

### Option A: Clone the Repository
Best if you want to keep the bot updated using git commands:
```bash
git clone https://github.com/Razael-Fox/openzero-local.git
cd openzero-local
```

### Option B: Download Release Package
Best if you want a clean, compiled standalone package without git history (only generated from the `release` branch):
1. Go to the [Releases](https://github.com/Razael-Fox/openzero-local/releases) page.
2. Download the latest `.tar.gz` package (e.g., `openzero-local-latest.tar.gz`).
3. Extract it in your desired directory:
   ```bash
   tar -xzf openzero-local-latest.tar.gz
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

### Step 6: Activate & Start the Bot
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

### Step 7: Testing the Code
This repository comes with pre-configured unit tests to verify moderation, i18n, and context menu commands.
Run the tests using Jest:
```bash
npm test
```

---

## Git Branching & Release Pipeline

This project operates with two primary branches:
* **`release` (Default Branch)**: Represents the stable production state. All code is managed by the automated **Razael-Fox Bot** on this branch. Pushing to this branch or tagging version releases (`v*`) triggers GitHub Actions to compile and compress the project into `openzero-local-latest.tar.gz` and upload it to the [Releases](https://github.com/Razael-Fox/openzero-local/releases) page.
* **`dev` (Development Branch)**: Used by developers for minor changes, active coding, and testing. It uses personal developer credentials (`razaeldotexe`). Pushing to this branch **does not** generate release packages.
