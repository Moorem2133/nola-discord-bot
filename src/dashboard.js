import { disabledCommands } from './commands/toggleCommand.js';

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

export function getDashboardHtml(client, status) {
  const uptime = formatUptime(process.uptime());
  const ping = client.ws.ping;
  const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const guilds = client.guilds.cache.size;
  const channels = client.channels.cache.size;
  const botUser = client.user;

  const availableCommands = [
    { name: 'catmod', desc: 'Category Mod Tools (/catmod)' },
    { name: 'mod', desc: 'Server Mod Tools (/mod)' },
    { name: 'setup-category-mod', desc: 'Setup Category Mod (/setup-category-mod)' },
    { name: 'setup-server-mod', desc: 'Setup Server Mod (/setup-server-mod)' },
    { name: 'mod-wizard', desc: 'Moderator Wizard (/mod-wizard)' },
    { name: 'category-status', desc: 'Category Status (/category-status)' },
    { name: 'automod-setup', desc: 'AutoMod Setup (/automod-setup)' }
  ];

  const commandTogglesHtml = availableCommands.map(cmd => {
    const isEnabled = !disabledCommands.has(cmd.name);
    return `
      <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; color: #fff; font-size: 0.9rem;">\${cmd.desc}</div>
          <div style="font-size: 0.75rem; color: \${isEnabled ? '#34d399' : '#f87171'}; margin-top: 0.25rem;" id="status-\${cmd.name}">
            \${isEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" \${isEnabled ? 'checked' : ''} onchange="toggleCommand('\${cmd.name}', this.checked)">
          <span class="slider round"></span>
        </label>
      </div>
    `;
  }).join('');

  // Format log lines into terminal style
  const logLinesHtml = status.logs.length > 0
    ? status.logs.map(log => {
        let colorClass = 'text-gray-400';
        if (log.includes('📢') || log.includes('✅')) colorClass = 'text-emerald-400';
        if (log.includes('⚠️')) colorClass = 'text-amber-400';
        if (log.includes('❌') || log.includes('🔴')) colorClass = 'text-rose-400';
        return `<div class="${colorClass} py-0.5">${escapeHtml(log)}</div>`;
      }).join('')
    : '<div class="text-gray-500 italic">No logs recorded yet. Waiting for next check...</div>';

  // Format TikTok cards
  const tiktokCards = Object.values(status.tiktok).map(channel => {
    const isLive = channel.isLive;
    const avatar = channel.avatarUrl || 'https://raw.githubusercontent.com/discordjs/guide/main/guide/assets/images/discord-logo-blue.svg';
    return `
      <div class="card relative overflow-hidden bg-slate-800/40 border border-slate-700/50 backdrop-blur-md rounded-2xl p-6 transition-all hover:scale-[1.02]">
        <div class="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
        <div class="flex items-center space-x-4">
          <img src="${avatar}" alt="@${channel.username}" class="w-12 h-12 rounded-full border border-pink-500/30 object-cover" />
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-white truncate">@${channel.username}</h3>
            <p class="text-sm text-gray-400 flex items-center">
              <span class="platform-badge bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded text-xs mr-2 font-mono">TikTok</span>
              ${channel.lastCheckStatus === 'OK' ? 'Checks OK' : channel.lastCheckStatus}
            </p>
          </div>
          <div class="flex flex-col items-end">
            <span class="indicator ${isLive ? 'bg-rose-500 shadow-rose-500/50 ring-rose-500/30 animate-pulse' : 'bg-slate-600 shadow-slate-600/50 ring-slate-600/30'} flex h-3.5 w-3.5 rounded-full shadow-lg ring-4 mb-1"></span>
            <span class="text-xs ${isLive ? 'text-rose-400 font-bold' : 'text-slate-400'}">${isLive ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-slate-700/30 flex justify-between text-xs text-gray-400">
          <span>Last Video ID:</span>
          <span class="font-mono text-gray-200">${channel.lastVideoId || 'None'}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rosie Bot - Live Status Dashboard</title>
      <!-- Google Fonts Inter -->
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        body {
          background-color: #0b0f19;
          color: #e2e8f0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        .bg-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
          background-size: 24px 24px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 2rem 1.5rem;
          flex: 1;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }
        .card {
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }
        .indicator {
          box-shadow: 0 0 12px var(--tw-shadow-color);
        }
        .terminal {
          background-color: #05070f;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 10px 30px -10px rgba(0, 0, 0, 0.6);
        }
        /* Custom scrollbar for terminal */
        .terminal::-webkit-scrollbar {
          width: 8px;
        }
        .terminal::-webkit-scrollbar-track {
          background: #05070f;
        }
        .terminal::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .terminal::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .grid-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        /* Tailwind Utilities Emulation */
        .text-emerald-400 { color: #34d399; }
        .text-amber-400 { color: #fbbf24; }
        .text-rose-400 { color: #f87171; }
        .text-pink-400 { color: #f472b6; }
        .text-red-400 { color: #f87171; }
        .text-gray-400 { color: #94a3b8; }
        .text-gray-500 { color: #64748b; }
        .text-gray-200 { color: #e2e8f0; }
        .bg-rose-500 { background-color: #f43f5e; --tw-shadow-color: #f43f5e; }
        .bg-emerald-500 { background-color: #10b981; --tw-shadow-color: #10b981; }
        .bg-slate-600 { background-color: #475569; --tw-shadow-color: #475569; }
        .bg-red-500 { background-color: #ef4444; --tw-shadow-color: #ef4444; }

        /* Interactive toggles styling */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #334155;
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #10b981;
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
        .grid-toggles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
      </style>
    </head>
    <body class="bg-grid">
      <div class="container">
        <!-- HEADER -->
        <header>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${botUser.displayAvatarURL()}" alt="${botUser.username}" style="width: 3.5rem; height: 3.5rem; border-radius: 9999px; border: 2px solid #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);" />
            <div>
              <h1 style="font-size: 1.5rem; font-weight: 700; color: #fff; line-height: 1.2;">${botUser.username} <span style="font-size: 0.85rem; font-weight: 500; background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.15rem 0.5rem; border-radius: 9999px; vertical-align: middle;">#${botUser.discriminator || '0000'}</span></h1>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">Live Stream & Content Monitoring System</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 9999px;">
            <span class="indicator bg-emerald-500 shadow-emerald-500/50 ring-emerald-500/30 animate-pulse" style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px;"></span>
            <span style="font-size: 0.85rem; font-weight: 600; color: #34d399;">BOT ONLINE</span>
          </div>
        </header>

        <!-- SYSTEM METRICS -->
        <div class="grid-stats">
          <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1.25rem; border-radius: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Bot Uptime</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fff; margin-top: 0.5rem; font-family: monospace;">${uptime}</div>
          </div>
          <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1.25rem; border-radius: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">API Latency</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fff; margin-top: 0.5rem; font-family: monospace;">${ping} ms</div>
          </div>
          <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1.25rem; border-radius: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Memory Usage</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fff; margin-top: 0.5rem; font-family: monospace;">${memory} MB</div>
          </div>
          <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1.25rem; border-radius: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Active Guilds</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fff; margin-top: 0.5rem; font-family: monospace;">${guilds} server${guilds !== 1 ? 's' : ''}</div>
          </div>
          <div style="background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(51, 65, 85, 0.3); padding: 1.25rem; border-radius: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Cached Channels</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fff; margin-top: 0.5rem; font-family: monospace;">${channels}</div>
          </div>
        </div>

        <!-- LIVE TARGETS CONTAINER -->
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="display: inline-block; width: 0.5rem; height: 1.25rem; background-color: #3b82f6; border-radius: 0.25rem;"></span>
          Monitored Content Channels
        </h2>
        
        <div class="grid-3">
          <!-- YOUTUBE CARD -->
          <div class="card relative overflow-hidden bg-slate-800/40 border border-slate-700/50 backdrop-blur-md rounded-2xl p-6 transition-all hover:scale-[1.02]" style="position: relative;">
            <div style="position: absolute; top: 0; right: 0; width: 6rem; height: 6rem; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.1); filter: blur(24px); margin-right: -1.5rem; margin-top: -1.5rem;"></div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <img src="${ytChannelAvatarUrl || 'https://raw.githubusercontent.com/discordjs/guide/main/guide/assets/images/discord-logo-blue.svg'}" alt="YouTube Channel" style="width: 3rem; height: 3rem; border-radius: 9999px; border: 1px solid rgba(239, 68, 68, 0.3); object-fit: cover;" />
              <div style="flex: 1; min-width: 0;">
                <h3 style="font-size: 1.125rem; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Chef Chris Cody</h3>
                <p style="font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; margin-top: 0.25rem;">
                  <span style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; margin-right: 0.5rem;">YouTube</span>
                  ${status.youtube.lastCheckStatus}
                </p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <span class="indicator ${status.youtube.isLive ? 'bg-red-500 shadow-red-500/50 ring-red-500/30 animate-pulse' : 'bg-slate-600 shadow-slate-600/50 ring-slate-600/30'}" style="display: inline-block; width: 14px; height: 14px; border-radius: 9999px; box-shadow: 0 0 12px var(--tw-shadow-color); ring: 4px; margin-bottom: 0.25rem;"></span>
                <span style="font-size: 0.75rem; color: ${status.youtube.isLive ? '#f87171' : '#94a3b8'}; font-weight: ${status.youtube.isLive ? '700' : '400'};">${status.youtube.isLive ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(51, 65, 85, 0.3); display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
              <span>Last Video ID:</span>
              <span style="font-family: monospace; color: #e2e8f0;">${status.youtube.lastVideoId || 'None'}</span>
            </div>
          </div>

          <!-- TIKTOK CARDS -->
          ${tiktokCards}
        </div>

        <!-- COMMAND CONTROL -->
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="display: inline-block; width: 0.5rem; height: 1.25rem; background-color: #f59e0b; border-radius: 0.25rem;"></span>
          Administrative Command Control
        </h2>
        <div class="grid-toggles">
          ${commandTogglesHtml}
        </div>

        <!-- RECENT BOT LOGGER -->
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="display: inline-block; width: 0.5rem; height: 1.25rem; background-color: #10b981; border-radius: 0.25rem;"></span>
          Activity Logs
        </h2>
        <div class="terminal" style="border: 1px solid rgba(51, 65, 85, 0.5); border-radius: 1rem; padding: 1.25rem; font-family: monospace; font-size: 0.85rem; height: 260px; overflow-y: auto; line-height: 1.5;">
          ${logLinesHtml}
        </div>
      </div>

      <footer style="margin-top: 2rem; padding: 2rem 0; border-top: 1px solid rgba(51, 65, 85, 0.2); text-align: center; font-size: 0.8rem; color: #64748b;">
        <p>Rosie Bot Status Dashboard &copy; 2026. Last Checked: ${status.lastCheckTime ? status.lastCheckTime.toLocaleTimeString() : 'Never'}</p>
      </footer>

      <!-- Toggle command state API call helper -->
      <script>
        async function toggleCommand(commandName, enabled) {
          try {
            const res = await fetch(`/api/toggle-command?command=${commandName}&enabled=${enabled}`);
            const data = await res.json();
            if (data.success) {
              const label = document.getElementById(`status-${commandName}`);
              label.innerText = enabled ? 'Enabled' : 'Disabled';
              label.style.color = enabled ? '#34d399' : '#f87171';
            } else {
              alert('Failed to update command state');
            }
          } catch (err) {
            console.error(err);
            alert('Error updating command state');
          }
        }
      </script>

      <!-- Automatic Page Reload every 30 seconds unless hovering toggles -->
      <script>
        let autoReload = true;
        
        // Pause reload when user interacts with toggles
        document.querySelectorAll('.switch').forEach(el => {
          el.addEventListener('mouseenter', () => autoReload = false);
          el.addEventListener('mouseleave', () => autoReload = true);
        });

        setTimeout(() => {
          if (autoReload) {
            window.location.reload();
          }
        }, 30000);
      </script>
    </body>
    </html>
  `;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
