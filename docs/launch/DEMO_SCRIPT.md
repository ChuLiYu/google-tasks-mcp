# Demo GIF script (20 seconds)

Parent: [launch kit design](DESIGN.md). Owner records this; no recording has been made.

Goal: show one brain-dump sentence becoming real, dated Google Tasks, and the safety line, in 20 seconds. It goes at the top of both READMEs.

## Before recording

1. Use the **dedicated test account** only. Never the personal account.
2. In Google Tasks on that account, create a list named `Demo` and leave it empty. Hide or delete other lists for the recording, since list names show in tool output.
3. Run `./setup.sh` with writes **allowed**, so the create step does not stop. Restart Claude Desktop afterwards.
4. In Claude Desktop: new chat, no project, no other MCP servers enabled, window about 1200×800, light theme, system font size default. Close the sidebar so past chat titles are hidden.
5. Open Google Tasks for the test account in a browser window beside it (`https://tasks.google.com`), showing the `Demo` list.
6. Turn on macOS Do Not Disturb. Hide the menu bar clock if it shows the date you do not want shown.
7. Do one rehearsal. Delete the rehearsal tasks in Google Tasks by hand afterwards (the server has no delete tool).

## Storyboard

Times are for the final, sped-up GIF. Record in real time; cut and speed up the waiting.

| Time | Screen | Exact input |
|---|---|---|
| 0–2 s | Empty Claude chat, empty `Demo` list beside it | — |
| 2–6 s | Type the message | `Next Tuesday I need to renew my passport, and I want to start studying for the exam on the 20th. Put them in my Demo list.` |
| 6–11 s | Claude proposes two dated tasks and asks to confirm | — |
| 11–13 s | Type | `Yes, add them.` |
| 13–17 s | Tool calls `create_task` ×2 appear and succeed | — |
| 17–20 s | Refresh Google Tasks: both tasks with dates in `Demo` | — |

Optional second cut (separate 10-second GIF, for the post, not the README): `I finished the passport renewal.` → `complete_task` → task checked in Google Tasks.

With writes allowed, Claude may create the tasks without asking first. Then drop the 11–13 s step rather than prompting it to ask. If Claude's proposal differs (different titles or dates), keep it as long as both tasks land with correct dates. Do not edit the transcript to look better than a real run.

## Converting

Screen recording: macOS Screenshot (`Cmd+Shift+5`) → Record Selected Portion → saves a `.mov`.

```bash
# Trim to the useful part, speed up, scale to 960 px wide, 12 fps, then make a palette GIF.
ffmpeg -i demo.mov -ss 00:00:01 -t 40 -vf "setpts=0.5*PTS,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" docs/assets/demo.gif
```

Adjust `-t` and `setpts` until the GIF is about 20 seconds. Target under 5 MB so GitHub shows it inline.

## Privacy check before committing the GIF

- [ ] No real email, account avatar, or name visible (Claude and Google Tasks both show the account).
- [ ] No other task lists, past chats, Calendar sidebar or notifications.
- [ ] No token, client ID or file path in any visible terminal.
- [ ] Step through the GIF frame by frame (Preview or QuickTime) once.

## README placement

Put the GIF under the title in `README.md` and `README.zh-TW.md`, with alt text that says what happens, for example `Claude turns one sentence into two dated Google Tasks`. Commit through a PR, since `main` is protected.
