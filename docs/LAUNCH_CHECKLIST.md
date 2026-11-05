# Going public checklist

Parent: [docs component](SPEC.md). Owner-run steps for the first public release. Each one needs the owner's decision.

## Must finish before going public

- [x] License: MIT (D048).
- [x] Q04 for public users: disconnect command added, restore limit disclosed (D048).
- [ ] Finish the security review and resolve its findings.
- [x] History: publish a fresh history (D048). Choose how to handle the current repository when publishing.
- [ ] Remove the dated owner authorization from `AGENTS.md` in the public tree (D048).
- [ ] Have someone else run `./setup.sh` from a clean machine.

## At the moment of going public

- [ ] Merge to `main` and tag `v0.1.0`.
- [ ] Set the repository public. Enable private vulnerability reports, Dependabot alerts, secret scanning and branch protection.
- [ ] Add a description, topics (`mcp`, `claude`, `google-tasks`) and a social preview image.

## What usually earns stars

These are common practice, not measured for this project.

1. **A 20-second demo GIF at the top of the README.** Use a real conversation on the test account.
2. **Fast first success.** Keep watching where install reports get stuck.
3. **Listings.** The official MCP Registry and community lists such as awesome-mcp-servers.
4. **One honest launch post.** Show HN, r/ClaudeAI, r/mcp, and Threads or Facebook groups in Traditional Chinese. Explain the problem and invite criticism.
5. **Quick replies.** Answering the first issues quickly matters more than a long roadmap.
6. **`good first issue` labels.** Start with translating error messages and adding tests for `src/google-http.ts`.
