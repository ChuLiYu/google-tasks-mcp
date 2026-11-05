# MCP 工具介面（mcp）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

以官方 SDK 註冊七項工具、schema、annotations 與 structuredContent，建立 JSON response HTTP handler。

## 契約與不變條件

The optional `approvalProbe` registers `check_approval_channel` alongside read-only tools. It never calls TaskService or Google, creates no operation/approval ledger entry and cannot enable writes. Its response records receipt of a checked form only; actual human observation still requires owner confirmation. Modern continuations are random, service-bound, in-memory, single-use, limited to 128 and expire after 60 seconds. Shared owner credentials do not distinguish clients: a different client of the same service with the nonce can resume it. This cannot establish human response provenance or authorize writes. Legacy in-memory clients can support form elicitation; stateless legacy HTTP refuses safely. Unsupported, declined, unchecked, malformed, expired and replayed responses fail closed. This diagnostic is a prerequisite investigation for Q02, not write acceptance.

Private HTTP binds through its entrypoint to loopback only. Official Host/Origin guards run before requests; X-Tasks-Local-Key is compared in constant time before MCP dispatch. Health has no Google data; discovery outside /mcp returns 404. Official SDK buffers at most 64 KiB, concurrency is capped at 20, and readOnly registration applies to every client. This shared credential identifies one local owner, not separate users or Google accounts.

工具輸入直接引用 [domain schema](../domain/index.ts)；註冊、annotations、readOnly／demoElicitation／demoRoundTrip 路徑與回傳封裝由 [index.ts](index.ts) 定義目前行為。此規格不手抄 schema、工具清單或協定數值。

Tool descriptions must not label every connection as synthetic: the returned `mode` identifies the adapter. For `get_task`, upstream Google HTTP 404 is exposed through the existing sanitized error envelope as `NOT_FOUND`, with `isError: true`, `retryable: false` and no task result. It does not establish whether another account can access that ID. Input validation remains defined by the domain schema; IDs must not be inferred from task titles.

業務核准意圖見 [PRD](../../docs/PRD.md)，真人通道與正式身分仍依 [DECISIONS](../../docs/DECISIONS.md) Q01／Q02；legacy／modern 合成原型理由見 D030／D031。模型輸入、工具描述與模擬 accept 均不能證明人類同意。下方測試是實作證據，不代表 Google／ChatGPT E2E 已通過。

## Local approval and Claude connections (D039)

Real writes default to `directWrites` (D041). With `localApproval` tools only propose until the owner decides on [approval-desk.ts](approval-desk.ts), a loopback-only listener with exact Host, Origin and fetch-metadata checks, a per-process keyed CSRF value bound to the operation and digest, escaped output and a strict CSP. Nothing in MCP input can approve. [public-http.ts](public-http.ts) is the single-owner connector endpoint: exact public Host, 401 with `resource_metadata`, DCR limited to Claude's exact callback, S256 PKCE, single-use codes, rotating refresh tokens, bearer tokens stored only as digests. It issues a code only after a decision on the desk and serves neither the desk nor consent itself. [stdio-bridge.ts](stdio-bridge.ts) relays JSON-RPC lines to private HTTP and never echoes connection details. The default for `privateHttp` remains read-only.

## 檔案與定位

- [approval-desk.ts](approval-desk.ts)
- [public-http.ts](public-http.ts)
- [stdio-bridge.ts](stdio-bridge.ts)

- [approval-probe.ts](approval-probe.ts)

- [private-http.ts](private-http.ts)

- [src/mcp/index.ts](index.ts)

依賴元件：[domain](../domain/SPEC.md)、[service](../service/SPEC.md)。

使用此元件：[src](../SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[mcp](../../tests/mcp.test.ts)。

## 驗證

`npx vitest run tests/mcp.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：MCP 註冊與 handler 獨立成元件，記錄與 service、schema 的邊界，避免將工具描述視為授權。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-28

- 決策／原因／取捨：僅合成原型新增新版input_required及單次有期限伺服器延續紀錄，保留legacy與真實停寫
- 驗證：typecheck及5個MCP案例通過，含新版20並發、跨帳號、竄改、過期、重放拒絕；ChatGPT修復後待測

### 2026-10-30

- 決策／原因／取捨：協定元件連結既有schema及核准決策，保留真人核准未驗證界線，避免另寫契約
- 驗證：79產品測試、legacy與modern合成stdio通過，非真人核准證明

### 2026-11-05

- 決策／原因／取捨：Correct adapter-neutral discovery text and document the existing sanitized get_task 404 envelope without changing schemas or write gates
- 驗證：MSW SDK error cases added; pinned full check pending

### 2026-11-05

- 決策／原因／取捨：Record validation of adapter-neutral metadata and existing get_task error semantics; current private Tunnel image remains unchanged
- 驗證：Pinned Node 24.22.1 container npm run check passed: 92 product tests, 9 docs tests, typecheck and build; no live Google or ChatGPT T08 test

### 2026-11-05

- 決策／原因／取捨：Add bounded authenticated read-only loopback transport for simultaneous clients
- 驗證：Synthetic tests pending

### 2026-11-05

- 決策／原因／取捨：Add opt-in non-mutating approval diagnostic; bound service nonce does not prove client or human identity and cannot grant Google writes
- 驗證：Pinned typecheck and focused 14 cases passed before added legacy HTTP regression; final check pending

### 2026-11-05

- 決策／原因／取捨：Add loopback approval desk, single-owner connector OAuth and stdio bridge; consent on loopback so public reachability never yields a token; tradeoff is an extra browser step per write (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Fix approval desk refusing real browsers: Referrer-Policy no-referrer made form posts send Origin null; use same-origin, keep strict Origin check; make refused pages say no decision took effect
- 驗證：Reproduced in the built-in browser on a synthetic desk: POST origin=null, HTTP 403; retest after fix recorded in TEST_PLAN

### 2026-11-05

- 決策／原因／取捨：Add directWrites tool descriptions and pass write mode through both listeners; consent copy no longer promises per-write approval (D041)
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Fix final review findings (D049): consent always needs the owner code, cookie scoped to approvals, truthful disconnect reporting with lock before revoke and a timeout, replay protection documented as per connection, refuse unmountable paths, drop Dependabot version PRs.
- 驗證：Full image check, test:synthetic, launcher tests; new disconnect cases. Not re-reviewed.

<!-- component-snapshot
{
  "src/mcp/approval-desk.ts": "b70dbad780fb67bc20d91ff48691f84c0132f01a5dd527e2a260b04d519196dc",
  "src/mcp/approval-probe.ts": "92f83265e3538d3e0cc6478e8292fd1f5d79de4bec09c650600fb92c17b5eb64",
  "src/mcp/index.ts": "cf85fe0aa2b3199b089baf7ec918611f9cc851de71c57b6ac8d503e208489e86",
  "src/mcp/private-http.ts": "eb7dced1a1187806722d0097f25cd27d1726bdc36bbaa1c0bc9f3328995c63e9",
  "src/mcp/public-http.ts": "b8768f85faca8d51092c75264faa0d6b90799b9e6bcf3c5a668d11f96985763e",
  "src/mcp/stdio-bridge.ts": "8a22a2dc841b9a60046114782b1205adaa233e418ab0c7297ac6cd379b513c07",
  "src/mcp/SPEC.md": "25202e0572ef8a7de332f25c862d9a68efbb8ec02a098f445f386f79ee43f870"
}
-->
