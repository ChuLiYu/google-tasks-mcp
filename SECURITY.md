# Security policy

This project holds access to your Google Tasks on your own computer, so reports matter.

## Reporting a problem

**Please don't open a public issue.** Use [GitHub's private vulnerability report](https://github.com/ChuLiYu/google-tasks-mcp/security/advisories/new). Include what you did, what happened and which version you used. Do not include real tokens or task content.

This is a one-person project with no guaranteed response time. I aim to reply within 7 days.

## Supported versions

Only the latest commit on `main`.

## What it protects, and what it does not

- Tokens are encrypted at rest, but the key sits on the same computer. This protects a copied database, not a compromised user account.
- The service binds to loopback, but other containers and local processes can reach loopback ports. So the private endpoint needs a key and owner decisions need the code in `.data/desk.key`. Claude Web needs a tunnel you run yourself, and OAuth protects that endpoint while the tunnel is up.
- The Google grant covers all Tasks in the account. There is no per-list limit.
- With writes enabled, text in a task or web page can mislead a model into changing tasks. The planning skill tells the model to treat such text as data, which is guidance and not a guarantee. Use strict mode if this matters to you. Strict mode does not constrain an agent with shell or browser access on the same computer, such as Claude Code, because it can read the owner code.
- The service runs in a container with a read-only root filesystem and no added capabilities, but it uses host networking.
