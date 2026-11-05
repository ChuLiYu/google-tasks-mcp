# 測試與驗證計畫

## Current checkout revalidation — 2026-11-04

### Live synthetic acceptance artifact — version boundary

- On 2026-11-04, read-only `docker image inspect` and filtered `docker ps` confirmed the existing synthetic approval container was running from `google-tasks-mcp:p3-demo`, image `sha256:3ec606de1a9d594fd6f5301c98aa3125c42e24a90a959f924696d0f529765418`. No container was stopped or switched and no task/credential data was read.
- A separate disposable run of that image with no network, read-only root and no data mounts reported Node v24.22.1 and no `better-sqlite3` dependency. It predates D035 integration. Human form/refusal results on this connection must be attributed to this artifact; they cannot establish acceptance of the new storage/runtime artifact. Before final personal-use release, switch to the reviewed candidate under the applicable authorization and revalidate the actual deployed artifact. Existing stable-driver synthetic evidence remains separate.

### Prepared conditional-update batch — synthetic evidence only

- Production-only candidate built with `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:conditional-runtime .`, exit 0; immutable digest `sha256:fc4281df6e9564e2627d0f05079eb34a340113a2f7aa18ce2007cdd748d42a52`. Non-root, network-disabled, read-only runs without mounts loaded the conditional module and passed an in-memory Store integrity check (exit 0); the CLI with an unexpected argument safely refused before configuration access (exit 1, `VALIDATION_ERROR`). No real no-argument invocation occurred. These smoke commands use only production dependencies and are not a deployment or Google result.
- `docker --context orbstack build --target build -f containers/Dockerfile -t google-tasks-mcp:conditional-check .` exited 0 on the fixed Node/npm baseline: full `npm run check`, 89 product cases (15 maintenance-harness cases), 9 developer-tool cases, 14 component checks, context checks, strict type checking and build. Tested image: `sha256:627a6587fb4a68601e3a1fbef5eb5871c7b764f2815d9de13828bc0f1811e05b`.
- In that image, `npm run test:synthetic` exited 0 as non-root with no network, read-only root, dropped capabilities and only disposable `/tmp`; no source, credential or host data mounts. Legacy/modern approval simulations, replay, three-page search, SIGKILL/snapshot recovery and cross-driver storage/20-claim/five-second lock rehearsals passed.
- `node dist/google-conditional-test.js unexpected` in the same isolated image exited 1 with `VALIDATION_ERROR`, before credential initialization. The real no-argument entrypoint was not executed.
- MSW cases cover required 412 with unchanged decoded read-back, incorrectly accepted stale writes, mutation despite 412, network failure, missing/unchanged ETags, readonly refusal, concurrent claims, account and historical-CRUD isolation, replay without token acquisition, and guarded cleanup refusal. These are synthetic assertions, not Google endpoint evidence.
- Independent read-only review found no reproducible defect. Its host test attempt could not load the missing local `better-sqlite3` dependency and executed zero cases; the fixed-container results above supply the execution evidence. Real Q05 execution requires the separate explicit authorization described in [RELEASE_PLAN](RELEASE_PLAN.md). Human ChatGPT approval, true Google stale-version rejection, deployment and publication remain unverified. Evidence-only documentation/spec updates follow the tested artifact.

### Stable-storage integration — D035, validated and independently reviewed

- Final integrated artifact: `google-tasks-mcp:stable-storage-final-check`, Linux arm64, `sha256:843963bdffb5a8632d8a3d184fd48dfb676e9df9fa2a96be811563273a77819f`. `docker --context orbstack build --target build -f containers/Dockerfile -t google-tasks-mcp:stable-storage-final-check .` exited 0 after the review fix and specification updates, including full `npm run check` and build (dependency installation reused its previously validated layer). A subsequent `docker --context orbstack run --rm --user node --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 --cap-drop ALL --security-opt no-new-privileges --memory 1536m --cpus 2 google-tasks-mcp:stable-storage-final-check npm run test:synthetic` exited 0 with all four checked-in rehearsal scripts together, without source mounts. Legacy/modern refusal, CRUD/read-back/replay, three-page search, SIGKILL/snapshot recovery and the corrected old-driver-first storage rehearsal all passed. This is the final integrated synthetic artifact, not the image currently serving the private connection or a human acceptance result.
- Branch integration pins `better-sqlite3@13.0.3`, `@types/better-sqlite3@9.6.0` (MIT, development only) and transitive `node-addon-api@8.9.2`. The lockfile was resolved in a disposable fixed-environment container with lifecycle scripts disabled. Only the driver import/constructor/type changed in Store; DDL, durability pragmas and state transition SQL are unchanged. No production database was opened.
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:stable-storage .` exited 0 using clean lockfile installs for build and production-only runtime. Full `npm run check` passed on Node 24.22.1 / npm 11.19.1: 80 product tests, 9 developer-tool tests, 14 component checks, context checks, strict type checking and build. Both installs reported zero npm advisories at execution time; that is not a vulnerability guarantee. Runtime image: `sha256:5063097809ac58d6dccd47e4c8c2774cae8df78c5bef3cd45c4f25d054ac83fe`.
- Validation image `sha256:ff5dd7686446310a10542e4c3f6283701e403f39db17fa3386462b512b995f05` passed docs checks/tests, all 80 product tests and `npm run test:synthetic` in a non-root, network-disabled, read-only container with only scratch tmpfs mounts. Both stdio eras and SIGKILL/snapshot recovery passed. The new checked-in `scripts/check-storage.mjs` additionally passed cross-driver file reads/writes, integrity, DELETE/FULL pragmas, file mode 0600, vault/cursor continuity and isolation, persisted uncertain state, 20 independent competing claims with exactly one success, and the actual default five-second SQLITE_BUSY timeout followed by preserved pending approval and a successful retry. All approvals and data are synthetic.
- The production-only runtime image was separately exercised as UID 1000, network disabled, read-only root and disposable `/tmp`; claim exactly once and encrypted vault read-back passed on Linux arm64. No development declarations or test dependencies were required by runtime.
- `docker --context orbstack build --platform linux/amd64 --target build -f containers/Dockerfile -t google-tasks-mcp:stable-storage-x64-check .` exited 0 with clean script-free installation and the full check, image `sha256:36871bfa0ed99e15e90a3f21150c10884ca98c96373752448e509141e0f70309`. Running `npm run test:synthetic` in that image as UID 1000, network disabled and read-only root exited 0. This is Linux x64 execution under OrbStack emulation, not remote GitHub CI.
- Independent read-only review identified P1: the original permanent test began with a new-driver-created file. The corrected rehearsal first uses an in-memory Store to obtain unchanged DDL and fixtures, then has `node:sqlite` create the first on-disk file, including persisted approval, cursor, vault and in-flight data. The new Store first opens that file and verifies recovery/continuity and exactly-once consumption of the old approval. The old driver subsequently reads back candidate success. There is no hand-maintained duplicate DDL.
- Final targeted runs of `node scripts/check-storage.mjs` exited 0 on Linux arm64 validation image `sha256:850435fa840cf12ecd2e11f4ee7bf3013bcc423498dc786a438c9ec8b0c0c9a7` and the x64 image above. Each run mounted only the corrected script read-only at `/app/scripts/check-storage.mjs`; no host data/credentials were mounted. Both used `--network none --read-only --user node --cap-drop ALL --security-opt no-new-privileges --memory 1536m --cpus 2`, a disposable `/tmp` tmpfs, and x64 additionally used `--platform linux/amd64`. Bounded 20-second worker-response waits and premature-exit rejection were included. Both runs passed upgrade/rollback compatibility, 20 claims and the actual five-second lock timeout. Re-review confirmed P1 closed and reported no new concrete defect.
- D035 resolves the D025 RC-driver requirement on those validated Linux targets; the remaining release gates still apply. Native macOS execution and remote GitHub CI are not claimed. Existing tunnels were not restarted; no Google credential, real task, human confirmation, deployment or publication was involved. Evidence-only documentation/spec updates followed the tested product build; final documentation/full-check results are recorded separately.

### Earlier candidate-only experiment — before D035 integration

- Candidate: `better-sqlite3@13.0.3`, downloaded into a disposable container using `npm install --ignore-scripts --no-audit --no-fund --save-exact better-sqlite3@13.0.3`. The project manifest and lockfile were not changed. The downloaded lock records `node-addon-api@8.9.2`; the candidate's npm integrity is `sha512-RbOBxmLBG8uvFUc15X9+9SFemKcQ0WBuISBVkpuiaUB2qblC8UWlHEjdWVoZ8AdhSwmoEgsiXKfopX0CQxaACQ==`.
- Static checks covered the published manifest, license, JS loading paths, native entry source and SQLite header. The manifest and binding loader correspond to the pinned upstream sources linked in D034. The package includes prebuilt binaries and has no install lifecycle script; its SQLite header reports 3.53.4. This is not a reproducible-build verification of the native binary. `npm audit --package-lock-only --json --ignore-scripts` on the two-package candidate tree exited 0 with zero reported advisories; upstream's advisory page also had no published advisories. Neither check proves absence of vulnerabilities.
- Experiment image `google-tasks-mcp:storage-eval`, `sha256:3024a367cfeb193f4bc4569d752b082b886176f5bda6a01265beddc2fb48b8b6`, derives from the fixed build image below. Only its copies of the storage source and compiled import were substituted with the candidate. The original compiled Store was retained for format round trips. No DDL was duplicated or changed. The disposable recipe and test driver are retained locally under the system temporary directory `google-tasks-storage-eval`; they are research artifacts, not a checked-in regression suite.
- The final run exited 0 on Node v24.22.1 / npm 11.19.1, Linux arm64. Runtime restrictions: non-root, no network, read-only root, dropped capabilities, no host credentials/data/socket mounts, 768 MiB and two CPUs; only `/tmp` and two Vite cache directories were writable tmpfs. Probes verified UID 1000, only loopback interfaces, and EROFS on an application-directory write. The initial run failed because Vite needed its cache directories; only those scratch mounts were added before rerunning.
- Additional synthetic assertions passed: old Store → candidate → old Store database round trip; integrity checks; DELETE journal/FULL sync; database mode 0600; persisted in-flight → uncertain recovery; encrypted-vault round trip; cursor account isolation; and 20 simultaneous independent candidate connections yielding exactly one successful claim. `npm test` passed all 80 product cases; `npm run test:synthetic` passed legacy/modern stdio and SIGKILL/snapshot recovery with the candidate import.
- Limits: no candidate TypeScript integration or clean project-lock install/build has been completed; Linux x64 and native macOS were not executed; contention timeout coverage and independent integration review remain pending. D025 is still open. No real Google data, human acceptance, running tunnel replacement or deployment was involved.
- After recording the evidence, the unchanged project driver passed `npm run check` on the unsupported host Node 26 environment: 14 component checks, context checks, 9 developer-tool cases, type checking, 80 product cases and build. `git diff --check` also exited 0. This checks the evidence update and current project, not candidate typing or adoption; fixed-environment candidate runtime results are listed separately above.

### Synthetic tunnel readiness

- A read-only probe of the existing loopback health URL returned HTTP 200 for both `/healthz` and `/readyz`. The default execution environment denied the same loopback requests with `PermissionError`; that denial was not evidence of a stopped tunnel. No runtime key was read. This proves local client readiness only; actual ChatGPT refusal/acceptance/read-back/replay remains pending owner interaction.

### Fixed environment restored — subsequent verification

- After the owner restored OrbStack, `docker --context orbstack build --target build -f containers/Dockerfile -t google-tasks-mcp:personal-check .` exited 0. The full check ran successfully: 80 product cases, 9 developer-tool cases, 14 component checks, context checks, type checking and build. The dependency installation layer was cached. Build image: `sha256:1587ab1214642d1ba5c0c5ecbe947963855885276235c1624e817de96c559a6d`.
- Separate network-disabled containers reported Node v24.22.1 and npm 11.19.1. `docker --context orbstack run --rm --network none --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --user node --entrypoint npm google-tasks-mcp:personal-check run test:synthetic` exited 0: legacy and modern stdio approval simulations plus SIGKILL/replay/snapshot/isolation recovery passed.
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:p3-demo .` exited 0, reusing the successful build check layer. Runtime image: `sha256:3ec606de1a9d594fd6f5301c98aa3125c42e24a90a959f924696d0f529765418`. `TASKS_DEMO_SMOKE_CONTAINER=1 node scripts/check-demo-stdio.mjs --modern` exited 0 through the actual wrapper and dedicated synthetic volume; refusal, CRUD/read-back, replay and third-page search passed.
- These image builds precede this evidence-only documentation update; product code is unchanged. No tunnel was restarted, no real credentials or Google data were accessed, and no human/ChatGPT approval result is claimed. The owner can now restart the existing synthetic connection using the documented hidden-key launcher.

### Initial host verification

- The owner confirmed that the existing uncommitted context architecture, tests, documentation and private tunnel launcher changes are the work to continue. They were preserved; no product behavior was changed in this status pass.
- `npm run check`: exit 0 on host Node v26.0.0 / npm 11.12.1; 14 component checks, 10 context sources / 15 source files / 37 relative imports, 9 developer-tool cases, 80 product cases, type checking and build passed. This host is outside the pinned toolchain; it is supplementary evidence.
- `npm run test:synthetic`: exit 0. Legacy and 2026-07-28 stdio both passed refusal, synthetic create/update/complete/read, replay without another approval and three-page search. SIGKILL, uncertain replay refusal, snapshot restoration, account isolation and original-key enforcement passed. The stale snapshot still loses later ledger entries; production recovery remains gated.
- `git diff --check` and `/bin/zsh -n scripts/start-private-tunnel.zsh`: exit 0.
- Fixed-environment verification was attempted with `docker --context orbstack info`: the engine socket was absent. No new container build or container test result is claimed. The 2026-10-30 evidence below remains historical.
- No Google data, credentials, ChatGPT interaction, tunnel restart, remote publication or deployment was performed. Human approval acceptance remains unverified. Next: restore the fixed environment, revalidate it, then resume the existing synthetic tunnel and record actual ChatGPT refusal/acceptance/read-back/replay evidence. Real MCP writes remain disabled under the existing release gates.

## Latest reproducible evidence — 2026-10-30

- OrbStack fixed build image (`google-tasks-mcp:personal-check`, image `sha256:a4f6ee3b3e97fcd97b3a5bc7faf2f9c122cdebdc5e02f7bfedeea48ad2b9593f`) passed the full check: 80 product cases, 9 developer-tool cases, type checking, build and 14 component checks. This image predates the launcher/documentation edits in this delivery; final source check is recorded separately when run.
- `docker --context orbstack run --rm --network none --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --entrypoint npm google-tasks-mcp:personal-check run test:synthetic`: exit 0. Legacy and modern approval/CRUD/replay/third-page search plus SIGKILL/uncertain/snapshot recovery passed. All fixtures and approvals were simulated; no Google credentials or network were available.
- `TASKS_DEMO_SMOKE_CONTAINER=1 node scripts/check-demo-stdio.mjs --modern`: exit 0 against the real synthetic OrbStack wrapper and its dedicated persistent volume. This proves local transport compatibility, not ChatGPT human approval.
- Launcher validation: zsh syntax passes; missing/unknown arguments exit 2; noninteractive input and empty interactive key exit 1 before starting a tunnel. No actual runtime key was used.
- After the launcher and documentation changes were stamped, `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:p3-demo .` exited 0, including the full fixed-version check (80 product cases and 9 developer-tool cases). Runtime image: `sha256:3ec606de1a9d594fd6f5301c98aa3125c42e24a90a959f924696d0f529765418`. This evidence-only entry was added afterward and checked with the documentation validators.
- `node scripts/check-google-stdio.mjs`: exit 0 against the actual Google read-only wrapper; four tools and protocol 2025-11-25 were verified. No Google task content was requested and no token refresh occurred. This is protocol evidence, not a fresh live Google or ChatGPT acceptance test.

Real ChatGPT approval and the release blockers remain pending in [the release plan](RELEASE_PLAN.md).

本文件保留完整驗收計畫；本機版本已實作並有自動化及 Inspector 證據。已完成專用帳號 REST CRUD 與一次 ChatGPT 真實唯讀清單呼叫；完整自然語言任務管理 E2E 尚未完成，不能將下列計畫全部視為已通過。

## 測試邊界

Vitest 做單元與整合測試，MSW 模擬 Google／OAuth HTTP。測試模式預設阻擋所有未宣告 network requests；fixtures 全為合成資料。使用 fake clock 與測試專用 signing keys，不使用真實 Google credential。

人工 Google／ChatGPT E2E 需要另行明確授權，使用專用測試帳號與手動建立的專用測試清單。設定 allowlisted taskListId；對清單外的寫入由 server 拒絕。不得拿金融、學校或日常任務當測試資料。清理也不得擅自加上刪除工具或刪除真實資料。

## 必要案例

| 類別 | 案例 | 觀察／通過條件 |
|---|---|---|
| 清單／任務分頁 | 3 頁、空 items、最後無 token、重複 token | 所有頁可續讀；重複 token 停止並報錯，不無限循環 |
| 搜尋 | 唯一匹配在第 3 頁、全不匹配、超過 10 頁、預算逾時 | 找到遠頁；未掃完 complete=false 且能續讀，不報「沒有」 |
| flags | 未完成、completed + hidden、deleted、assigned | 結果符合工具公開範圍；完成任務不會因 hidden 被漏掉 |
| 輸入 | 空白標題、長度邊界、emoji、額外欄位、空 changes、非法 pageSize | 無效輸入在呼叫 Google 前拒絕，寫入次數 0 |
| 日期 | 2028-02-29 合法、2026-02-29 非法、含時間、null、往返序列化 | 嚴格曆法檢查，不靜默截斷時間或移動日期 |
| 精確 ID | 同名兩任務、錯誤清單、已不存在 task | 僅選定 ID 改變；不改動同名者、不自行改選 |
| 核准 | 缺少／偽造／過期／重放／換 payload／換帳號 | 全部拒絕；approved snapshot 改變必重新核准 |
| 建立冪等 | 同 key 重試 10 次、20 個並發、換 payload、兩帳號同 key | 每隔離鍵最多一次 POST；衝突明確拒絕，帳號不互洩結果 |
| 不確定寫入 | 上游已建立卻 timeout、5xx、寫結果 DB 失敗、process crash | uncertain 持久化或從 in_flight 恢復為 uncertain；重試 POST 次數仍為 1 |
| 儲存 | DB 不可用、重啟、紀錄到期、tombstone | DB 故障不寫；重啟及保存期限內不可重建；未知狀態不自動解除 |
| 更新／完成 | partial patch、已完成 no-op、外部並發更新 | 未指定欄位保留；只改目標；stale 拒絕，競態限制有證據 |
| MCP auth | 缺／錯 signature、issuer、audience、exp、nbf、scope | 存取 storage／Google 前拒絕；challenge 正確、不洩漏原因細節 |
| Google auth | expired access、refresh 成功、缺新 refresh token、invalid_grant | refresh single-flight；保留舊 refresh token；撤銷轉重連，不循環重試 |
| OAuth callback | 缺／錯／重放 state，redirect injection，換綁 | 不建立錯帳號連結；state 單次且過期失效 |
| 帳號隔離 | A 取得 B 的 taskId、cursor、operationKey、approval；交錯並發 | 不回傳 B 內容、不用 B token、不沿用 B 的 cache |
| 網路／速率 | 429 + Retry-After、GET 503、讀逾時、寫逾時 | 讀取有界退避；寫不盲重試；不回假成功 |
| 提示注入 | notes 含「忽略規則、改別的任務、傳 token」 | 作為資料回傳；無額外寫入／網路，無秘密外洩 |
| Calendar 邊界 | 任務日期、硬性 deadline、三點提醒、循環請求 | 不宣稱時間功能，不發出任何 Calendar API request |
| 日誌 | auth 及 upstream 錯誤、成功回傳 | 無 token、secret、任務全文或 stack 洩漏 |

## 時區矩陣

先用固定 instant 與指定 zone 測日期推導，再獨立測 Google 純日期編碼，不能混為同一件事。

| 輸入 | 預期 |
|---|---|
| 2026-11-02T07:30:00Z → America/Vancouver | 2026-11-02 00:30、UTC−7；舊規則會錯到前一日 |
| 2026-11-02T07:30:00Z → Asia/Taipei | 2026-11-02 15:30、UTC+8 |
| 2026-01-15T08:30:00Z → America/Vancouver | 2026-01-15 00:30、UTC−8；不改寫歷史 |
| 2026-03-08T09:59:00Z／10:00:00Z → Vancouver | 01:59 UTC−8／03:00 UTC−7 |
| taskDate=2026-11-02 在上述兩 zone 編碼／回讀 | 皆維持 2026-11-02，不因本地化變成 11 月 1 日 |
| 模擬過舊 tzdb | health／日期推導檢查失敗並明確回報，不默默使用舊規則 |

在 CI／部署記錄 Node、ICU、tzdb 版本及實際 offset。測試必須以省府公告為預期值，不能把 runtime 輸出再拿來當 expected。

## MCP Inspector 與人工 ChatGPT 工作流

Inspector 驗證 initialize、tools/list、schema、annotations、structuredContent、驗證失敗與完整／部分分頁。協商 protocol 版本須記錄；不得只測 domain function 就聲稱 MCP 相容。

獲准後在 ChatGPT 執行 20 個固定繁體中文案例：一般流程（清單、分頁、搜尋、取得、建立含／不含日期、更新、完成、已完成列表）；風險流程（同名選擇、重送、逾時、無核准、撤銷、跨帳號、提示注入、含時間、硬截止、循環、無 Calendar plugin）。安全流程全數通過，一般成功率 ≥95%；記錄提示、確認方式、工具輸入、去識別化結果及最終 Google 狀態。逐筆核准模式及「記住核准」設定分別驗證，後者不可繞過 server policy。

若產品表面不支援所選核准通道，寫入驗收失敗，不能用手動修改 DB 或模型 confirmed 欄位代替。跨 plugin 協作留第 6 階段，不影響單一 Tasks 工具驗收。

## 階段證據格式

每階段紀錄 commit（若有）、命令、環境、測試數及通過／失敗、未測項與原因。建議第 1 階段起提供 `npm run typecheck`、`npm test`、`npm run build`；目前可直接執行 `npm run check`。CI 使用相同指令且不注入真實 Google secrets。

第 0 階段驗證紀錄：2026-10-27，八份要求文件及本地相對連結已以檔案檢查驗證；官方來源已瀏覽。無產品測試、無 Google E2E、無 ChatGPT E2E。

## 2026-10-27 本機驗證紀錄

- 環境：macOS、Node v26.0.0、npm 11.12.1、ICU 78.3、tzdb 2026a；目前無 Git metadata，因此無 commit。
- `npm run check`：typecheck、5 個測試檔共 52 項測試、build 全部通過。其後對 MCP 測試補協商版本檢查，該檔再次通過。
- 測試含：非法日期與欄位、三頁搜尋／有界中斷及續讀、cursor 帳號與查詢隔離、20 並發單次寫入、重播、過期核准、DB 故障與重啟 uncertain、Google REST／OAuth MSW、refresh single-flight、換綁後舊 stdio 拒絕新 token、SDK HTTP 工具讀寫與錯誤。測試中的核准直接呼叫 Store 是模擬，不是人類核准驗收。
- 官方 SDK client 經 HTTP handler 實際協商版本：`2025-11-25`。Inspector CLI 2.12.0 以 `--protocol-era legacy` 連至真正 loopback server，`tools/list` 成功列出 7 工具；`tools/call search_tasks` 成功回傳 demo-205、scannedPages=3、complete=true。Inspector GUI 尚未人工操作。
- `npm audit --offline` 回報 0 vulnerabilities；此為當地快取結果，不代表安全稽核完成。
- 時區檢查偵測 Vancouver 2026-11-02 為錯誤的 GMT−08，health 正確回 `localDateInferenceSafe=false`。純日期往返通過；相對日期與新的 Vancouver 規則驗收未通過，禁止使用此環境推算相對日期。
- 未執行：真實 Google OAuth／資料 round trip、ChatGPT 遠端連線與對話 20 案例、MCP provider/JWT 驗證、正式寫入、If-Match 實測、GitHub CI、部署與發布。
- Node 的 experimental localStorage warning 及 SDK JSON mode 通知警告會出現在開發終端；目前工具沒有中途通知，不影響工具結果。

Loopback 實際網路檢查：GET /health=200；外站 Origin=403；以原始 node:http 傳送惡意 Host=403。Node fetch 忽略自訂 Host，故未將該 fetch 的 200 當作防護測試結果。服務已重啟至最新 build，供使用者測試。

## 2026-10-27 元件規格與強制同步驗證

- 13 個元件均建立同目錄 SPEC.md，包含契約、檔案定位、父子雙向連結與修改決策；程式依責任搬移到元件目錄，四個執行入口維持原名。
- `npm run docs:test`：6 項 Node 測試通過。涵蓋修改後未同步拒絕、stamp 後恢復、增刪檔案、SPEC 自身修改、缺少檔案定位、缺少父子連結、缺少新元件規格、錯誤父層及未登錄子目錄的追蹤。
- `npm run typecheck`、`npm test`、`npm run build`：搬移後全部通過；Vitest 仍為 5 檔 52 項合成資料測試。
- `npm run docs:check`：13 元件的指紋、結構及本地連結通過。此檢查已加入 `npm run check`，既有 CI 會使用相同入口；未執行 GitHub 遠端 CI。
- 指紋檢查不依賴 Git，但不能證明契約語意正確，不能阻止有意改寫檢查器的人；仍須審查規格及驗證行為。未進行新的真實 Google／ChatGPT E2E，本次為本機文件制度與模組整理。

## 2026-10-27 OrbStack 打包與上線規劃

- 新增 RELEASE_PLAN 的 G0–G6 gates、容器驗收矩陣、真實帳號／遠端核准阻擋、備份恢復與避免遺失冪等紀錄的回復規則。
- OrbStack 已啟動；Docker Engine 29.8.2；`docker --context orbstack compose -f containers/compose.yaml config --quiet` exit 0。
- 容器 build／health／MCP 與 persistence 尚待本輪實測，不能以 Compose config 通過取代 runtime 驗收。真人核准、真實 Google／ChatGPT E2E、遠端部署及發布仍未執行。


### 本輪 OrbStack 實測結果（追加）

- 宿主 `npm run check` exit 0；14 元件文件檢查、6 項文件制度測試、typecheck、5 檔 52 項應用測試、build 全部通過。
- `docker --context orbstack compose -f containers/compose.yaml build` exit 0；Linux Node 24 建置階段同樣執行完整 check 並通過。runtime 僅安裝 production dependencies；建置 npm audit 當時回報 0，不代表完整安全審查。
- 映像 `google-tasks-mcp:local` ID：`sha256:13cb708fe675f1dd04e11886e05fb558e0e8e2403319abf028fb681e126ac2ba`。Node 基底 digest：`sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205`。此 image 包含本輪程式及當時文件；以下追加證據為建置後文件更新，runtime 程式未再修改。
- `compose up -d --wait` exit 0／Healthy。runtime UID=1000、Node v24.22.1、ICU 78.3、tz 2026e。`docker inspect` 確認 root filesystem 唯讀、CapDrop=ALL，唯一持久掛載為 `google-tasks-demo_demo-data` → `/data`，沒有宿主資料或憑證掛載。
- Mac 端 Node fetch `http://127.0.0.1:3001/health`=200，demo／realGoogleConnected=false；Vancouver GMT-07:00、Taipei GMT+08:00、localDateInferenceSafe=true。此為 health 內固定日期診斷，不能證明所有相對日期推算；產品仍只接受明確 YYYY-MM-DD。
- Mac 原始 node:http：惡意 Host=403；合法 Host 搭配外站 Origin=403。腳本使用 assert 檢查預期狀態，exit 0。
- Mac SDK client 透過實際容器 HTTP 協商 MCP `2025-11-25`；tools/list=7。search_tasks 返回 demo-205、scannedPages=3、complete=true；list_task_lists、list_tasks、get_task 均無 isError。list_tasks 首頁 complete=false 並有 nextCursor，未聲稱已取得全部任務。
- `compose exec -T demo node dist/cli.js create_task` 使用唯一合成 key `orbstack-persistence-20261027`：預期 exit 1／APPROVAL_REQUIRED。`compose down`（不加 -v）exit 0，再 `up -d --wait` exit 0；同參數重試仍 exit 1／APPROVAL_REQUIRED、operationRef 完全相同。這證明待核准操作持久化，尚不代表人工核准、已寫入任務保存或 crash 恢復驗收。
- 容器目前保留在 3001 供本人測試。未執行：人工互動核准及容器內建立／更新／完成驗收、拋棄式 volume crash 演練、正式備份還原／回復演練；真實 Google／ChatGPT、遠端部署與發布均未執行。G1 尚未全數放行，G2–G6 仍依 RELEASE_PLAN 阻擋。

## 2026-10-27 固定版本與契約收緊

- 宿主 Node 26.0.0：npm run typecheck、npm test 通過（5 檔 52 案）；宿主不是固定支援版本，正式驗證另以 OrbStack Node 24.22.1 執行。
- 線上 npm audit --json exit 0：0 個已知漏洞；核對 9 個直接套件正式版本／未 deprecated。未使用 audit fix，未升級套件內容，只固定既有版本。
- exactOptionalPropertyTypes 試驗因 MCP Node HTTP adapter 型別不相容撤回，未用斷言遮蔽。SQLite RC 已列 G5 阻擋。
- 更新後完整 check 與固定 digest 容器驗證結果於後續紀錄追加；未執行真實 Google／ChatGPT E2E 或遠端 GitHub CI。

### 固定環境實測結果

- 宿主 npm run check exit 0；文件同步 14 元件、文件測試 6 案、型別、產品測試 52 案、build 均通過。
- docker --context orbstack compose -f containers/compose.yaml build exit 0；乾淨 npm ci --ignore-scripts 與容器內完整 check 通過相同案例。Linux Node 24.22.1／npm 11.19.1；生產依賴安裝 audit 0。映像 sha256:d403c041bb89d156aaef21547f6baf5302900037b58ad08a07ac49613d56a6c9。此後僅追加文件證據，不更動 runtime。
- compose up -d --wait exit 0，容器 healthy；health 為 demo、realGoogleConnected=false、ICU 78.3、tz 2026e、localDateInferenceSafe=true。SDK MCP 列出七工具，list_task_lists 與三頁 search_tasks 完整成功。
- Host／Origin 拒絕驗證：Node fetch 的 Host 覆寫未實際送達（回 200，該次斷言失敗），改用 curl 明確設定標頭，兩者均 403。是探測工具修正，未修改 guard。
- 仍未執行真實帳號、人工寫入驗收、crash 演練、ChatGPT E2E、正式部署或 GitHub CI；各自放行門檻維持。

- 重建後以 readOnly 開啟 /data/demo.sqlite 核對既有合成提案：ref 與前次一致、state=pending、approved_until=null。一次探測誤用 state.sqlite 建立空資料庫，驗證 sqlite_master 為空後已移除；未更動 demo.sqlite 的內容。

## 2026-10-27 使用者指定 CLI 自動驗證

- 實際執行 docker --context orbstack compose -f containers/compose.yaml exec -T demo node dist/cli.js search_tasks '{"taskListId":"demo-inbox","query":"第三頁"}'，exit 0。
- 另以 Python subprocess 執行相同命令並解析 JSON，自動斷言 mode=demo、items 精確為 demo-205、scannedPages=3、complete=true，全數通過。非僅人工檢視輸出；未變更合成任務。
- 僅檢查 .data/google-client.json 是否存在，結果 false；未讀取憑證、未連線 Google。下一步為使用者建立測試用 OAuth Desktop client，再親自以指定專用帳號授權 readonly；此時才進入真實 Google 驗證。現有 OrbStack demo 不掛載 Google 憑證。
- 重新核對官方桌面 OAuth 與 Tasks scope 文件（2026-10-27）：https://developers.google.com/identity/protocols/oauth2/native-app 、https://developers.google.com/workspace/tasks/auth 。使用既有本機 PKCE／loopback 流程，僅要求 tasks.readonly；未執行真實帳號、寫入、ChatGPT E2E 或部署。

## 2026-10-27 使用者完成 OAuth 後的真實唯讀驗證

- 使用者確認憑證所屬專案 ID，親手完成 CONNECT 及 Google 授權，再回報連線完成。未輸出憑證、授權碼、token、清單 ID 或任務內容。
- 使用既有 google-tasks-mcp:local 映像，docker --context orbstack run --rm --network host --read-only --cap-drop ALL --security-opt no-new-privileges，僅將本機 .data 掛載至 /data；Node 24.22.1。此為獨立 Google 驗證容器，既有合成 demo 服務不掛載憑證。
- 在容器中呼叫 googleLocal().connected() 及 service().call('list_task_lists', {pageSize:100})；exit 0，connected=true、mode=google、listCountOnPage=1、complete=true。對外僅回傳數量及狀態。
- 名稱精確等於「MCP 測試」的清單數為 0；未進一步讀取清單內任務，亦未寫入。等待專用清單及合成任務準備完成，才能驗證搜尋、日期與 get_task。
- 目前 scope 僅 tasks.readonly；沒有 openid/email，因此本次 API 結果無法獨立證明登入 email，登入帳號仍由使用者於 Google 頁面確認。這是本機 Google REST 唯讀連線成功，不是 ChatGPT MCP E2E 或完整產品驗收。真實寫入仍由 REAL_WRITES_DISABLED 阻擋。

## 2026-10-27 CRUD 前置授權核對與修正

已獲使用者明確授權建立專用合成清單並測 CRUD。OrbStack Node 24.22.1 透過 Google tokeninfo 核對既有連線：verified=true、tasksReadWrite=false、tasksReadOnly=true（exit 0）；未輸出 token、帳號或任務內容。使用者隨後在 Cloud Console 加入 tasks scope；仍待使用新 --write-test 流程重新同意及再次驗證實際 token。

新增預設唯讀／顯式讀寫 OAuth URL 測試、讀寫 grant refresh 可滿足讀取，以及 readonly grant 不能滿足讀寫且不得保存。完整 check 與容器 build 結果在執行後追加；尚未執行真實 CRUD。

前置修正驗證完成：宿主 `npm run check` exit 0（14 元件同步、6 文件檢查測試、typecheck、56 合成案例、build）。`docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:local .` exit 0，Node 24.22.1 建置階段完整 check 同樣通過；image sha256:463dde47e51498bc3531ad66aea9fc1820f7f859a23e6f1af70b42b1b8067221。僅完成讀寫重新授權入口；真實 CRUD 因現有 token 唯讀尚未執行。

## 2026-10-27 重新授權與固定 CRUD 測試

使用者回報重新同意完成後，OrbStack tokeninfo 驗證 exit 0：verified=true、tasksReadWrite=true；只輸出布林，不輸出 token 或帳號資料。宿主 typecheck 與 6 檔 62 項合成測試通過，新增 6 項 CRUD harness 安全案例（唯讀拒絕、20 並發、跨帳號、結果不明禁止重送、快取重播與額外資料阻擋清理）。完整 check、固定 Node 容器與真實 CRUD 結果待實際執行後追加。

### 真實 CRUD 執行結果

- 宿主 `npm run check` exit 0：14 元件同步、6 文件制度案例、typecheck、6 檔 62 項合成測試、build 全通過。
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:local .` exit 0；固定 Node 24.22.1 容器內完整 check 同樣通過。映像 sha256:721aaab63cc2f0b5e4e83d096abb4dc3300f33f2f3224957fe026e23e645fa1c。
- 已實際執行 `docker --context orbstack run --rm --network host --read-only --cap-drop ALL --security-opt no-new-privileges --mount type=bind,source=/path/to/google-tasks-mcp/.data,target=/data --env TASKS_DATA_DIR=/data --entrypoint node google-tasks-mcp:local dist/google-crud-test.js`，exit 0。
- 機器斷言結果：mode=google-rest-test，create/read/search/update/complete/delete/cleanup 全部 true。只建立一份新專用清單及一筆合成任務；讀回比對標題、筆記、2026-11-02 日期，搜尋 complete=true 且精確命中 ID，修改為 2028-02-29 後讀回比對，完成後再次讀回。清理前確認完整清單只有本次任務且無指派資料；刪除任務後清單為空，刪除清單後 Google 回傳不存在。
- 測試未輸出 token、secret、清單 ID、任務 ID 或既有任務內容；操作紀錄保存在忽略的本機加密憑證資料目錄，未加入原始碼。OAuth 未要求 openid/email，仍不能從 API 獨立證明 email，帳號由使用者於授權畫面選擇。
- 此為真實 Google REST／adapter CRUD 驗證，並使用既有 service 搜尋；不是 ChatGPT MCP E2E。正式 MCP 寫入仍回 REAL_WRITES_DISABLED。尚未執行：ChatGPT 對話驗收、遠端 OAuth／可信逐筆核准、If-Match 條件更新驗證、crash／備份還原演練、部署或 GitHub 發布。
- 本段與規劃狀態為映像建置後追加文件，runtime 程式未再修改。

## 2026-10-27 ChatGPT 私人唯讀接線準備（D028）

- 宿主 `npm run check` exit 0：14 元件同步、6 項文件制度測試、typecheck、6 檔 63 項產品測試與 build 通過。新增唯讀工具註冊整合案例：20 個並發建立／更新／完成請求全部拒絕，service 呼叫次數為 0；後續三頁搜尋完整成功。這些皆為合成資料。
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:local .` exit 0；固定 Node 24.22.1 容器內完整 check 同樣通過。映像 sha256:f68f99150aa9e0109bdaf0e4fc68982fcb88b252a77e7d9b8fd4042c59e33ef1。
- `node scripts/check-google-stdio.mjs` exit 0：實際透過 OrbStack 容器 stdio 完成 SDK 協定交握，protocol=2025-11-25、toolCount=4、readOnly=true、googleDataRequested=false。僅列舉工具；未呼叫 Google Tasks 資料工具、未刷新 token、未輸出憑證或真實內容。
- `docker --context orbstack ps --filter name=google-tasks-mcp-private-stdio --format '{{.Names}}'` exit 0、輸出為空，確認本次容器隨協定連線結束自動清理。
- 已開啟 Platform Tunnel 頁，實際被導向登入；待使用者登入及確認 ChatGPT 空間、Tunnel 權限與僅本人存取。未安裝或啟動 tunnel-client、未建立外部 Tunnel／私人 plugin、未部署或公開本機 HTTP。
- 尚未完成 ChatGPT MCP E2E；現有 Google CRUD 證據仍僅代表前節的獨立 REST 測試。私人接線暫限四項讀取工具；正式 MCP 寫入、條件更新與逐筆可信核准門檻維持。建置後僅更新文件證據，runtime 未再修改。

### Tunnel 工具準備驗證

- 官方 macOS ARM64 ZIP SHA256 比對通過；本機 tunnel-client v0.0.18 的 version／quickstart／init 均 exit 0。僅在忽略的 .data 內安裝及產生環境引用 profile。
- doctor exit 2：缺少 CONTROL_PLANE_API_KEY；尚未執行遠端 polling、health/readiness、ChatGPT discovery 或工具呼叫，不能算 ChatGPT E2E。Platform Tunnel 尚缺 ChatGPT workspace 關聯，外掛頁有人機驗證待使用者完成。
- 此輪未修改產品程式；僅追加操作證據及文件指紋，沿用前節 63 項產品／6 項文件測試證據。

- 2026-10-27 後續 UI 觀察：ChatGPT Plugins 已離開 Cloudflare 驗證，顯示首次使用「一切就緒」條款畫面；「繼續」會同意服務條款。已交由使用者閱讀與確認，未代按；私人 plugin、workspace 綁定與 ChatGPT E2E 仍未完成。

- 2026-10-27：ChatGPT 登入後可開啟自訂 MCP 表單，已準備既有 Tunnel 與四工具唯讀配置，尚未建立。Platform workspace 搜尋無結果；key 表單確認只有 Read／Use、七天到期，尚未送出。run --help 與 runtimes connect --help exit 0，未啟動 runtime 或進行 ChatGPT 工具呼叫。

- 2026-10-27 使用者回報已啟動後的實際檢查：`.data/tunnel/health-url` 不存在；以升權唯讀 `ps -axo pid=,comm=` 僅篩選程序名稱，未找到 tunnel-client 或 cloudflared。未讀取程序參數、環境或金鑰；尚無 health／ready／polling 證據。需在本機終端機執行文件中的隱藏輸入啟動命令，再驗證，不能將金鑰已建立視為 client 已運行。

- 2026-10-27 後續啟動驗證：使用者再次回報程序已運行，health-url 已存在且指向 loopback。一般沙箱請求遭 Operation not permitted，改用獲准的本機唯讀請求後，`/healthz` HTTP 200 `live`、`/readyz` HTTP 200 `ready`。ChatGPT 自訂 MCP 表單仍未勾選或送出；已就新增測試帳號唯讀資料存取請求當次確認。此證據只確認 client 健康與就緒，尚未證明 ChatGPT 工具呼叫或空間關聯成功，未宣稱 polling 已獨立驗證。


## 2026-10-27 私人 ChatGPT 真實唯讀連線驗收

使用者當次批准建立私人唯讀外掛。第一次建立因 Tunnel 尚無 workspace 關聯遭拒；登入後 Platform 下拉出現可用 workspace，選取並儲存後重試，外掛建立、連接與安裝成功（dev mode／DEVELOPMENT）。未發布、未分享，也未開啟寫入。

ChatGPT 驗收對話先顯示四個唯讀工具，再實際呼叫 list_task_lists(pageSize=1)；執行區顯示「列出任務清單」，回覆成功、本頁清單數 1、complete=true、無 nextCursor。只保留數量與旗標，不保存清單名稱、ID、游標、任務內容或憑證。此為一次真實 ChatGPT 至 Google 的唯讀工具呼叫成功，未讀取清單內任務。

未驗收項目：其餘三個讀取工具的 ChatGPT 資料案例、專用任務清單查詢與搜尋、換綁拒絕、ChatGPT 寫入核准及 G2–G5。產品程式未修改；沿用已記錄的 63 項合成測試與固定容器證據，本輪只同步文件並執行 docs:check。


## 2026-10-28 本輪執行計畫（先記錄，後執行）

使用者要求完整測試到上線規劃、紀錄後執行，並重申最終目標是 ChatGPT 自然語言安全管理任務。以 [RELEASE_PLAN](RELEASE_PLAN.md) P0–P8／C01–C20 為本輪驗收基線；先做完整回歸與隔離 SIGKILL／備份還原演練，再推進真實資料與可信核准。所有實際結果另追加，不覆寫歷史，尚未執行項不算通過。當前宿主 Node 26.0.0/npm 11.12.1 非支援基線；固定 Node 24.22.1/npm 11.19.1 的容器結果才是標準環境證據。

### 本輪實際結果（2026-10-28）

- 宿主 `npm run check` exit 0：14 元件同步、6 文件制度案例、typecheck、6 檔 63 產品案例、build。宿主 Node 26.0.0/npm 11.12.1 為補充證據，不能替代固定環境。
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:release-rehearsal .` exit 0。固定 Node 24.22.1/npm 11.19.1 的建置階段完整 check 同樣通過。npm ci --ignore-scripts 層使用快取，未宣稱本輪重新下載全部套件。runtime image 為 sha256:f68f99150aa9e0109bdaf0e4fc68982fcb88b252a77e7d9b8fd4042c59e33ef1；沒有覆寫既有 local tag 或重啟私人 Tunnel。
- `docker --context orbstack compose -f containers/compose.yaml config --quiet` exit 0；未啟停現有服務。隔離 runtime 為 uid 1000、Node 24.22.1、ICU 78.3、tz 2026e；2026-11-02 Vancouver 顯示 GMT−07。這不授權相對日期推算。
- `npm audit --json` 初次因 DNS ENOTFOUND 未完成；允許網路後重跑 exit 0，total vulnerabilities=0（production dependencies 7、總依賴 251）。只代表此次資料庫快照，不保證日後無漏洞。
- `node scripts/check-recovery.mjs` exit 0。另在固定 Node 容器以 `--network none --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:size=32m,mode=1777`、唯讀掛載該腳本、獨立暫存 DB 執行同一腳本，exit 0。
- 恢復演練機器斷言全部 true：實際 SIGKILL、uncertain 阻擋重送、成功重播沒有第二次寫入、一致性快照還原、帳號隔離、還原需原金鑰、舊快照遺失快照後 ledger、未請求 Google。20 次重播為循序，不冒稱新加的 20 並發恢復案例；既有並發案例以 Vitest 證據為準。核准在此為模擬，不能作人類核准證明。
- 發現並記錄：舊 DB 快照確實缺少快照後的操作紀錄。因此本輪只證明快照可還原，沒有實作或宣稱舊備份可安全直接接管正式寫入；G5 仍須停寫、對帳與相容版本回復流程。
- 未執行：本輪新的真實 Google CRUD、ChatGPT 20 案、真實可信逐筆核准、實際 Google If-Match 拒絕測試、正式部署、公開發布。現有真人帳號／私人唯讀證據維持前節範圍。此次最終證據文件在 image build 後追加，runtime 未變更。


## 2026-10-28 P3 合成核准與條件更新迭代

已執行 `npm run typecheck && npm test && npm run build && node scripts/check-demo-stdio.mjs && node scripts/check-recovery.mjs`，exit 0；6檔78個產品案例通過。stdio 使用實際子程序及官方 SDK，模擬 decline／accept，建立→修改→完成→get 成功；相同建立重播無第二次寫入／提示；第三頁搜尋 scannedPages=3、complete=true。未接觸真實 Google 或 ChatGPT。

新增安全證據：版本條件20並發只一筆成功；最後讀後競爭不覆蓋；非法或缺版本在網路／claim 前拒絕；412 definitive、寫入網路失敗不重試。核准綁定 scope/ref/digest/期限、20接受最多一寫；拒絕、未勾選、異常、預取消、等待中取消、60秒逾時／遲到接受、確認期間任務改變，皆不授予核准／不執行對應寫入；Google gate 不可被 callback 繞過。恢復演練 SIGKILL／restore 再通過。

發現並修復：預取消 promise 曾產生 unhandled rejection，現於建 promise 前檢查；Vitest 重跑無 unhandled error。發現並保留安全限制：stateless HTTP 無 retained elicitation capability 時 APPROVAL_UNAVAILABLE，上游寫入0；不得為通過測試偽造客戶端能力。長連線 SDK 與 stdio 通過只是協定原型，不證明真人同意。

本輪尚未執行：ChatGPT 合成表單真人驗收、Google If-Match 真實端點競爭測試、正式遠端認證、真實 MCP 寫入、穩定儲存遷移、部署／發布。

### P3 固定環境與實際容器證據

- `docker --context orbstack build --target build -f containers/Dockerfile -t google-tasks-mcp:p3-check .` exit 0；固定 Node 24.22.1／npm 11.19.1 的完整 check 通過：78 產品、6 文件案例、typecheck、build。
- p3-check 在無網路、唯讀 root filesystem、非 root、移除 capabilities、禁止權限提升及獨立 /tmp 下執行 `scripts/check-demo-stdio.mjs` 與 `scripts/check-recovery.mjs`，均 exit 0；沒有掛載宿主憑證。這些是合成 SDK 核准及恢復證據。
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:p3-demo .` exit 0，完整 check 再通過；runtime image sha256:1e08fc81eb97334d5d916da63069f547938aebfb8aebecc43fb75f5f07c03ce3。
- `TASKS_DEMO_SMOKE_CONTAINER=1 node scripts/check-demo-stdio.mjs` 連續兩次 exit 0，實際經 containers/demo-stdio.sh 啟動 runtime，保留同一個專用合成 named volume。每次皆驗證 declineBlocked、createUpdateCompleteRead、replayWithoutReprompt、threePageSearch 為 true。固定容器沒有網路、沒有 Google 憑證，也沒有更動既有 Tunnel。
- humanApprovalTested、googleTested、chatgptTested 均為 false；程式模擬接受不得視為真人核准。此證據文件在 image 建置後補記；測試的 runtime 程式碼未改變。

### P3 私人合成 Tunnel 外部接線（2026-10-28）

使用者當次明確核准後，Platform 建立另一個私人合成 Tunnel 並關聯同一個人 workspace；UI 表格確認新列存在，既有唯讀連線未修改。v0.0.18 `init` exit 0，專用 profile 使用環境金鑰引用、loopback health 與無網路合成容器。ChatGPT 表單提交實際遇到設定速率限制／確認 client 連線提示，未完成外掛建立；不將這次嘗試記為工具探索或真人核准成功。已要求使用者在另一個本機終端機親自輸入 runtime key，沒有讀取原程序秘密。具體步驟與結果見 [連線紀錄](CHATGPT_CONNECTION.md)。本輪只更新接線文件，未修改產品程式；完整 check 結果另追加。

本輪宿主 `npm run check` exit 0：14 元件同步、6 文件案例、78 產品案例、typecheck 與 build 全通過；宿主非固定基線，此為補充回歸，固定容器證據仍以前節為準。此時 `test -s .data/tunnel/synthetic-health-url` exit 1，尚無新 client health URL，不宣稱已上線。

### P3 ChatGPT 接線與新版協定修復（2026-10-28）

私人「合成 Tasks 核准測試」外掛已建立並連接；真實 ChatGPT 對話成功探索七工具及列出 demo-inbox，complete=true。首次 create_task 回傳 APPROVAL_UNAVAILABLE，沒有表單、沒有寫入；合成容器 discover 回應顯示協定 2026-07-28，SDK 舊 elicitInput 在該 era 不支援。此為實際失敗證據，不算核准成功。

已新增 modern inputRequired／requestState 流程，限合成路徑；服務端隨機 nonce 綁定 TaskService、完整預覽雜湊、60 秒單次使用，拒絕缺漏／偽造／跨帳號／竄改／逾時／重複續接。新 SDK HTTP 案例含 20 並發最多一寫，產品案例增至79。宿主 npm run check exit 0；固定 Node 24.22.1/npm 11.19.1 的 docker build 同樣完整 check 通過（79 產品、6 文件制度案例、typecheck、build），runtime image sha256:b099b6abe844a828ab6f90cb338fd492675590cb2bc338829a63a1803d62ca19。

另外以 .data/modern-stdio-smoke.mjs（由既有 smoke 加入 pinned 2026-07-28 及 input_required 續接的暫存測試程式）執行 node 及 TASKS_DEMO_SMOKE_CONTAINER=1 node，均 exit 0：declineBlocked、createUpdateCompleteRead、replayWithoutReprompt、threePageSearch=true；固定容器無網路、唯讀、無 Google 憑證。這是程式模擬接受，humanApprovalTested/googleTested/chatgptTested=false。

停止舊合成容器以載入新 image 後，既有 Tunnel client 未自動重建 upstream；新的 ChatGPT 重試尚未取得結果。需要使用者在持有 runtime key 的原合成終端機重啟 client，再進行 ChatGPT 表單驗收。未讀取程序秘密；沒有更動既有 Google 唯讀容器。REAL_WRITES_DISABLED 維持，未宣稱新版 ChatGPT 表單或真人核准成功。

### 2026-10-28 使用者回報重啟後的實測

ChatGPT 同一合成驗收對話再次呼叫 list_task_lists，實際回應 NOT_FOUND：Tunnel-client has not been seen for 300 seconds。建立工具未呼叫、表單未觸發、未寫入。Docker ps 僅見原 Google 唯讀及 demo HTTP 容器，未見合成 approval stdio；.data/tunnel/synthetic-health-url 不存在。尚不能判定使用者終端機失敗的具體原因；需以 tasks-synthetic-approval-test.yaml 指定 profile 重啟並確認持續運行，不能將口頭重啟視為接線成功。本輪未讀取金鑰，未改變產品程式或真實 Google 資料。

## 2026-10-29 工程流程試行

本輪依 [工程流程](ENGINEERING_WORKFLOW.md) 補上原先未納 CI 的合成程序整合，並安排未實作變更的獨立代理審查。初審確認缺少 stdio／恢復步驟及 modern stdio 覆蓋，已修補；修補後複審另記實際結果。

- `npm run build && npm run test:synthetic`：宿主通過。legacy 與 2026-07-28 兩次 stdio 均通過拒絕、建立／修改／完成／讀回、重播不再提示及三頁搜尋；SIGKILL／uncertain／快照／跨帳號／金鑰拒絕通過。
- `node scripts/component-context.mjs service`：輸出指定元件目前契約與定位，省略指紋和歷史；不掃描全專案。無效 ID 拒絕路徑及完整 check、固定容器驗證於本輪交付前執行，結果另追加。
- 未存取真實 Google，未操作 ChatGPT、未解除寫入 gate、未部署。工作目錄沒有 Git metadata；GitHub 遠端 CI、branch protection 與 PR 皆未執行。不可將本輪本地結果寫成上線完成。
- 尚無可比較的 token 使用量或缺陷率基線，文件／多代理效益待同類任務樣本量測。

### 本輪交付驗證與審查處置

- 最終宿主環境：Node 26.0.0／npm 11.12.1，屬補充驗證，未改變固定 Node 24.22.1／npm 11.19.1 的支援政策。
- `npm run check` exit 0：14 元件文件檢查、7 項文件／導航制度測試、79 項產品測試、typecheck、build 通過。導航測試含合法輸出、錯誤參數、目錄穿越、絕對路徑、.data、.env-secrets、外部與忽略目錄 symlink 的拒絕。
- `npm run test:synthetic` exit 0：legacy／2026-07-28 stdio 與 SIGKILL 恢復均通過。此項在新增導航安全補丁前執行；補丁只變更導航與測試入口，未變更產品或合成演練。
- `docker --context orbstack build --target build -f containers/Dockerfile -t google-tasks-mcp:engineering-check .` exit 0：固定 Node 24.22.1／npm 11.19.1 執行完整 check（當時為 79 產品＋6 文件案例），image sha256:53e62d07c81643a5dcec249d9d338b27124af195e38aff4c2e8ca3c6cc53969c。此為導航安全補丁前的版本，不宣稱最終版本已在固定容器全驗證。
- 後續無網路容器 `npm run test:synthetic` 未執行成功：OrbStack socket 消失，再次查詢亦失敗。最終導航補丁的固定容器重跑待 OrbStack 恢復；未自行改用不同 Node 支援版本。
- CI YAML 以本機 YAML parser 解析並斷言權限、逾時、checkout 憑證設定及合成 gate 通過；不等同 GitHub Actions 執行。
- 獨立程式審查與測試／文件審查均指出 context 登錄路徑可能越界；已加入讀取前的相對／realpath／忽略目錄驗證與合成拒絕測試。後續審查補出 .env 前綴缺口，也已修補；最終審查回報未發現仍可達的具體缺陷。兩位審查者同意 modern smoke 與文件的模擬／真人界線一致。

## 2026-10-29 公開原始碼交付準備

使用者明確要求公開 GitHub Repo 並提供連結；此授權限原始碼發布，不解除真實 MCP 寫入或部署 gate。公開前已移除本機個人路徑、私人 Tunnel／外掛／對話識別資訊，保留既有驗證結果。Git 提交使用 GitHub noreply 地址。

- 已初始化 main，Git 索引共 70 份來源／規格／設定檔；未納入 .data、node_modules、dist、憑證與資料庫。
- 對 Git 索引執行私鑰、Google／GitHub／OpenAI token、OAuth code 及私人接線資訊模式掃描，無命中；這是有限模式檢查，不代表全面安全稽核。
- 對 .data/credentials.json、.env、.env.local、client_secret_example.json、credentials.json、private.key、.aws/config 執行 git check-ignore 斷言，全部排除。
- 公開前 npm run check 通過 79 產品＋7 文件／導航案例、typecheck 與 build。git diff --cached --check 發現既有一處行尾空白，已清除，不改變領域契約；後續完整 check 於提交前重跑。
- GitHub 目標名稱為 ChuLiYu/google-tasks-mcp，建立／推送／公開可讀性將以實際遠端結果確認。


## 2026-10-29 — SSOT Context Architecture 本地驗證

本輪改文件、metadata、開發檢查與一項合成安全回歸測試，沒有變更產品 TypeScript 或真實資料。稽核、來源歸屬、R07 示範與量測方法見 [CONTEXT_AUDIT](CONTEXT_AUDIT.md)；主要入口見 [INDEX](INDEX.md)。

- 宿主 Node v26.0.0／npm 11.12.1，僅補充驗證，並非專案支援的固定版本。
- `npm run docs:test`：9 項通過；涵蓋文件同步、導航路徑拒絕、重複權威（含 symlink 別名）、無效知識／相依引用、Router 漂移與禁止相依／computed import／runtime module loader。
- `npm run context:check`：10 個權威來源、15 個來源檔、37 個相對 import；不是完整執行期圖或語意正確性證明。
- `npm run typecheck`、`npm test`、`npm run build`：通過；產品測試 6 檔／80 項（初次 79 項，補上 R10 後 80 項通過）。
- `npm run test:synthetic`：legacy／2026-07-28 stdio 與 SIGKILL 恢復均 exit 0；拒絕不寫、合成 CRUD、防重、第三頁搜尋與隔離通過。沒有真人、ChatGPT 或真實 Google 驗收。
- 獨立程式審查提出重複權威實體路徑及 createRequire 繞路兩項問題；已修正並新增拒絕測試，複審未發現仍可重現的缺陷。文件語意獨立審查另指出 R10 缺少惡意備註的直接回歸證據；已補 get／list／search 保留原文且 create／patch／proposal／approveBound／fetch 均零呼叫的合成案例。此結果不證明外部 LLM 的提示注入防禦，不以機械通過宣稱需求全實現。
- 固定 Node 24.22.1／npm 11.19.1 容器本輪未執行：OrbStack socket 不存在，啟動應用程式也回報找不到 OrbStack。未變更固定工具鏈；舊容器或基線 GitHub CI 成功不是本輪證據。
- 本輪尚未推送／執行遠端 CI；Q09 與原有正式放行問題保留。未量測 token 節省。

本輪最終 `npm run check` exit 0：14 元件文件與指紋、10 權威來源／15 來源檔／37 相對 import、9 開發工具案例、6 檔 80 產品案例、typecheck 與 build 全通過。R10 修補後獨立語意複審無新增重要問題，審查者另跑 service 測試 30／30 通過。宿主出現 Node localStorage experimental warning，未造成測試失敗；固定容器與本輪遠端 CI 的限制仍如上。

## P0 runtime candidate — 2026-11-04

- `docker --context orbstack ps --format '{{.Names}} {{.Status}}'`: exit 0, no running containers. This supersedes earlier runtime-readiness observations, not their historical test results.
- `docker --context orbstack build -f containers/Dockerfile -t google-tasks-mcp:p0-readonly-candidate .`: exit 0; image `sha256:fc4281df6e9564e2627d0f05079eb34a340113a2f7aa18ce2007cdd748d42a52`. Build executed full `npm run check`: 89 product tests, 9 tooling tests, typecheck, build, 14 component checks and context checks passed.
- Production-only runtime, `--network none --read-only --cap-drop ALL --security-opt no-new-privileges`, no host mounts: Node v24.22.1, UID 1000, better-sqlite3 13.0.3; in-memory SQLite integrity check returned `ok`.
- Reused `scripts/check-demo-stdio.mjs --modern` assertions with a temporary transport adaptation pointing directly to this candidate image. The server ran without network or credentials, with only a disposable `/data` tmpfs owned by UID 1000. Refusal, synthetic create/update/complete/read, replay without a second approval, and three-page search passed over protocol 2026-07-28. The SDK client ran on host Node 26 (supplemental only); the tested server ran on fixed Node 24. An initial temporary harness import-path error was corrected before this successful run. The inherited harness `container` flag remained false because it identifies the standard wrapper selection; this run used the explicitly adapted Docker transport, not the standard wrapper.
- No source behavior changed, no Google read or OAuth attempt was made, no existing image tag was replaced, and no private Tunnel was started. This is runtime artifact evidence, not human, Google or ChatGPT acceptance. P0-a still needs owner-run reauthorization and actual read-only ChatGPT acceptance.


## Shared local MCP and quick-start verification — 2026-11-04

- Fixed Node 24.22.1/npm 11.19.1 Compose build ran full `npm run check`: 95 product tests, nine tooling tests, typecheck, build, 14 component specifications and context policy passed. Two independent SDK clients exercised read-only HTTP, concurrent reads, disconnect/reconnect and write rejection before service access. Transport refusal covered missing/wrong credentials, forged Host/Origin and oversized bodies.
- macOS `node --test scripts/private-stack.test.mjs scripts/start-private-tunnel.test.mjs`: two suites passed. Disposable fixtures covered failed Tunnel cleanup, SIGTERM during Compose startup, safe profile references, owner-private files/directories, parent symlinks, group-write refusal and successful shared launcher dispatch. Independent review findings were fixed and re-reviewed with no remaining reported defect.
- Actual quick start reached healthy OrbStack HTTP and READY Secure MCP Tunnel using the existing dedicated Google test connection. An initial zsh permission-mask refusal was fixed with explicit base-eight syntax; the failed startup had stopped its service automatically.
- Actual SDK Google acceptance through loopback HTTP: two clients, four tools, mode=google, one complete list, three tasks over two pages, identical task-ID sets versus pageSize=100, successful exact-ID get consistency and search hit. Only aggregate outcomes were printed; no contents/IDs/keys retained in this report. No Google writes occurred.
- `private-stack.py stop` stopped both supervised components; status then reported both not ready. Normal restart then restored both ready states; post-restart list_task_lists, list_tasks and get_task succeeded in mode=google, with one list, three tasks and complete=true. The service and Tunnel were left running for owner use.
- Codex CLI 0.146.0 accepts the configured streamable_http URL, four-tool allowlist and static local header in owner-private global config. A temporary synthetic override showed this version drops http_headers_helper; it is not used for this client. The current conversation cannot claim MCP hot reload or a Codex model-issued tool call. ChatGPT Web actual post-migration call and Calendar account verification remain separate acceptance steps.

## Non-mutating approval diagnostic candidate — 2026-11-04

The dedicated Google HTTP candidate exposes `check_approval_channel` alongside four reads; all real write gates remain closed. Focused fixed-environment MCP tests cover service-bound nonce isolation, single-use concurrent consumption, expiry, forged state, malformed/unchecked/declined responses, legacy form support and zero service/Google/ledger writes. Private HTTP opt-in is tested separately from its unchanged four-tool default. These are synthetic protocol tests, with no credentials or Google data mounted. Actual client form display, trusted human response and conversational Google CRUD are still pending; a server-accepted test response alone cannot close them. Full delivery checks and independent review are recorded after completion.

## Claude and local approval verification — 2026-11-04

Synthetic: `tests/approval-desk.test.ts`, `tests/public-http.test.ts` and `tests/stdio-bridge.test.ts` cover proposal without upstream calls, one write per approval, replay, durable rejection, CSRF/Origin/Host refusal, HTML escaping, stale tasks before and after approval, cross-connection refusal, approval expiry, 20 concurrent retries, unknown outcomes, the OAuth flow and its refusal paths, and bridge errors. These prove neither Google nor Claude behavior.

Calendar, dedicated account, through the Google Calendar connector: a permanent a December date all-day "deadline fixture" was created and read back. A disposable fixture passed create, read, update, read and delete; a list of December 9–16 then returned only the permanent event. This is connector evidence, not evidence about this project's code.

Real-browser defect found during acceptance: the desk sent `Referrer-Policy: no-referrer`, so the browser posted `Origin: null` and the owner's approval was refused with a page titled "已拒絕". Nothing was written. Reproduced and observed on a disposable synthetic desk; fixed with `same-origin`. Scripted tests could not catch this because they set Origin themselves.

D040 synthetic cases: no content in operations, secrets or cursors after success, update, rejection, unknown outcome, mid-write crash and 24-hour expiry; replay shows current Google state and sends no second write; replay of a deleted task reports `NOT_FOUND`; startup scrub keeps replay protection.

Real dedicated-account acceptance through the actual stdio bridge and MCP tools, 2026-11-04 (scripted client, not a Claude conversation):
- `dist/google-conditional-test.js`: create, read, search, update, complete, delete, cleanup passed; a stale `If-Match` update was refused and the task stayed unchanged (Q05 evidence).
- Permanent task "deadline fixture" with date a December date was created and read back through get and search; replay returned `replayed: true`, the same ID and still one match.
- A disposable task passed create, read, search, update, read, complete, read and replay. It was then deleted by a one-off script that checked its marker title first (HTTP 204), since no delete tool exists; a later search found none and the permanent task remained.
- Same key with other content returned `IDEMPOTENCY_CONFLICT`; an impossible date was refused. No delete tool is exposed. The ledger held no titles, notes or dates afterward.
- Found live: a malformed task ID returned Google HTTP 400, previously mapped to retryable-looking `UPSTREAM_UNAVAILABLE`; now `INVALID_REQUEST`. A well-formed unknown ID returns HTTP 404, `NOT_FOUND`.

Not established: Claude Web or Desktop conversations, ChatGPT after this change, multi-account isolation against real accounts.

D041 synthetic cases in `tests/direct-writes.test.ts`: first call writes once, replay and 20 concurrent calls send no second write, stale versions and unknown outcomes are not resent, no content remains locally, disabled without a configured mode, model confirmation fields rejected, and the tool descriptions state the write behavior.

CI coverage added 2026-11-04: `launchers` runs shell syntax checks and launcher tests on macOS, and `container` validates compose, builds the runtime image and starts it with no network and a read-only root. These steps were run locally through OrbStack; the workflow has not run on GitHub for this change. Claude Web acceptance so far: connector connected and OAuth records were created; tool writes read back from Google. Cloudflared logged one remote stream cancellation on `/mcp`, with no service error and no uncertain row. The request it belonged to is unknown because the service keeps no request log.

Claude Web conversation, 2026-11-04: a real claude.ai conversation created, updated and completed a disposable task through the connector. Read-back from Google showed the expected date, notes and completed status. Skill test: `tasks-calendar-planner` uploaded and loaded in a real conversation and stayed read-only as asked, but it read only today's Calendar and then said the fixture had no Calendar event, which was false. Asked to check, it found the event on `a December date`. Fixed by adding the Absence rule; the fixed text was re-run below. The model's behavior is guidance-dependent, and the format test cannot prove it.

Skill v2 re-run, 2026-11-04: in a new real conversation with the same read-only prompt, the model loaded the skill, read Calendar and Tasks, wrote nothing by its own report, and correctly said a same-named all-day Calendar event matches the fixture task date. One conversation does not prove the rule holds every time.

GitHub CI, 2026-11-04: run 41975012542 passed the `check`, `launchers` and `container` jobs at `de1b655`. This supersedes the earlier note that the workflow had not run on GitHub. It says nothing about commits after `de1b655`. Run 41977940973 passed the same three jobs at `32ec740`, which includes the D044 host-only move and the D045 record.

D044 local check, 2026-11-04: the running container's `/data` no longer lists `tools` or `tunnel`, and the real tunnel client ran `--version` from `.host/`. A real Tunnel connection from the new location has not been started.

Fixture state, 2026-11-04: `MCP 驗收 A`, `B` and `C` were completed through the MCP bridge and read back. The active list then held only the two kept tasks. These fixtures and the Web fixture remain in Google as completed tasks, because task deletion is manual. 

Claude Desktop path, 2026-11-04: after the owner restarted the app, `claude_desktop_config.json` kept `google-tasks` and the desktop app's Claude Code tab loaded the tools through `containers/claude-desktop-stdio.sh`. A real model call created, updated and completed `[CRUD 測試，可刪除] Desktop 驗收`; `get_task` read back `2026-12-03`, `desktop updated` and `completed`. Not established: the same prompts in the app's Chat tab.

Real install, 2026-11-05: the owner ran `./setup.sh` in Terminal from a clean clone of the public tree, using a dedicated account and an existing Desktop client. Docker build, client file, write choice, Google consent and service start finished, and a real Claude conversation then listed the real task list (`mode: google`) from the service running out of the clean clone. In that first run the config afterwards still pointed to the earlier repository, for a reason not determined. The owner then re-ran setup from the clean clone: the config pointed to the clean clone, kept its existing `preferences`, left a `.bak` copy, and Claude reopened with the tools loaded. Not established: creating a brand-new Google client from scratch, because an existing client was reused; Docker Desktop and Linux. During the run the author's own checks briefly started and stopped the service, which the author then restored. It was not a setup fault. The run led to two setup changes: Enter now looks for a client file downloaded while the prompt waits, and the prompt warns that the secret may not be downloadable later.
