# Google Tasks MCP

Let Claude manage your Google Tasks. Say what's on your mind, and it becomes tasks with dates.

繁體中文：[README.zh-TW.md](README.zh-TW.md)

> **You:** Next Tuesday I need to renew my passport, and I want to start studying for the exam on the 20th.
>
> **Claude:** I'll add "Renew passport" for Tuesday and "Take a practice test" for this Saturday. OK?

- **Your data stays yours.** It runs on your computer with your own Google client. There is no server of ours and no account to create.
- **Tasks live only in Google.** The local database holds tokens and safety records, not your task content. The one exception is a write waiting for approval in strict mode, cleared after 24 hours while the service runs, or at its next start.
- **Careful with writes.** No delete tool, no silent retries after an unknown result, and it refuses to overwrite a task that changed since it was read.

> **Early release.** Tested on macOS with OrbStack, using Claude Desktop and Claude Web. Docker Desktop, Linux and ChatGPT are not confirmed yet. Reports are welcome.

## Quick start

You need [OrbStack](https://orbstack.dev) or Docker, [Claude Desktop](https://claude.ai/download) and a Google account.

```bash
git clone https://github.com/ChuLiYu/google-tasks-mcp.git
```

```bash
cd google-tasks-mcp && ./setup.sh
```

The setup guides you through each step, including creating your own Google client, which is most of the 10 minutes. Then ask Claude:

> List my Google Tasks lists.

## What you can do

| Say | What happens |
|---|---|
| "Add 'call the dentist' for Friday" | Creates a task |
| "What's on my list about the exam?" | Searches titles and notes |
| "Move it to Monday" | Updates the task |
| "I finished the passport renewal" | Completes the task |

Add the optional planning skill for brain dumps, deadline planning and daily and weekly reviews with Google Calendar. See the [planning guide](docs/PLANNING.md).

## Good to know

- **Writes are your choice.** The setup asks, and the default is read-only. If you allow writes, Claude acts without asking each time, and a model misled by a task note or web page could change tasks. Overwritten text cannot be recovered. For per-write approval, see [strict mode](docs/CLAUDE_CONNECTION.md#how-a-write-works), which does not constrain agents with shell access such as Claude Code.
- **Google access lasts 7 days in Testing.** That is [Google's rule](https://developers.google.com/identity/protocols/oauth2) for consent screens in Testing. Run `./setup.sh` again, or choose **Publish app** in the console.
- **Dates only.** Google Tasks has no time or reminders through this API. Put anything time-critical in Calendar.
- **Don't restore `.data` from an old backup.** It holds the records that prevent duplicate writes. They apply to one connection, so after reconnecting, check Google Tasks before retrying a write whose result was unknown.
- **Removing tasks is manual.** Delete them in Google Tasks.

## Other clients

- **Claude Code:** the setup prints the command.
- **Claude Web:** needs a tunnel to your computer. See the [connection guide](docs/CLAUDE_CONNECTION.md).
- **ChatGPT:** see the [Tunnel guide](docs/CHATGPT_CONNECTION.md). Not re-tested since direct writes were added.

## Troubleshooting

| Problem | Fix |
|---|---|
| Claude shows no tools | Quit Claude fully and reopen it. Claude overwrites its config while running, so run `./setup.sh` with Claude able to quit. |
| "Docker is not running" | Start OrbStack or Docker. The service starts by itself when Claude needs it. |
| Service won't start after a crash | Confirm nothing is running, delete `.data/google-http.lock`, then run `./setup.sh`. |
| Access stopped after a week | Run `./setup.sh` and connect again. |

## Uninstall

1. Run `./setup.sh disconnect` to revoke Google access and remove local credentials. If it says Google did not confirm, remove access at [your Google account](https://myaccount.google.com/permissions).
2. Run `docker compose -f containers/google-compose.yaml down`.
3. Remove `google-tasks` from Claude Desktop's config, then delete this folder.

## Contributing

Bug reports and ideas are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). For security problems, see [SECURITY.md](SECURITY.md) and please don't open a public issue.

## License

[MIT](LICENSE)
