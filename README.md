🌐 **Languages:** [English](README.md) | [Bahasa Indonesia](README_ID.md)

---

This is the **OpenZero Local Version**—a self-contained, standalone Discord bot designed to run entirely on your own local machine (such as a PC, Home Server, or Termux on Android). This project is **100% free of paid cloud API dependencies** (meaning no paid hosting or restrictive API limits). All data, logging, and processing run fully under your own control with zero subscription costs.

---

## Key Features

1.  **Pure Slash Commands**: Interacts cleanly using the modern Discord slash command interface (`/ping` and `/hello`).
2.  **Premium V2 Layouts**: Renders response boxes using Discord's new Message Components V2 system (`ContainerBuilder`, `TextDisplayBuilder`, etc.) with interactive buttons (such as the refresh latency button 🔄) embedded directly inside the container frame.
3.  **Local Logging**: Tracks chat activities and command executions locally in the console using Chalk colors and Winston log files (`logs/`).
4.  **Bot Status/Activity**: Automatically sets status activities (e.g., *Playing GTA 6*) on startup.
5.  **Rules Deployment**: Easily post or edit clean, formatted server rules using a simple command line utility.

---

## How to Use the Bot

Follow these steps to configure, invite, and run your local bot.

### Step 1: Prerequisites
Ensure you have **Node.js** installed on your system (v18 or higher) and a Discord account with **Developer Mode** enabled.

### Step 2: Get Bot Token & Client ID
1.  Open the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **New Application** in the top-right corner, name your bot, and create it.
3.  Navigate to the **Bot** tab on the left menu, click **Reset Token**, and copy the token. This is your `DISCORD_TOKEN`.
4.  Scroll down to the **Privileged Gateway Intents** section, enable **Message Content Intent** (required for chat logging), and click **Save Changes**.
5.  Navigate to the **General Information** tab, and copy the **Application ID**. This is your `CLIENT_ID`.

### Step 3: Invite the Bot to Your Server
1.  In the Developer Portal, go to **OAuth2** -> **URL Generator** on the left menu.
2.  Under **Scopes**, select the **`bot`** and **`applications.commands`** checkboxes.
3.  Under **Bot Permissions**, select the following basic permissions:
    *   `Send Messages`
    *   `Read Message History`
    *   `Use Slash Commands`
4.  Copy the URL generated at the bottom of the page, open it in a new browser tab, and authorize the bot for your server.

### Step 4: Get Your Server Guild ID (Recommended)
To make your bot's slash commands appear **instantly** in your test server without waiting for Discord's global propagation (which takes up to 1 hour):
1.  In Discord, go to **User Settings** -> **Advanced** and enable **Developer Mode**.
2.  Right-click your Server icon on the left navigation bar and click **Copy Server ID**. This is your `GUILD_ID`.

### Step 5: Configure the Environment File (.env)
1.  Open the bot project folder.
2.  Copy `.env.example` and rename the copy to `.env`.
3.  Open the `.env` file and fill in the values:
    ```env
    DISCORD_TOKEN=YOUR_COPIED_BOT_TOKEN
    CLIENT_ID=YOUR_COPIED_CLIENT_ID
    GUILD_ID=YOUR_COPIED_SERVER_ID
    ```

### Step 6: Activate & Start the Bot
1.  Open a terminal in the bot's directory.
2.  Install the dependencies:
     ```bash
     npm install
     ```
3.  Start the bot:
     ```bash
     npm start
     ```
     *(Use `npm run dev` to automatically restart the bot whenever configurations are updated).*
4.  When you see `[Client] Login berhasil!` in the console, the bot is online!

### Step 7: Interact with the Bot
*   Go to your Discord server and type `/ping` or `/hello`.
*   To publish or update rules in your rules channel, run the script from the terminal:
    ```bash
    npm run send-rules
    ```
