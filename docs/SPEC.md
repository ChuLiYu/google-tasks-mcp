# 設計與驗收文件（docs）

上層：[project 規格](../SPEC.md)。

## 職責與邊界

集中跨元件的產品需求、架構、外部 API 限制、全域決策、Roadmap 與人工測試手冊；元件細節留在各自 SPEC。

## 契約與不變條件

Approval-channel diagnostic guidance distinguishes owner-authorized conversational write scope from actual write release. It describes client refresh/allowlist requirements and requires human form visibility evidence; synthetic accepted responses and the diagnostic itself never count as Google CRUD or permission for another operation.

D038 adds the owner-approved shared HTTP transport and one-command service/Tunnel launcher. CHATGPT_CONNECTION is the operating guide; TEST_PLAN separates synthetic, local Google, Tunnel-ready and actual ChatGPT evidence.

Product priority authority is [PRD](PRD.md#approved-delivery-priorities--2026-11-04): P0 local OrbStack personal use, then P1 open-source local self-hosting for each user. Historical release P0–P8 execution labels must not override these priorities; D036 records the owner decision.

D037 permits verified read-only personal use before full P0 completion; release slices and per-capability exit evidence live in RELEASE_PLAN. Unrelated write/prototype milestones must not block the first usable read-only release, while each capability retains its applicable safety and authorization gates.

Local Google reads, owner-reported ChatGPT E2E acceptance, and current-account Calendar/Tasks combined acceptance must be recorded separately. The dedicated-account read-only report closes only that tested slice; it does not release write slices or establish another account connection. Optional owner-approved plaintext .env storage is described in CHATGPT_CONNECTION; no secret is stored in documentation.

USER_TESTING contains the same-account combined read-only runbook: confirmed dedicated connections, exact selected resources/window, source completeness, date semantics, proposal-only planning and a refusal to execute the write request. Missing event/task data is reported as uncovered, never filled by unauthorized fixture writes or a broader account scope.

Runtime readiness in RELEASE_PLAN must follow current observations; a separately validated candidate image does not establish that the existing private connection is running or accepted. Artifact-level evidence remains in TEST_PLAN.

Owner-run reconnection instructions in USER_TESTING distinguish protocol discovery from an actual Google read, Google authorization from Tunnel credentials, and account-selection authorization from permission to automate the owner's browser. The OrbStack connection wrapper reuses the existing default read-only OAuth flow; it does not authorize or perform Computer Use.

全域新決策須記日期、原因、取捨與狀態；建議不可改寫成已核准。外部假設保留官方來源及核對日期。驗證證據不得將 mock 或 Inspector 等同真實 E2E。

放行規劃以自然語言安全任務管理為終點，維護 P0–P8 執行順序與 C01–C20 個別預期；一般與安全案例分開計算，未測不得計通過。恢復演練與私人唯讀證據各自保留適用範圍。

P3 進度須區分已通過的合成條件更新／stdio 核准原型，以及未完成的 ChatGPT 可信人類通道／遠端身分／真實端點並發驗證。保持真實 MCP 寫入關閉，記錄 SDK 協定與 HTTP 能力限制。

工程流程集中於 [ENGINEERING_WORKFLOW](ENGINEERING_WORKFLOW.md)，以 [INDEX](INDEX.md) 導覽；明確區分本地檢查、獨立審查、GitHub 遠端設定與正式放行證據，不宣稱已量測 token 節省。

公開版本保留去識別化驗證結果，移除私人 Tunnel／外掛／對話網址及個人本機路徑；操作範例使用明確佔位路徑。

知識歸屬在 components.json，INDEX 只產生其導航；PRD 保留已確認意圖與驗收，程式與測試只證明現況。架構文件連結既有 schema／DDL，不能另手寫競爭契約。新歧義保留於 DECISIONS Open Questions，理由與替代方案沿用追加式 ADR；本輪稽核、示範與量測方法在 CONTEXT_AUDIT。

## 檔案與定位

- [docs/CONTEXT_AUDIT.md](CONTEXT_AUDIT.md)

- [docs/INDEX.md](INDEX.md)
- [docs/ENGINEERING_WORKFLOW.md](ENGINEERING_WORKFLOW.md)

- [docs/CLAUDE_CONNECTION.md](CLAUDE_CONNECTION.md)：Claude Web／Desktop 連線與本機核准操作。
- [PLANNING.md](PLANNING.md)：Calendar and Tasks strategy; zh-TW reading version [PLANNING.zh-TW.md](PLANNING.zh-TW.md).
- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)：owner-run steps for going public.
- [docs/CHATGPT_CONNECTION.md](CHATGPT_CONNECTION.md)
- [docs/API_CONSTRAINTS.md](API_CONSTRAINTS.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/DECISIONS.md](DECISIONS.md)
- [docs/PRD.md](PRD.md)
- [docs/ROADMAP.md](ROADMAP.md)
- [docs/RELEASE_PLAN.md](RELEASE_PLAN.md)
- [docs/TEST_PLAN.md](TEST_PLAN.md)
- [docs/USER_TESTING.md](USER_TESTING.md)

容器接線與放行門檻：[containers 元件](../containers/SPEC.md)、[RELEASE_PLAN](RELEASE_PLAN.md)。

## 驗證

`npm run docs:check；產品驗證依 TEST_PLAN.md`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：更新架構與 D019 至 D021 決策，新增元件索引並記錄實際測試證據及語意審查限制。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：加入 OrbStack 合成資料容器打包與 G0–G6 放行規劃，保留 loopback、獨立資料與真實寫入拒絕；補齊依賴、雙向索引、驗收與回復操作。
- 驗證：Docker 29.8.2 與 Compose config exit 0；容器 build／runtime 尚待實測，真實帳號與部署未執行。

### 2026-10-27

- 決策／原因／取捨：補齊七階段放行責任、缺陷停寫處理及實測證據；依實際一般案例數計算成功率，保留所有未測阻擋。
- 驗證：宿主與容器完整 check 均通過；正常重啟後待核准提案識別碼一致；真實帳號及人工驗收尚未執行。

### 2026-10-27

- 決策／原因／取捨：記錄固定版本與型別契約取捨，追加官方來源及 SQLite 正式上線阻擋
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-27

- 決策／原因／取捨：追加固定 LTS 環境實際完整檢查、啟動與探測修正證據，維持未測 gate
- 驗證：宿主與容器 check 全通過；七工具列舉、三頁搜尋、Host/Origin 403、既有待核准提案保存均通過

### 2026-10-27

- 決策／原因／取捨：依使用者要求由代理自動執行指定容器 CLI，記錄機器斷言與 OAuth 設定阻擋
- 驗證：指定 CLI exit 0，四項 JSON 自動斷言通過；OAuth client 檔案未設定且未存取 Google

### 2026-10-27

- 決策／原因／取捨：記錄使用者授權後真實唯讀連線證據，區分專用清單缺漏與尚未完成的完整端到端驗收
- 驗證：Google list_task_lists exit 0、完整一頁、未找到專用測試清單；未讀任務或寫入

### 2026-10-27

- 決策／原因／取捨：明確區分唯讀與已授權測試讀寫的 OAuth scope，保留 MCP 寫入保護並處理 refresh 權限包含關係
- 驗證：typecheck 通過，56 個合成測試通過；Google tokeninfo 僅確認既有 token 為唯讀；真實 CRUD 待重新授權

### 2026-10-27

- 決策／原因／取捨：記錄讀寫重新授權入口的宿主與固定 Node 容器完整驗證證據，保留真實 CRUD 待測狀態
- 驗證：宿主 check 與 OrbStack build exit 0；各含 56 合成案例與 6 文件案例；尚待使用者重新同意

### 2026-10-27

- 決策／原因／取捨：新增已獲明確人類授權的固定 CRUD 維護測試，保留 MCP 寫入 gate，加入原子紀錄與清理拒絕條件
- 驗證：typecheck 與 62 合成案例通過；真實 token 讀寫 scope 已確認，容器與 CRUD 待執行

### 2026-10-27

- 決策／原因／取捨：追加真實 Google CRUD 與清理成功證據，區分 REST 驗證及尚未開放的正式 MCP／ChatGPT 流程
- 驗證：宿主與固定 Node 24 容器 check 全通過；真實固定批次 exit 0，七項斷言皆 true

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-27

- 決策／原因／取捨：記錄 D028 私人唯讀接線的實測結果與 Platform 登入邊界
- 驗證：宿主及 Node 24.22.1 容器完整 check 通過：63 產品／6 文件案例；stdio 四唯讀工具協定 smoke 成功、容器清理確認；ChatGPT E2E 待登入

### 2026-10-28

- 決策／原因／取捨：記錄官方 Tunnel v0.0.18 安裝、環境引用 profile 與尚未放行的外部連線
- 驗證：ZIP SHA256 相符、version／quickstart／init 成功；doctor 因無 runtime key exit 2；ChatGPT 外掛人機驗證及 workspace 關聯待完成

### 2026-10-28

- 決策／原因／取捨：記錄 ChatGPT 人機驗證後的首次使用條款交接
- 驗證：UI 已顯示一切就緒；尚未接受條款，workspace 與 E2E 仍待完成

### 2026-10-28

- 決策／原因／取捨：記錄 ChatGPT 自訂 MCP 表單與安全的 runtime key 本機輸入步驟
- 驗證：已觀察登入、Tunnel 表單及 Read／Use 七天金鑰設定；空間搜尋無結果，尚未建立或啟動

### 2026-10-28

- 決策／原因／取捨：記錄回報啟動後尚無 runtime 程序的檢查證據
- 驗證：health-url 不存在，程序名稱未找到 tunnel-client／cloudflared；未存取金鑰，E2E 仍待啟動

### 2026-10-28

- 決策／原因／取捨：記錄本機 Tunnel live／ready 與私人外掛建立前的存取確認
- 驗證：healthz、readyz 均 HTTP 200；尚未送出 ChatGPT 外掛或進行工具呼叫

### 2026-10-28

- 決策／原因／取捨：記錄本人核准的私人唯讀外掛、Tunnel 工作區關聯修復及一次真實 ChatGPT 清單呼叫；保留任務案例與寫入未驗收範圍
- 驗證：ChatGPT 四工具探索及 list_task_lists(pageSize=1) 成功，本頁 1、complete=true、無 nextCursor；產品未修改，待 docs:check

### 2026-10-28

- 決策／原因／取捨：完成私人唯讀 ChatGPT 接線證據與本人試用指引同步；保留完整上線 gate
- 驗證：docs:check exit 0：14 元件指紋與上下層連結一致；本輪無產品程式變更，未重跑既有產品測試

### 2026-10-28

- 決策／原因／取捨：依自然語言安全管理目標記錄 P0至P8 放行順序及20案，區分私人唯讀、正式寫入與部署權限
- 驗證：執行前計畫已記錄；待完整回歸與隔離恢復演練

### 2026-10-28

- 決策／原因／取捨：追加本輪完整回歸與恢復實證及 P3 官方研究，標明核准和條件更新仍未驗證，不將唯讀當目標完成
- 驗證：固定容器 build/check exit 0，63產品與6文件；SIGKILL與快照還原全通過；audit當次0漏洞；最終check待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-28

- 決策／原因／取捨：準備無網路與獨立持久volume的合成核准容器入口，保留既有唯讀Tunnel並以隨機操作鍵支援重複演練
- 驗證：宿主78產品及6文件check通過，固定容器78產品通過；新wrapper待完整容器smoke

### 2026-10-28

- 決策／原因／取捨：補記固定版本容器與持久合成資料重跑證據，保留外部核准及真實寫入界線
- 驗證：Node24.22.1及npm11.19.1容器完整check通過78產品與6文件；stdio與恢復演練通過；實際runtime wrapper連續兩次smoke exit0，未測真人ChatGPT核准

### 2026-10-28

- 決策／原因／取捨：依當次授權建立獨立私人合成Tunnel，記錄專用profile、秘密輸入交接及ChatGPT設定失敗；維持唯讀連線與真實寫入界線
- 驗證：Platform新列與workspace已核對，init exit0；ChatGPT回報速率限制及client連線提示，外掛與真人核准未成功；完整check待執行

### 2026-10-28

- 決策／原因／取捨：補記私人合成接線後的完整回歸與未啟動狀態，避免將已建立Tunnel當成外掛可用
- 驗證：npm run check exit0，14元件、6文件與78產品案例及typecheck/build通過；synthetic-health-url尚不存在，ChatGPT E2E未通過

### 2026-10-28

- 決策／原因／取捨：補記使用者回報啟動後的實際程序與容器狀態；缺乏合成上游證據時不重送ChatGPT設定，保留既有連線並交接正確profile
- 驗證：synthetic-health-url不存在；程序名稱僅一個tunnel-client，Docker僅唯讀stdio與既有demo，未讀秘密；完整check待執行

### 2026-10-28

- 決策／原因／取捨：記錄私人合成外掛實際連線與新版確認失敗證據及D031修復決策
- 驗證：health及ready均200、七工具與清單讀取成功；建立APPROVAL_UNAVAILABLE，修復後E2E待測

### 2026-10-28

- 決策／原因／取捨：記錄私人合成外掛讀取成功、新版 MCP 修復及固定容器證據；重啟後 ChatGPT 表單尚待驗收，保留真實寫入阻擋
- 驗證：固定容器完整 check 79產品與6文件案例通過；新版stdio宿主及隔離容器smoke通過；ChatGPT表單未驗收

### 2026-10-28

- 決策／原因／取捨：記錄重啟後真實 ChatGPT 清單呼叫仍為 Tunnel NOT_FOUND，避免將使用者回報當成成功驗收
- 驗證：ChatGPT工具回應及docker ps已核對；合成健康檔不存在；表單及寫入未執行

### 2026-10-30

- 決策／原因／取捨：新增工程流程與輕量導航及合成核准圖，區分本地證據和遠端放行限制
- 驗證：已完成獨立初審與合成程序驗證，完整檢查及複審中

### 2026-10-30

- 決策／原因／取捨：記錄獨立審查的路徑缺陷及修補驗證，區分最終宿主與較早固定容器的證據
- 驗證：最終宿主check通過79產品加7文件；合成演練通過；最終容器因OrbStack停止待補

### 2026-10-30

- 決策／原因／取捨：公開前去識別化私人接線網址與本機路徑，保留原有驗證結果及未放行界線
- 驗證：三份操作與測試文件已清理，完整檢查待執行

### 2026-10-30

- 決策／原因／取捨：補記使用者公開Repo授權及去識別化與索引安全檢查，更新Git初始化狀態
- 驗證：70份索引有限秘密模式掃描無命中，七類秘密路徑排除斷言通過，先前79加7通過

### 2026-10-30

- 決策／原因／取捨：將INDEX改為生成導航，保存PRD意圖與ADR理由，移除競爭API草案並記錄Q09、稽核示範及驗證限制
- 驗證：context生成及9開發、79產品、typecheck、build與合成演練通過；最終連結同步及獨立語意審查待完成

### 2026-10-30

- 決策／原因／取捨：保留原草案非語意搜尋與非snapshot限制並明示建議狀態，區分reserved設計概念與pending實作，補齊實際檔案清單
- 驗證：完整check已通過14元件、9開發及79產品與型別build；合成演練通過；新文字待最終連結檢查及語意複審

### 2026-10-30

- 決策／原因／取捨：完成 SSOT 稽核、權威路由、需求證據與歧義紀錄，補上 R10 回歸及驗證限制
- 驗證：9 開發檢查案例、80 產品案例與合成 stdio／恢復通過；完整 check 最後重跑，固定容器及遠端 CI 未執行

### 2026-10-30

- 決策／原因／取捨：追加最終完整檢查與 R10 獨立複審證據，保留固定容器及遠端驗證限制
- 驗證：npm run check exit 0：14 元件、9 開發案例、80 產品案例、typecheck、build；R10 獨立複審通過

### 2026-10-30

- 決策／原因／取捨：Prioritize personal delivery using current reproducible container evidence and explicit ChatGPT approval blockers; document secure restart without weakening existing write gates
- 驗證：Fixed Node24.22.1/npm11.19.1 full check and isolated synthetic suites pass; actual ChatGPT human approval remains pending

### 2026-10-30

- 決策／原因／取捨：Record final fixed-version build and actual Google readonly protocol verification; preserve the distinction from live human acceptance.
- 驗證：Fixed container build exited 0 with 80 product and 9 developer cases; Google stdio protocol check exited 0 without task requests or token refresh; documentation validators run after this evidence update.

### 2026-11-04

- 決策／原因／取捨：Record current checkout revalidation separately from historical fixed-container and human acceptance evidence; preserve existing work and release gates.
- 驗證：Host check: 80 product and 9 developer-tool cases pass; synthetic legacy/modern and recovery pass; diff and zsh syntax pass; OrbStack socket absent, fixed environment and human acceptance unverified.

### 2026-11-04

- 決策／原因／取捨：Append restored fixed-environment and actual synthetic wrapper evidence; retain earlier host-only limitations as historical observations and keep human approval gates.
- 驗證：Pinned container full check passed: 80 product and 9 tool tests; isolated legacy/modern/recovery and runtime wrapper passed; no real Google, human approval or tunnel restart.

### 2026-11-04

- 決策／原因／取捨：Record isolated stable SQLite candidate evidence and current synthetic tunnel readiness; retain D025 and human acceptance gates without changing runtime dependencies
- 驗證：Candidate Linux arm64 Node 24.22.1 runtime: 80 product tests, legacy/modern stdio, SIGKILL recovery, format round trip and 20 independent claims passed; npm candidate audit reported zero; project full check pending

### 2026-11-04

- 決策／原因／取捨：Complete validation record for the storage candidate evidence update; no dependency or runtime adoption
- 驗證：Host npm run check exit 0: 14 components, context, 9 developer cases, typecheck, 80 product cases and build; git diff --check exit 0; fixed candidate runtime results recorded separately

### 2026-11-04

- 決策／原因／取捨：Record bounded stable driver integration without closing release gates prematurely
- 驗證：Candidate evidence retained; full integration checks and independent review pending

### 2026-11-04

- 決策／原因／取捨：Record clean stable-driver build, runtime and synthetic timeout evidence with pending review and platform limits
- 驗證：Fixed arm64 full check, production-only claim/vault and complete isolated synthetic gate exited 0; bounded-wait revision and x64 run pending

### 2026-11-04

- 決策／原因／取捨：Adopt D035 for validated Linux targets and record independent review disposition while retaining all other release gates
- 驗證：Clean builds/full checks, production-only runtime and isolated synthetic upgrade/timeout/recovery passed; reviewer P1 fixed and targeted runs exited 0

### 2026-11-04

- 決策／原因／取捨：Record the reviewed final integrated storage artifact and complete synthetic gate; remove the resolved RC-driver item from the outstanding personal-use list while retaining remaining recovery and real-write gates.
- 驗證：Fixed Node 24 full check/build passed in final-check image; all four synthetic rehearsals exited 0 together in that exact isolated image; human ChatGPT and real Google write acceptance remain unverified.

### 2026-11-04

- 決策／原因／取捨：Describe the concrete Q05 conditional-update batch, new authorization scope, fixed invocation and stop/cleanup limitations without treating synthetic contracts as real endpoint evidence.
- 驗證：Initial fixed-environment typecheck and 13 harness cases passed; full check, added rejection cases and independent review pending. Real batch not executed or authorized.

### 2026-11-04

- 決策／原因／取捨：Record completed fixed-environment validation and independent read-only review of the separately authorized conditional-update harness; preserve synthetic-only and real-execution authorization limits.
- 驗證：Fixed container full check passed: 89 product cases including 15 harness cases, 9 developer-tool cases, 14 component checks, typecheck and build. All four synthetic rehearsals passed; invalid CLI arguments refused before credential access. Independent review found no concrete defect; its host test could not load the local dependency. Real Google and human acceptance not run.

### 2026-11-04

- 決策／原因／取捨：Record production-only conditional-test artifact and smoke evidence; clarify cached harness reports skip token acquisition, while the CLI still reads local configuration and account connection.
- 驗證：Production runtime build and non-root network-disabled in-memory integrity/module smoke exited 0; unexpected CLI argument safely refused with VALIDATION_ERROR. Prior fixed full check passed 89 product and 9 developer-tool cases. No real Google call or credential mount; explicit execution authorization pending.

### 2026-11-04

- 決策／原因／取捨：Prepare an explicitly unapproved single-owner Q04/Q09 policy with retention/privacy tradeoffs, missing disconnect behavior and separate issuance-based confirmation/internal deadlines; link release gate to its authority without changing runtime behavior.
- 驗證：Source inspection of Store, service and MCP completed; independent semantic review and pinned full check pending. No credentials, Google calls or human acceptance used.

### 2026-11-04

- 決策／原因／取捨：Clarify reviewed policy limits: local connection is not verified Google identity; latest-ledger recovery has no implemented freshness enforcement and requires a reviewed control/procedure before real-write release. Keep Q04/Q09 unapproved.
- 驗證：Pinned Node 24 full check passed 89 product and 9 developer cases plus 14 component checks, typecheck and build; all four isolated synthetic suites passed. Two independent review findings corrected; focused rereview pending. No real Google or human acceptance.

### 2026-11-04

- 決策／原因／取捨：Record independent focused rereview of the unapproved Q04/Q09 proposal; original identity and recovery overclaims resolved with no new concrete finding.
- 驗證：Independent source/document rereview completed; fixed Node 24 full check passed 89 product cases, 9 developer cases, 14 components, typecheck and build. Four isolated synthetic suites passed before final wording-only corrections; no runtime change, real Google or human acceptance.

### 2026-11-04

- 決策／原因／取捨：Record the observed live synthetic artifact separately from the newer stable-storage candidate; scope human acceptance to its actual image and refresh superseded current-check count without changing release gates or running connections.
- 驗證：Read-only image/container inspection confirmed the existing synthetic container; disposable no-network/no-mount image probe confirmed Node24 and absence of stable driver. No task data, credentials or service mutation; final full check pending.

### 2026-11-05

- 決策／原因／取捨：Record owner-approved P0 OrbStack personal use and P1 open-source local self-hosting; remove Oracle from current sequence and preserve pending safety/privacy decisions.
- 驗證：Documentation-only change; pinned full check pending. No credentials, Google operations or running-service changes.

### 2026-11-05

- 決策／原因／取捨：Record validation of the revised two-priority local self-hosting plan; runtime and running connections unchanged.
- 驗證：Pinned Node 24.22.1/npm 11.19.1 container npm run check passed: 14 components, 9 developer cases, 89 product cases, typecheck and build. No real Google or human ChatGPT acceptance performed.

### 2026-11-05

- 決策／原因／取捨：Adopt owner-requested incremental usable releases: read-only first, then create/update/complete and reproducible open source; scope gates to affected capabilities.
- 驗證：Documentation-only contract clarification; full pinned check pending. No real-account access or running service modified.

### 2026-11-05

- 決策／原因／取捨：Record completed validation of incremental delivery criteria; current local readiness is separate from historical acceptance.
- 驗證：Pinned container npm run check exit 0: 14 components, 9 developer cases, 89 product cases, typecheck/build. Read-only docker ps showed no running containers at observation time; no ChatGPT/Google acceptance or service start performed.

### 2026-11-05

- 決策／原因／取捨：Record the failed authorized Google read and document owner-operated OrbStack reconnection, separate Tunnel credentials and explicit Computer Use consent.
- 驗證：Observed GOOGLE_REAUTH_REQUIRED from actual dedicated-account list request; no task contents or credentials printed. Full check pending.

### 2026-11-05

- 決策／原因／取捨：Record tested reconnection preparation while preserving failed Google-read and pending owner-login/ChatGPT acceptance status.
- 驗證：Fixed Node 24.22.1 Docker build readonly-reconnect-check completed npm run check: 89 product and 9 tooling tests, typecheck, build and documentation checks passed. Actual Google reauthorization and ChatGPT read/search/get remain pending; no Computer Use performed this turn.

### 2026-11-05

- 決策／原因／取捨：Record production runtime candidate evidence and replace stale client-readiness claims with the observed stopped state; prioritize owner reconnection for P0-a.
- 驗證：Candidate full check passed: 89 product and 9 tooling tests; production UID1000/stable SQLite integrity and isolated modern MCP smoke passed. Post-documentation full check pending.

### 2026-11-05

- 決策／原因／取捨：Record successful owner-run Google reconnection and local read-only MCP access; retain Tunnel and ChatGPT task acceptance as pending.
- 驗證：Protocol discovery returned exactly four read-only tools; actual dedicated-account list_task_lists succeeded with complete=true and no content printed. Full documentation delivery check pending.

### 2026-11-05

- 決策／原因／取捨：Attribute restored local Google access to its actual unchanged private runtime image, separate from the candidate image.
- 驗證：Image inspect returned sha256:3ec606de1a9d594fd6f5301c98aa3125c42e24a90a959f924696d0f529765418; four-tool discovery and actual Google list read passed.

### 2026-11-05

- 決策／原因／取捨：Record owner-reported readonly E2E including restart and pending current-account Calendar/Tasks acceptance; document optional local key file
- 驗證：Evidence is owner-reported, not independently rerun; complete check pending

### 2026-11-05

- 決策／原因／取捨：Record actual environment-file validation separately from pending real-key startup and current-account E2E
- 驗證：Fixed Node full check and offline synthetic suites passed; evidence-only documentation synchronization pending final check

### 2026-11-05

- 決策／原因／取捨：Provide the owner-requested same-account Calendar and Tasks readonly runbook with explicit account, scope, completeness and planning boundaries; distinguish source metadata fix from live runtime
- 驗證：Runbook reviewed against PRD and release slices; real integration awaits confirmed Calendar test account and target-account Tasks connection; full check pending

### 2026-11-05

- 決策／原因／取捨：Record approved shared runtime and quick-start operation contract
- 驗證：Runtime verification pending

### 2026-11-05

- 決策／原因／取捨：Match official Codex http_headers_helper command-string schema
- 驗證：Official configuration reference checked 2026-11-04

### 2026-11-05

- 決策／原因／取捨：Record observed CLI 0.146 compatibility: unsupported header helper requires private static local header configuration
- 驗證：Temporary CLI override parsed successfully but omitted http_headers_helper on serialization; no secret used

### 2026-11-05

- 決策／原因／取捨：Record actual quick-start, private Codex configuration, Google read and clean stop evidence without claiming model or Calendar E2E
- 驗證：95 product and9 tooling checks passed;2macOS launcher fixtures passed; normal restart pending

### 2026-11-05

- 決策／原因／取捨：Record actual successful stop/restart and Google reads; distinguish readiness from pending current-account conversational tool calls
- 驗證：Normal restart restored both ready checks; Google list, tasks and get succeeded with one list and3tasks; service left running

### 2026-11-05

- 決策／原因／取捨：Record authorized conversational create update complete scope and diagnostic-only limitations without releasing real writes
- 驗證：Synthetic focused protocol evidence only; actual form visibility and trusted approval remain pending

### 2026-11-05

- 決策／原因／取捨：Add Claude connection guide, D039, PRD scope note and evidence section; ChatGPT path not re-accepted after this change
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Correct wording of the PRD scope note for the approval page exception (D039)
- 驗證：documentation wording only; full check runs in the pinned image build

### 2026-11-05

- 決策／原因／取捨：Record D040 owner decision that Google Tasks is the only store of task content; proposal for indefinite content retention not adopted
- 驗證：pinned-image vitest: 146 tests in 10 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Record the real-browser approval defect in TEST_PLAN
- 驗證：documentation only

### 2026-11-05

- 決策／原因／取捨：Record D041 owner decision, update Claude guide and release note; earlier approval text kept as history
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Record real-account acceptance evidence and its limits
- 驗證：pinned-image full check during rebuild; live statuses observed on the dedicated account

### 2026-11-05

- 決策／原因／取捨：Record CI coverage and Claude Web observations; note the workflow has not run remotely
- 驗證：locally: shell syntax, 2 launcher tests, compose config, image build with full check, hardened synthetic start; not yet run on GitHub

### 2026-11-05

- 決策／原因／取捨：Record D042 strategy, tool choice and limits; routing table regenerated for the skills component
- 驗證：Pinned image check; skill format test only, not yet run in a real Claude conversation

### 2026-11-05

- 決策／原因／取捨：Record D043: repository private until an owner security review; a new history cannot retract disclosed copies
- 驗證：gh reports private; anonymous web, API and raw requests return 404; git and API access for the owner work; gitleaks 8.30.1 run over all refs

### 2026-11-05

- 決策／原因／取捨：Record Claude Web conversation, skill test and GitHub CI evidence in TEST_PLAN, with what each does not establish.
- 驗證：Evidence copied from observed runs; no new test for this text.

### 2026-11-05

- 決策／原因／取捨：Record the Skill v2 re-run result in TEST_PLAN, limited to one conversation.
- 驗證：Result read from the real conversation page.

### 2026-11-05

- 決策／原因／取捨：Move host-run and host-trusted files out of the writable container mount (D044), because review F1 showed a compromised container could replace the tunnel client that macOS runs with the Tunnel key.
- 驗證：Launcher tests 3/3 with new refusal and mount cases on host; real container listed /data without tools or tunnel; real client --version ran from .host; real tunnel not started.

### 2026-11-05

- 決策／原因／取捨：Record the owner-approved D045 exception in DECISIONS and RELEASE_PLAN, resolving the conflict between compose and the release plan for the dedicated account only. Q04 and Q09 stay open.
- 驗證：Docs and full image check run; no behavior change.

### 2026-11-05

- 決策／原因／取捨：Record CI, D044 local check and fixture state evidence in TEST_PLAN.
- 驗證：Copied from observed runs; Desktop still untested.

### 2026-11-05

- 決策／原因／取捨：Warn that a running Claude Desktop removes edits to its config, observed while preparing Desktop acceptance.
- 驗證：Observed: entry gone within 20 seconds with the app running. Edit while quit not yet verified.

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Record reviewed source commit in the zh-TW planning guide.
- 驗證：Docs check.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Update reviewed source commit in the zh-TW planning guide.
- 驗證：Docs check.

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Record the first real install run and what it does not establish.
- 驗證：Owner-run install; Claude listed the real task list.

### 2026-11-05

- 決策／原因／取捨：Correct the install record: the Claude Desktop step did not change the config in that run.
- 驗證：Read the config after the run.

### 2026-11-05

- 決策／原因／取捨：Record the verified Claude Desktop step of the real install.
- 驗證：Read the config after the owner's re-run; tools loaded after reopening.

<!-- component-snapshot
{
  "docs/API_CONSTRAINTS.md": "7fc66675ca41b924c7cc8a8a807ed6d0df2860827cbbf9285015ed852091783f",
  "docs/ARCHITECTURE.md": "0697b5430115eaea106adec6a585910aee34116fa03e78ea1bc2a40acd4f3da3",
  "docs/CHATGPT_CONNECTION.md": "2c3f50a3ed1c81d780426d4fcd2524bee60fe101a9b2985b5f79add1a17fc137",
  "docs/CLAUDE_CONNECTION.md": "da899d618cccab1bff9994b987bcc25267c5add3ec7ac4f10a98a38157d2963d",
  "docs/CONTEXT_AUDIT.md": "d05045da00607c3a815da24bf8edab17a8b1447f1c7e28c2d6c02ec180c33389",
  "docs/DECISIONS.md": "c23b19303d6b96b6672fe18dab58a95fadb0c14c46f23bb0fbada10c7eefc069",
  "docs/ENGINEERING_WORKFLOW.md": "b60f65ff454d3d81e6a9c6324594e5bdd724b8f5ef03cc78f12fc155c0d73f97",
  "docs/INDEX.md": "f07aec2c79528e56793ab55900926100197ab418ea1d5729ef9b72773aeb1b83",
  "docs/LAUNCH_CHECKLIST.md": "9437c3a086385c16b73cac8505e2bfaba4ad0038cc6ce542ad38f1474ac12eb1",
  "docs/PLANNING.md": "c082ee1c2a4fc7f9d2f36924f7175aff70122ebecaa9aff1a98c26e6e9947dc4",
  "docs/PLANNING.zh-TW.md": "0a82db5a5bb6477d98e642661ccef655af0e8c3ba4d93144682b3403c87d457a",
  "docs/PRD.md": "7d089aa7120bda6f2ad038f2cefc72e1ed53499f51d7be206224d81113f7b7c8",
  "docs/RELEASE_PLAN.md": "7b7c5b3c0aabe0be3847d7a7982175de3c4931aaeb87d4fa40ce72e579519475",
  "docs/ROADMAP.md": "e6f20116c0062c36ceb80056a28858e6a1dc09672993b5178af9042dd827787f",
  "docs/TEST_PLAN.md": "280b02ed374fb4ad4961aa9e03050652ab3ae9b62f70c76907bf5850f8639aee",
  "docs/USER_TESTING.md": "e8c363c18565ab811ac4e61cb77d4efa3994677f332f06cd62df34e78fef5005",
  "docs/SPEC.md": "fc20d541e6404e52320a2d78649026f3372e9ce033bc6674416537e9a84d82d9"
}
-->
