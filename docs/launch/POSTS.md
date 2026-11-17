# Launch post drafts

Parent: [launch kit design](DESIGN.md). Drafts only; nothing has been posted.

Rules for all posts:

- Edit into your own voice. Post one place at a time, and stay to answer for the first few hours.
- Post only after the demo GIF is in the README and `v0.1.0` is tagged, so the first visitors see a working release.
- Say plainly that AI coding agents helped write it. Readers find out from the commit trailers anyway, and saying it first avoids the argument.
- Check each community's current self-promotion rules and required flair on the day of posting. They change, and these drafts do not encode them.
- Other Google Tasks MCP servers already exist. Don't claim to be first; say what this one does differently.

## Show HN

**Title** (under 80 characters):

> Show HN: Google Tasks MCP – self-hosted, with writes that refuse stale overwrites

**URL:** `https://github.com/ChuLiYu/google-tasks-mcp`

**First comment:**

> I keep my to-dos in Google Tasks and wanted Claude to turn "next Tuesday I need to renew my passport" into a dated task without me opening the app. A few Google Tasks MCP servers already exist. What I couldn't find was one I'd trust with write access to my own list, so this one is built around the failure cases:
>
> - It runs on your machine with your own Google OAuth client. There is no server of mine and no account to create.
> - Writes are off by default. When on, an update sends the task's ETag, so if the task changed since the model read it, Google refuses and nothing is overwritten.
> - If a write's result is unknown (timeout, crash), it does not retry by itself. You check Google Tasks first.
> - There is no delete tool.
>
> The costs, honestly: you need Docker (I use OrbStack), and creating your own Google client takes most of the ~10-minute setup. While the consent screen is in Google's Testing mode, access expires every 7 days. Google Tasks has dates only, no times. I've only tested it on macOS with Claude Desktop and Claude Web. AI coding agents wrote a lot of the code with me; I set the safety rules and decided on every review finding. [owner: keep only if accurate]
>
> What I'd most like to hear: where `./setup.sh` confuses you, whether it works on Linux or Docker Desktop (there are open issues for both), and whether the write safeguards are the right ones or just friction.

## r/ClaudeAI

**Title:**

> I built a self-hosted Google Tasks MCP server for Claude Desktop – early, looking for install reports

**Body:**

> **The problem:** I dump everything on my mind into Claude, and I wanted it to land in Google Tasks with dates, not in a chat I'll never scroll back to.
>
> **What it does:** list, search, create, update and complete Google Tasks from Claude Desktop (Claude Web works through a tunnel). Example: "Next Tuesday I need to renew my passport" becomes a task due Tuesday.
>
> [demo GIF]
>
> **How it's different from the other Google Tasks servers:** it's built around not damaging your list. Read-only by default; no delete tool; it refuses to overwrite a task that changed after Claude read it; it never silently retries a write whose result was unknown. There's also an optional skill for brain dumps and weekly reviews with Google Calendar.
>
> **The catch:** Docker plus your own Google OAuth client, about 10 minutes with a guided `./setup.sh`. Tested only on macOS. Access expires every 7 days while your consent screen is in Testing (Google's rule).
>
> Built with a lot of help from Claude Code. Repo: https://github.com/ChuLiYu/google-tasks-mcp
>
> Honest feedback welcome, especially where setup got stuck.

## r/mcp

**Title:**

> Google Tasks MCP server with conditional writes (ETag), durable idempotency, no delete – feedback on the design?

**Body:**

> Self-hosted TypeScript MCP server for Google Tasks. Repo: https://github.com/ChuLiYu/google-tasks-mcp
>
> Design choices I'd like criticism on:
>
> - **Writes off by default**, enabled once at setup. Per-write approval is an optional strict mode with a local approval page. I chose one-time authorization over per-call confirmation because a `confirmed: true` parameter from the model is not a real human approval.
> - **Conditional updates:** `update_task` and `complete_task` send `If-Match` with the ETag the model last read. A stale ETag fails with `STALE_TASK` instead of overwriting.
> - **Creates are idempotent** through a local SQLite ledger keyed per connection. An unknown outcome is never resent automatically.
> - **No delete tool.** Google Tasks is the only store of task content; the local database keeps tokens and safety records. (Exception: a write waiting for approval in strict mode, cleared after 24 hours.)
> - Tools: `list_task_lists`, `list_tasks`, `search_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`.
> - Runs in a hardened container (read-only root, all capabilities dropped). Claude Desktop talks to it through a small stdio bridge.
>
> Known gaps: tested on macOS only; replay protection is per connection, so after reconnecting you check Google Tasks before retrying an uncertain write; not yet in the MCP Registry because there is no published package.
>
> Is the ETag plus ledger approach overkill for a to-do list, or is it what you'd want before giving a model write access?

## Threads／Facebook 社群（繁體中文）

> 我做了一個讓 Claude 直接管理 Google Tasks 的開源小工具，想請大家幫忙挑毛病。
>
> 起因很簡單：我習慣把腦中的事一股腦丟給 Claude，但說完就留在對話裡，回頭找不到。現在說「下週二要去換護照」，它會直接在 Google Tasks 建一個週二到期的任務。
>
> 市面上已經有幾個 Google Tasks 的 MCP，我做這個是因為想放心讓 AI 寫入：
> ・跑在你自己的電腦上，用你自己的 Google client，沒有我的伺服器，也不用註冊
> ・預設只讀；開啟寫入後，任務在 Claude 讀取後被改過，就拒絕覆寫
> ・寫入結果不明時不會自動重送，也沒有刪除功能
>
> 老實說缺點：要裝 Docker，還要自己建 Google client，`./setup.sh` 會一步步帶，大約 10 分鐘。Google 測試模式下每 7 天要重新授權一次。目前只在 macOS 上測過。程式有不少是和 AI 一起寫的，安全規則與審查由我把關。
>
> 很想知道安裝卡在哪裡、Linux 或 Docker Desktop 能不能用，也歡迎直接批評設計。
>
> https://github.com/ChuLiYu/google-tasks-mcp
