# Discord Bot Porting Guide: discord.js → Cloudflare Workers

> **Target audience:** AI Coding Agent  
> **Source stack:** Node.js + discord.js  
> **Target stack:** Cloudflare Workers (no Node.js runtime)  
> **Bot features:** Slash Commands, Buttons / Components

---

## Overview

Cloudflare Workers berjalan di V8 isolate, **bukan** Node.js. Artinya:
- Tidak ada `process`, `fs`, `path`, atau Node built-ins
- Tidak ada persistent connection (no `client.login()`)
- Setiap request Discord masuk sebagai **HTTP POST** ke Worker
- `discord.js` **tidak bisa dipakai** — harus diganti dengan pendekatan HTTP langsung

Model eksekusi berubah dari **event-driven** (long-running process) menjadi **request-response** (stateless HTTP handler).

---

## Project Structure (Target)

```
my-bot/
├── src/
│   ├── index.js          # Entry point Worker
│   ├── verify.js         # Signature verification
│   ├── commands/
│   │   ├── index.js      # Command router
│   │   └── [nama].js     # Satu file per command
│   └── components/
│       ├── index.js      # Component/button router
│       └── [nama].js     # Satu file per component
├── scripts/
│   └── register.js       # Register slash commands (dijalankan sekali)
├── wrangler.toml
└── package.json
```

---

## Environment Variables

Semua secrets disimpan via Wrangler, **bukan** `.env`:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_TOKEN
```

Di dalam kode, akses via `env.DISCORD_PUBLIC_KEY`, dll.

---

## Step 1 — Entry Point (`src/index.js`)

Semua request Discord masuk di sini. Tugasnya:
1. Verifikasi signature
2. Handle PING (type 1)
3. Route ke command handler (type 2) atau component handler (type 3)

```js
import { verifyRequest } from './verify.js';
import { handleCommand } from './commands/index.js';
import { handleComponent } from './components/index.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Verifikasi signature Discord
    const { valid, body } = await verifyRequest(request, env.DISCORD_PUBLIC_KEY);
    if (!valid) return new Response('Unauthorized', { status: 401 });

    const interaction = JSON.parse(body);

    // PING handshake
    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    // Slash command
    if (interaction.type === 2) {
      return handleCommand(interaction, env, ctx);
    }

    // Button / component
    if (interaction.type === 3) {
      return handleComponent(interaction, env, ctx);
    }

    return new Response('Unknown interaction type', { status: 400 });
  },
};
```

---

## Step 2 — Verifikasi Signature (`src/verify.js`)

Gantikan semua auth discord.js dengan verifikasi manual menggunakan Web Crypto API (tersedia native di Workers).

```js
export async function verifyRequest(request, publicKey) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) return { valid: false };

  const body = await request.text();

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(publicKey),
    { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'NODE-ED25519',
    key,
    hexToBytes(signature),
    new TextEncoder().encode(timestamp + body)
  );

  return { valid, body };
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}
```

> ⚠️ Jangan pakai library `discord-interactions` jika bisa dihindari — implementasi native lebih ringan dan tidak bergantung pada Node polyfills.

---

## Step 3 — Command Router (`src/commands/index.js`)

```js
import { helloCommand } from './hello.js';
import { pingCommand } from './ping.js';

const COMMANDS = {
  hello: helloCommand,
  ping: pingCommand,
};

export async function handleCommand(interaction, env, ctx) {
  const name = interaction.data.name;
  const handler = COMMANDS[name];

  if (!handler) {
    return Response.json({ type: 4, data: { content: 'Command tidak dikenal.' } });
  }

  return handler(interaction, env, ctx);
}
```

---

## Step 4 — Migrasi Slash Command

### Pola discord.js (lama)

```js
// ❌ Tidak bisa dipakai di Workers
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'hello') {
    await interaction.reply('Halo!');
  }
});
```

### Pola Workers (baru)

```js
// src/commands/hello.js
export async function helloCommand(interaction, env, ctx) {
  // Respons instan (≤3 detik)
  return Response.json({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content: 'Halo dari CF Workers! 👋',
    },
  });
}
```

### Jika butuh proses async (>3 detik)

```js
// src/commands/ping.js
export async function pingCommand(interaction, env, ctx) {
  // Kirim deferred dulu
  ctx.waitUntil(processPing(interaction, env));

  return Response.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
}

async function processPing(interaction, env) {
  // Lakukan proses berat di sini
  const result = await fetch('https://some-api.com/data');
  const data = await result.json();

  // Edit original message via REST
  await fetch(
    `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `Result: ${data.value}` }),
    }
  );
}
```

### Mengambil Options dari Slash Command

```js
// Ambil satu option
const value = interaction.data.options?.find(o => o.name === 'input')?.value;

// Helper reusable
function getOption(interaction, name) {
  return interaction.data.options?.find(o => o.name === name)?.value ?? null;
}
```

---

## Step 5 — Migrasi Buttons / Components

### Pola discord.js (lama)

```js
// ❌ Tidak bisa dipakai di Workers
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'confirm_btn') {
    await interaction.reply('Dikonfirmasi!');
  }
});
```

### Pola Workers (baru)

```js
// src/components/index.js
import { confirmButton } from './confirm.js';

const COMPONENTS = {
  confirm_btn: confirmButton,
};

export async function handleComponent(interaction, env, ctx) {
  const customId = interaction.data.custom_id;
  const handler = COMPONENTS[customId];

  if (!handler) {
    return Response.json({ type: 4, data: { content: 'Component tidak dikenal.' } });
  }

  return handler(interaction, env, ctx);
}
```

```js
// src/components/confirm.js
export async function confirmButton(interaction, env, ctx) {
  return Response.json({
    type: 4,
    data: {
      content: '✅ Dikonfirmasi!',
      flags: 64, // EPHEMERAL (hanya terlihat oleh user yang klik)
    },
  });
}
```

### Mengirim Pesan dengan Button

```js
return Response.json({
  type: 4,
  data: {
    content: 'Pilih salah satu:',
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 1, // PRIMARY
            label: 'Konfirmasi',
            custom_id: 'confirm_btn',
          },
          {
            type: 2,
            style: 4, // DANGER
            label: 'Batal',
            custom_id: 'cancel_btn',
          },
        ],
      },
    ],
  },
});
```

---

## Step 6 — Register Slash Commands (`scripts/register.js`)

Script ini dijalankan **sekali saja** di luar Worker (dari terminal lokal), bukan bagian dari Worker itu sendiri.

```js
// scripts/register.js
const COMMANDS = [
  {
    name: 'hello',
    description: 'Sapa bot!',
  },
  {
    name: 'ping',
    description: 'Cek koneksi ke bot',
  },
  {
    name: 'say',
    description: 'Bot mengulang pesanmu',
    options: [
      {
        name: 'pesan',
        description: 'Pesan yang ingin diulang',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function register() {
  const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/commands`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal: ${err}`);
  }

  console.log('✅ Commands berhasil didaftarkan');
}

register();
```

```bash
DISCORD_APPLICATION_ID=xxx DISCORD_TOKEN=xxx node scripts/register.js
```

---

## Step 7 — Konfigurasi `wrangler.toml`

```toml
name = "my-discord-bot"
main = "src/index.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
```

> `nodejs_compat` diperlukan jika ada dependency yang menggunakan Node polyfills.

---

## Step 8 — Deploy

```bash
npx wrangler deploy
```

Setelah deploy, salin URL Worker-nya dan daftarkan sebagai **Interactions Endpoint URL** di Discord Developer Portal → General Information.

Discord akan mengirim PING untuk memverifikasi endpoint. Pastikan Worker sudah merespons `{ type: 1 }` dengan benar.

---

## Tabel Konversi Cepat

| discord.js | CF Workers Equivalent |
|---|---|
| `client.login(token)` | Tidak ada — stateless HTTP |
| `interaction.reply('...')` | `Response.json({ type: 4, data: { content: '...' } })` |
| `interaction.deferReply()` | `Response.json({ type: 5 })` |
| `interaction.editReply('...')` | `PATCH /webhooks/{app_id}/{token}/messages/@original` |
| `interaction.isButton()` | `interaction.type === 3` |
| `interaction.customId` | `interaction.data.custom_id` |
| `interaction.options.getString('x')` | `interaction.data.options?.find(o => o.name === 'x')?.value` |
| `flags: MessageFlags.Ephemeral` | `flags: 64` di dalam `data` |

---

## Batasan Penting CF Workers

| Batasan | Detail |
|---|---|
| **Timeout respons** | Harus balas Discord dalam **3 detik**. Gunakan `type: 5` untuk proses lebih lama |
| **CPU time** | Max 10ms (free) / 30ms (paid) per request synchronous |
| **Tidak ada WebSocket** | Gateway Discord tidak bisa dipakai — hanya Interactions API |
| **Tidak ada `client` global** | Tidak ada cache guild, member, dsb. Fetch via REST jika diperlukan |
| **Storage** | Gunakan **KV**, **D1**, atau **Durable Objects** — tidak ada database lokal |

---

## Checklist Migrasi

- [ ] Hapus `discord.js` dari dependencies
- [ ] Implementasi verifikasi signature native
- [ ] Pindahkan setiap command ke file tersendiri di `src/commands/`
- [ ] Pindahkan setiap button handler ke file tersendiri di `src/components/`
- [ ] Ganti semua `interaction.reply()` dengan `Response.json({ type: 4, ... })`
- [ ] Ganti semua `interaction.deferReply()` + `editReply()` dengan `type: 5` + `ctx.waitUntil()`
- [ ] Simpan semua secrets via `wrangler secret put`
- [ ] Jalankan `scripts/register.js` untuk mendaftarkan commands
- [ ] Deploy dengan `wrangler deploy`
- [ ] Set Interactions Endpoint URL di Discord Developer Portal
