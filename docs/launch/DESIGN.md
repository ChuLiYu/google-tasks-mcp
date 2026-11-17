# Launch kit design note

Parent: [docs component](../SPEC.md). Owner steps: [going public checklist](../LAUNCH_CHECKLIST.md).

Status: draft, 2026-11-16. Nothing in this folder has been published, posted or submitted.

## What

Prepared material for the owner-run launch steps in the checklist ("What usually earns stars"):

| Item | File | Owner action that uses it |
|---|---|---|
| MCP Registry metadata (candidate) | [server.json](server.json) | `mcp-publisher publish`, only after the packaging decision below |
| 20-second demo GIF storyboard | [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Record on the dedicated test account |
| Launch posts | [POSTS.md](POSTS.md) | Show HN, r/ClaudeAI, r/mcp, Threads／Facebook |
| awesome-mcp-servers line and issue drafts | [LISTINGS.md](LISTINGS.md) | Community list PR, new GitHub issues |

## Where and why

`docs/launch/` sits under the docs component, next to the checklist that owns the launch steps. These are drafts for one event, not product contracts, so they do not add a component; the docs SPEC lists them. English is the working language, as for other public docs. The Traditional Chinese post is written in its target language, not as a translation of an English source.

The registry `server.json` stays here, not at the repository root, until the packaging decision is made. At the root it would look ready to publish while its package does not exist.

## Out of scope

- No change to code, container, package.json or CI. Version alignment below is a list of edits for the release, not applied.
- Nothing is pushed, posted, published, submitted or created on GitHub.

## MCP Registry: what it needs (checked 2026-11-16)

Sources, from the official registry repository:

- [server.json reference](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md) and schema `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`: required `name`, `description` (max 100 chars) and `version` (no ranges); name pattern `^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$`.
- [Official registry requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md): packages must prove ownership; allowed hosts include `ghcr.io` for OCI and GitHub releases for MCPB.
- [Package types](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx): OCI images prove ownership with `LABEL io.modelcontextprotocol.server.name="<server name>"`; npm uses `mcpName` in package.json; MCPB uses the release URL and a required `fileSha256`.
- [Quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx): `mcp-publisher login github` gives the `io.github.<username>/` namespace; `mcp-publisher publish`; `mcp-publisher validate` exists.

Uncertain: whether the official registry accepts a server.json with neither `packages` nor `remotes`. The schema allows it; the docs do not say. Not tested, because testing means publishing or downloading `mcp-publisher`.

### The gap

The registry lists installable packages. This project has none. Users clone the repository and run `./setup.sh`, which builds a local image, creates the user's own OAuth client and edits the Claude Desktop config. `package.json` is `"private": true`, version `0.1.0-dev`. No image is published.

So a registry entry needs a design and implementation decision, plus publishing a package. That is the owner's call.

### Options

| Option | What gets published | Works after `docker run` alone? | Cost and risk |
|---|---|---|---|
| A. OCI image on `ghcr.io` | `ghcr.io/chuliyu/google-tasks-mcp:0.1.0` with the ownership label | No. It still needs `.data` from `./setup.sh` (client JSON, token store, key). The existing stdio entry without the HTTP service, `dist/google-stdio.js`, is read-only. | New release workflow and image signing decisions; a registry user who skips setup gets an error. Writes through the registry entry would need a new design. |
| B. MCPB bundle on GitHub Releases | `.mcpb` file with `fileSha256` | No, same setup, plus `better-sqlite3` is a native module, so one bundle per platform. | Most new work; drops the container isolation the project relies on. |
| C. Wait | Nothing yet; list on awesome-mcp-servers first | n/a | No registry discovery for now. |

**Recommendation: C now, A after the first install reports.** The registry entry cannot install a working server today, and a listing that fails on first run costs more trust than it earns. awesome-mcp-servers accepts self-run GitHub repositories, so it needs no package. Revisit A when Linux and Docker Desktop reports (#11, #12) show the setup is portable. 信心 75%（未校準）｜claude-opus-5-5｜依據：讀過官方 registry 文件與本 repo 啟動腳本，未實際執行 mcp-publisher。

What would change this: if the registry accepts metadata-only entries and links to the README, a metadata-only listing becomes cheap and worth doing now.

The candidate [server.json](server.json) is written for option A, so the fields are ready if the owner picks it. It points at an image that does not exist yet.

### Version alignment for a registry release (not applied)

| Field | Now | For v0.1.0 |
|---|---|---|
| Git tag | none | `v0.1.0` |
| `package.json` `version` | `0.1.0-dev` | `0.1.0` |
| MCP server info, `src/mcp/index.ts` | name `google-tasks-mcp-local-preview`, version `0.1.0-dev` | name `google-tasks-mcp`, version `0.1.0` |
| `server.json` `version` and image tag | candidate `0.1.0` | `0.1.0` |
| Dockerfile label (option A only) | none | `LABEL io.modelcontextprotocol.server.name="io.github.ChuLiYu/google-tasks-mcp"` |
| Published image command (option A only) | `node dist/main.js` (synthetic demo HTTP) | `node dist/google-stdio.js` (read-only stdio), or the server.json adds the entrypoint override |

`npm` `mcpName` is only needed for an npm package, which no option uses. The exact capitalization of the namespace comes from `mcp-publisher login github`; check it before publishing.

## Acceptance

- Each file above exists, links resolve, and `npm run check` passes.
- `server.json` has the required fields and matches the documented name and description limits. Checked with a local script against the documented constraints, not with the full schema or `mcp-publisher validate`.
- Posts state the real limits: Docker required, own OAuth client, about 10 minutes of setup, tested only on macOS, dates only, 7-day access while the consent screen is in Testing.
- Issue drafts do not duplicate the open issues #9–#12.
- The owner reviews and edits every draft before use.
