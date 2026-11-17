# Listing line and issue drafts

Parent: [launch kit design](DESIGN.md). Text only; nothing has been submitted or created.

## awesome-mcp-servers

List: `punkpeye/awesome-mcp-servers`, section **🏢 Workplace & Productivity**, alphabetical by `owner/repo` (so among the `C` entries). Format and legend checked against the list's README and CONTRIBUTING on 2026-11-16: 📇 TypeScript, ☁️ talks to a remote API (the legend's rule, even though it runs locally), 🍎 tested on macOS only.

```markdown
- [ChuLiYu/google-tasks-mcp](https://github.com/ChuLiYu/google-tasks-mcp) 📇 ☁️ 🍎 - Self-hosted Google Tasks: list, search, create, update and complete tasks. Read-only by default, no delete tool, refuses to overwrite a task changed since it was read.
```

Notes:

- Several entries carry a Glama score badge. The list does not require it; Glama indexes repositories on its own. Add the badge only if Glama has listed the repo by then.
- At least four listed servers already cover Google Tasks (two under Communication, two under Workplace & Productivity). The description leads with what differs.
- Add 🐧 only after the Linux install report (#11) succeeds.

## good first issue drafts

Already open on the public repo, so not redrafted here: #9 *Translate error messages to English* (the `AppError` messages) and #10 *Add tests for the src/google-http.ts entry point*. The drafts below do not overlap with them.

### 1. Translate startup messages in entry points and container scripts

Labels: `good first issue`, `help wanted`

> #9 covers `AppError` messages. A few messages printed to the terminal at startup are still in Traditional Chinese:
>
> - `src/main.ts`, `src/google-stdio.ts`, `src/demo-stdio.ts`, `src/google-conditional-test.ts` (`console.error` lines)
> - `containers/google-stdio.sh`, `containers/demo-stdio.sh` (`printf` lines)
>
> **What to do:** translate them to short, plain English, matching the style of `setup.sh` and `src/connect.ts`. Don't change exit codes or behavior.
>
> **Check:** run the full check as described in CONTRIBUTING.md, and `sh -n` on the changed scripts. Update the SPEC.md of each folder you touch with `npm run docs:stamp`.

### 2. `./setup.sh --help` should print usage and exit 0

Labels: `good first issue`

> Today any argument other than `disconnect` prints `Usage: ./setup.sh [disconnect]` and exits 2, so `--help` and `-h` look like errors.
>
> **What to do:** make `-h` and `--help` print the usage plus one line per mode (install, `disconnect`) and exit 0. Unknown arguments keep exiting 2.
>
> **Check:** add cases to `scripts/setup.test.mjs` and run `npm run test:launchers` (needs macOS, since the launchers use zsh) plus the full check.

### 3. Test the OAuth callback checks in `src/connect.ts`

Labels: `good first issue`, `help wanted`

> `src/connect.ts` runs a one-time local server on `127.0.0.1:8787` for the Google OAuth callback. Its request checks have no direct test: wrong `Host`, a foreign `Origin`, a path other than `/callback`, a non-GET method, a missing or repeated `state`, a repeated `code`, and a second callback while the first is still running.
>
> **What to do:** move the request check into a small exported function (for example in `src/local/`), keep `connect.ts` behavior the same, and test each refusal with plain request objects. No network and no real Google calls.
>
> **Check:** full check; update the SPEC.md of the folders you touch.

### 4. Install report: Windows with WSL 2

Labels: `help wanted`, `install`

> `./setup.sh` is tested only on macOS (#11 and #12 cover Linux and Docker Desktop on macOS). If you use Windows with WSL 2 and Docker, please try it from a WSL shell and tell us where it stopped.
>
> Useful details: Windows and WSL versions, Docker Desktop or Docker inside WSL, and which Claude client you used. Please don't paste tokens, the client JSON or real task content. The **Install report** template works too.
