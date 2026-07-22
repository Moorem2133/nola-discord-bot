# 🛡️ Nola Discord - Category Moderation & Permission Bot

A Discord Bot and setup guide designed to automate and manage **Category-Specific Moderator Roles** in your Discord server (`https://discord.gg/KVpKN28Mh`).

---

## 📌 Requirements Overview

Standard Discord server roles give users global powers across all channels if granted in Server Settings. To restrict moderators to specific sections (such as a **"Food & Cooking"** category):

1. **Base Role**: Created with **ZERO global administrative permissions** (toggles like `Manage Server`, `Manage Channels`, and `Manage Messages` left **OFF** globally).
2. **Category Permissions**: Applied specifically on a per-category basis.
3. **Category-Specific Powers**: Green checkmarks enabled for:
   - ✅ **Manage Channels** *(Local channel topic/setting editing)*
   - ✅ **Manage Messages** *(Local message deletion & pinning)*
   - ✅ **Manage Threads** *(Local thread moderation)*
   - ✅ **Timeout Members** *(Local disciplinary timeouts)*

---

## 📖 Setup Method 1: Manual GUI Setup in Discord

Follow these steps directly in the Discord client:

1. **Create the Base Role**:
   - Go to **Server Settings** > **Roles** > **Create Role**.
   - Name the role (e.g., `Food & Cooking Mod`).
   - ⚠️ **Crucially, do not grant any advanced permissions here.** Leave toggles like "Manage Server," "Manage Channels," and "Manage Messages" turned **OFF** in global role settings.

2. **Open Category Permissions**:
   - Go to your server channel list.
   - Right-click the category name (e.g., `Food & Cooking`) and select **Edit Category**.
   - Navigate to the **Permissions** tab.

3. **Add the Role to the Category**:
   - Under **Roles/Members**, click the **+** icon and select the moderator role you just created.

4. **Grant Category-Specific Powers**:
   - Select the role in category permissions and enable green checkmarks (`✓`) for:
     - ✅ **Manage Channels**
     - ✅ **Manage Messages**
     - ✅ **Manage Threads**
     - ✅ **Timeout Members**
   - Click **Save Changes**.

---

## 🤖 Setup Method 2: Automated Discord Bot Setup

Instead of manual setup for every category, this Bot automates role creation and category permission overwrites with a single slash command!

### 1. Bot Application Creation
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name (e.g., `Category Mod Bot`).
3. Navigate to the **Bot** tab on the left sidebar:
   - Click **Reset Token** to copy your **Bot Token**.
   - Enable **Server Members Intent** under Privileged Gateway Intents.
4. Copy your **Client ID** from the **OAuth2** tab.

### 2. Invite Bot to your Server
Generate an invite link with OAuth2 URL Generator:
- **Scopes**: `bot`, `applications.commands`
- **Bot Permissions**: 
  - Manage Roles (`8`)
  - Manage Channels (`16`)
  - Moderate Members (`1099511627776`)
  - View Channels, Send Messages, Read Message History

---

### 3. Local Installation & Configuration

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Open `.env` and fill in your Discord Bot Token and Client ID:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_application_id_here
   GUILD_ID=your_discord_server_id  # Optional: for instant command deployment
   ```

3. **Register Slash Commands**:
   ```bash
   npm run deploy-commands
   ```

4. **Start the Bot**:
   ```bash
   npm start
   ```

---

## ⚡ Slash Commands Guide

| Command | Permission Required | Description |
| :--- | :--- | :--- |
| `/setup-category-mod` | Manage Roles | Automatically creates a base role with 0 global admin rights and configures green checkmark overwrites for a target category. |
| `/mod-wizard` | Manage Roles | Interactive wizard with dropdown channel selectors and permission toggles. |
| `/category-status` | Manage Roles | Audits all server categories and lists assigned category moderator roles and their powers. |
| `/catmod purge` | Manage Messages | Local channel message purge (1-100 messages). |
| `/catmod timeout` | Timeout Members | Apply disciplinary timeouts to disruptive users. |
| `/catmod lock` | Manage Channels | Lock or unlock a channel for `@everyone`. |

### Example Command Usage:

```bash
/setup-category-mod category:#Food & Cooking role_name:"Food & Cooking Mod" color:#ff9900
```

---

## 📁 Project Structure

```
Nola Discord/
├── package.json               # Node.js dependencies & scripts
├── .env.example               # Environment template
├── .env                       # Local secrets (Token & Client ID)
├── README.md                  # Manual & Bot documentation
└── src/
    ├── index.js               # Main Discord bot entry point
    ├── deploy-commands.js     # Slash command REST registration
    └── commands/
        ├── setupCategoryMod.js# Category setup slash command
        ├── modWizard.js       # Interactive wizard command
        ├── categoryStatus.js  # Category audit command
        └── catModTools.js     # Category moderation tools (purge, timeout, lock)
```
