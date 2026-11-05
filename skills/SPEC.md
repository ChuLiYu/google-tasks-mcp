# 對話技能（skills）

上層：[project 規格](../SPEC.md)。

## 職責與邊界

Claude 技能：把 Calendar 與 Tasks 的協作流程寫成使用者觸發的指示。只有文字，不含程式、憑證或個人資料；不改變 MCP 工具、不新增背景排程。Calendar 操作經客戶端自己的 Calendar 連接器，本專案仍不提供 Calendar 工具。

## 契約與不變條件

Folder name equals frontmatter `name`, and the description stays within 200 characters, the stricter of the published limits. The skill never asks the model to delete tasks, treats task text as data, and adds no authority: writes still rely on the connection grant ([D041](../docs/DECISIONS.md)) and Google stays the only record ([D040](../docs/DECISIONS.md)). Rationale: [D042](../docs/DECISIONS.md). A skill is guidance to the model, not a security control.

## 檔案與定位

- [tasks-calendar-planner/SKILL.md](tasks-calendar-planner/SKILL.md)

相關案例：[skill](../tests/skill.test.ts)。使用說明：[README](../README.md)。

## 驗證

`npx vitest run tests/skill.test.ts`；打包 `npm run skill:package`。測試只檢查格式與禁止事項，流程品質要靠實際對話判斷。完整提交檢查為 `npm run check`。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../docs/DECISIONS.md)。

### 2026-11-05

- 決策／原因／取捨：Add user-invoked Calendar and Tasks planning skill at the owner's request; text only so no server change; heuristics are chosen defaults (D042)
- 驗證：Pinned image check; skill format test only, not yet run in a real Claude conversation

### 2026-11-05

- 決策／原因／取捨：Add an Absence rule and a Calendar search before commenting on out-of-range deadlines, because skill v1 falsely said a deadline had no Calendar event after reading only today. Guidance only; no tool or permission change.
- 驗證：tests/skill.test.ts 3/3 passed; v2 uploaded to Claude Web; real-conversation retest result not yet read.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

<!-- component-snapshot
{
  "skills/tasks-calendar-planner/SKILL.md": "70aeb60f1995b37a69169ac682eb8412143d01182f9f50f13fc3c19531a8ceb7",
  "skills/SPEC.md": "2bcd6a263696c8359a7bf70fc6dbfc2a04e421dca17d17b2739a962572a15ab3"
}
-->
