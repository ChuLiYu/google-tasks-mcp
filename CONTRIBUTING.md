# Contributing

Thanks for helping. Small fixes and clear bug reports are as useful as features.

## Ways to help

- **Try the install and tell us where it was confusing.** That is the most valuable report right now.
- **Confirm a platform.** Docker Desktop and Linux are untested. Open an issue with what happened.
- **Translate.** Many error messages in `src/` are still in Traditional Chinese.
- **Add tests.** The entry point `src/google-http.ts` has no automated test yet.

Please open an issue before a large change, so we can agree on the approach first.

## Rules that protect users

- Tests use synthetic data and MSW only. Never use a real account in automated tests.
- Never commit tokens, secrets or real task content, including in logs and snapshots.
- Keep the scope: no Calendar writes, delete tool, background automation, separate UI or extra LLM. See [AGENTS.md](AGENTS.md).
- Report success only when Google confirms it. After an unknown result, do not resend.

## Set up and check

The native SQLite driver is validated on Linux, so run the full check in the image:

```bash
docker build -f containers/Dockerfile --target build -t google-tasks-mcp:check .
```

The launcher tests run on your machine, because they cover shell scripts:

```bash
npm ci --ignore-scripts && npm run test:launchers
```

## Component specs

Each component folder has a `SPEC.md`, and `npm run docs:check` fails if a file changed without its spec. After changing a component, update its contract if behavior changed, then record why:

```bash
npm run docs:stamp -- <component-id> --decision "what changed and why" --validation "what you ran"
```

Most project documents are in Traditional Chinese for historical reasons. New and substantially updated documents are in English.

## Finding your way in the code

Start at the [Context Router](docs/INDEX.md), then go to the `SPEC.md` inside the relevant component. The root [SPEC](SPEC.md) manages the component tree and synchronization. Each spec gives parents, children, dependencies, file locations and change decisions. Changing a component requires updating its spec; `npm run docs:check` enforces this. See the [documentation tooling component](scripts/SPEC.md).

## Reading order

1. [Product requirements and acceptance criteria](docs/PRD.md)
2. [Official documentation checks and API constraints](docs/API_CONSTRAINTS.md)
3. [Proposed architecture and tool contracts](docs/ARCHITECTURE.md)
4. [Test and validation plan](docs/TEST_PLAN.md)
5. [Decision record and open questions](docs/DECISIONS.md)
6. [Phased implementation plan](docs/ROADMAP.md)
7. [Collaboration rules](AGENTS.md)

## Key design conclusions

- `taskDate` is a `YYYY-MM-DD` date. Google's `due` provides no scheduled time and does not represent a hard deadline; see the [Google Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks).
- Search pages through results and matches in this service; it does not claim Google offers full-text search. An unfinished search must report that it is unfinished.
- A create that times out may have succeeded, so it must not be blindly retried. A persistent idempotency record is a security requirement; an in-memory cache is not enough.
- Claude/ChatGPT to MCP and MCP to Google are separate authorization relationships. A Google token must not be forwarded as MCP identity.
- ChatGPT's default write confirmation may be remembered by the user. That is not server-side proof of approval for each transaction. [OpenAI connection guide](https://developers.openai.com/api/docs/guides/custom-mcp-server)

## Development and validation

The standard environment pins Node **24.22.1 LTS**, npm **11.19.1** and TypeScript **5.9.3**. Run `nvm use`, then `npm ci --ignore-scripts` and `npm run check`. OrbStack and CI use the same Node patch, and the container base is pinned by digest. Direct dependencies use exact versions; indirect ones are fixed by the lockfile.

Keep strict TypeScript and derive write types from the existing Zod schemas. External input and Google responses still get runtime validation. Do not add an ORM, DI or a second contract framework. Updating dependencies requires explicitly changing the version and lockfile, then running the full check and container validation. Pinned does not mean never updated.

Storage integration in this branch uses pinned `better-sqlite3` with bundled native binaries and installation scripts disabled. Compatibility, timeout and release evidence are tracked in [D025/D034 and successor](docs/DECISIONS.md) and [G5](docs/RELEASE_PLAN.md).

`npm start` runs a loopback Streamable HTTP demo, and `npm run inspector` opens the official Inspector. Test modes, approval methods, Google OAuth setup and limits are in the [user testing guide](docs/USER_TESTING.md); actual evidence is in [TEST_PLAN](docs/TEST_PLAN.md).

The next phase completes conversation acceptance on Claude Desktop and ChatGPT. A public or multi-user service needs a separate identity design. Unfinished items are not replaced by local, mock or standalone REST CRUD success.

CI runs the full check, synthetic tests, macOS launcher tests and a container smoke test on every push and PR; real-account acceptance is not in CI. Engineering entry points: [documentation index](docs/INDEX.md), [independent review and quality gates](docs/ENGINEERING_WORKFLOW.md). Locate by component with `npm run context -- service`. After building, `npm run test:synthetic` runs the purely synthetic two-protocol stdio and recovery drills.
