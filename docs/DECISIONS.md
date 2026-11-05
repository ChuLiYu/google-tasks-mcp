# 決策紀錄

日期：2026-10-27。狀態「已確認」指交接需求／本階段範圍；「建議」尚待技術計畫核准。後續新增紀錄，不抹去決策歷史。

| ID | 狀態 | 決策／理由 |
|---|---|---|
| D001 | 已確認 | 先做第 0 階段文件；計畫核准後逐階段實作，遵循交接 immediate instructions |
| D002 | 已確認 | v0.1 僅 Google Tasks，不新增 Calendar 寫入、獨立 UI、LLM 或自動化 |
| D003 | 建議 | 公開日期欄位為 taskDate，禁止 scheduled time／deadline 承諾；反映 Google due 真正語意 |
| D004 | 建議 | Node 24 LTS + TypeScript；官方 SDK v2 穩定線 + Zod，實作時核實 patch／相容版本並鎖檔 |
| D005 | 建議 | Streamable HTTP /mcp；不用僅適用本機 stdio 的設計冒充 ChatGPT 遠端整合 |
| D006 | 建議 | 既有 OAuth provider 驗證 MCP 身分；Google OAuth 為獨立 connection，禁止 token passthrough |
| D007 | 建議 | 單一 instance + SQLite 持久化冪等／核准狀態；有意識限制部署拓樸，避免過度架構 |
| D008 | 建議 | uncertain 建立不自動重送；對無原生冪等 API，優先避免重複而犧牲自動恢復 |
| D009 | 建議 | 搜尋為單清單、分頁、有限預算字串比對；未完成必須帶 cursor 與 complete=false |
| D010 | 建議 | 核准必須有可信通道並綁定 payload；未解決則真實寫入關閉，不接受模型 confirmed 值 |
| D011 | 建議 | 一 principal 對一啟用 Google connection；連結更換使舊 cursor／approval 隔離失效 |
| D012 | 已確認 | 不將「2026 起 UTC−7」套用全年或歷史；依 Vancouver 切換日期測行為，防止舊 tzdb |

## 待決事項

| ID | 待決問題與建議 | 最晚決定時點 | 不決定的影響 |
|---|---|---|---|
| Q01 | OAuth provider：選擇支援 MCP discovery、PKCE、audience 與所選 CIMD／DCR 的既有服務；比較成本、資料所在地、vault、撤銷能力 | 第 1 階段可先做 interfaces／mock；正式 OAuth 接線前 | 不能聲稱正式 ChatGPT 登入完成 |
| Q02 | 人類逐筆核准：先驗證 client elicitation 能力；不可靠時評估最小核准頁及範圍調整 | 第 2 階段開放寫入前 | 所有真實寫入保持拒絕 |
| Q03 | 主機、HTTPS 網域、持久磁碟、加密金鑰來源、備份、還原與資料所在地 | 第 4 階段連接前 | 不部署，不建立可公開呼叫服務 |
| Q04 | 冪等紀錄及 tokens 的保存／刪除／斷開連結政策；建議 key 至少保留 30 日，uncertain 不自動過期 | 第 3 階段結束前 | 無法提供準確去重期限與隱私承諾 |
| Q05 | If-Match 原子條件更新實際支援與清除 due 的 patch 語意；未驗證前不開放清除日期 | 更新寫入驗收前 | 不能宣稱無 lost update；必要時縮減／延後寫入 |
| Q06 | Google reconnect 的穩定帳號識別：是否需額外 openid scope，或每次重連建立全新 connection | 真實 OAuth 連線前 | 不得以 email／模型參數串接憑證 |
| Q07 | 開源授權（建議 Apache-2.0 或 MIT）、隱私政策、維護與安全通報聯絡方式 | 第 5 階段發布前 | 不發布 GitHub／市集 |
| Q09 | 核准時間與保存語意：目前 callback 等待期限、ledger 核准可用期與提案有效期是不同層的實作值（見 [service](../src/service/index.ts)／[Store](../src/storage/index.ts)，依靜態分析）；是否對使用者承諾一致期限尚未決定，業務決策 owner 待確認。不得將其中一個值推定為全部核准語意 | 正式真人核准放行前 | 保留現有合成行為，不放寬真實 gate |
| Q08 | 實際 ChatGPT 表面／workspace 權限、Google scope 分類與驗證需求 | 真實 E2E／公開測試前 | 不能承諾可連線或免審核 |

## Q04 / Q09 private-use policy proposal — 2026-11-04, not approved

This proposal is limited to the single-owner private connection. It does not authorize real writes, credential access, disconnection, deletion, deployment or a multi-user service. D016 remains the adopted local behavior; Q04 and Q09 remain open until the owner decides and the required implementation/acceptance evidence exists.

| Question | Proposed private-use policy | Evidence and tradeoff |
|---|---|---|
| Q04 operation retention | Keep the durable ledger for the lifetime of the private installation, with no automatic expiry of successful, failed, pending or uncertain operations. Do not reuse an old operation key after loss or deletion of that ledger. | Matches current [Store](../src/storage/index.ts) behavior and protects replay history; it increases retained personal content. It is not a 30-day purge policy. A shorter content lifetime would require a separately designed replay tombstone/redaction contract before implementation. |
| Q04 content disclosure | Explicitly disclose that operation payloads and successful results can contain task titles, notes, dates and IDs in the local SQLite database. Vault token encryption does not encrypt the entire database or its backups. | The operations table stores serialized payload/result; `EncryptedVault` protects secret values only. File mode 0600 is access control, not disk encryption. Do not describe this as metadata-only storage or claim existing full-database encryption. |
| Q04 disconnect | Treat disconnect as a separate owner-authorized operation: stop the private client, revoke/remove the selected Google connection's credentials through a reviewed implementation, invalidate connection-bound approvals/cursors, and retain the old ledger to prevent reuse. Never delete Google tasks as part of disconnect. | A complete disconnect command is not implemented or verified. Revocation effects on other clients using the same Google grant must be checked before proposing an executable batch. Reconnect currently creates a new connection under D017; this is not proof of revocation. |
| Q04 local erasure and recovery | Handle erasure as a separate explicit choice covering the database, credential key and backup copies, with disclosure that erasing ledger history removes replay protection. Recovery must preserve the latest ledger; an older snapshot alone cannot authorize resuming writes. | No purge, backup schedule, automatic reconciliation or secure-erasure guarantee is introduced by this proposal. Backup destination, key custody and retention remain Q03 deployment decisions. Existing synthetic recovery proves an old snapshot can lose newer ledger entries. The application cannot currently detect ledger freshness or enforce this recovery requirement. Before real writes are enabled, a separately reviewed and tested recovery procedure/control must keep writes disabled after restoration or ledger loss until reconciliation; this proposal supplies neither that mechanism nor proof of it. |
| Q09 human confirmation | Allow at most 60 seconds from server issuance/wait start; delivery time can shorten the time visible to the user. Do not promise 60 seconds from UI display. Refusal, cancellation, expiry or server restart requires a fresh confirmation; none grants permission to retry an uncertain write. Bind acceptance to the current local connection, operation and preview, then claim once before dispatch. Do not represent the opaque local connection ID as a verified Google account identity; account continuity or bounded reconnect isolation must be resolved under Q06 before real-write release. | Existing [MCP](../src/mcp/index.ts) continuation expires after 60 seconds and is single-use/in-memory. Existing [service](../src/service/index.ts) confirmation waits at most 60 seconds and re-reads before claim. The local connection ID is randomly generated; Google account identity is not verified by that ID. Human ChatGPT trust evidence is still required by Q02. |
| Q09 internal approval and proposal lifetime | Keep the current 5-minute ledger approval window and 24-hour proposal eligibility as internal, separate safeguards. Do not promise that a displayed form is valid for 5 minutes or that an approval lasts 24 hours. An expired proposal cannot be renewed by silently changing its payload or reusing its key; a new reviewed proposal is needed. | Store `approve`/`approveBound` and `claim` define those separate windows. The service's bound approval is immediately followed by claim without an asynchronous gap. CLI preapproval remains synthetic-only under D015. |

Suggested decision: adopt this conservative private-use policy without automatic record deletion, then implement and test the missing disconnect path before closing Q04. Keeping current timing avoids an unsupported redesign while Q02 human acceptance is still outstanding. **Confidence 75% (uncalibrated) | Codex (model and effort unknown) | Basis: source inspection of Store/service/MCP and recorded synthetic recovery results; no human acceptance, true Google revocation or real-write evidence.** The owner may instead require a shorter content-retention period; that changes the storage/redaction design and cannot be represented as a configuration-only change.

## 本階段實際觀察

專案起始為空目錄，沒有既有程式、測試或 Git metadata。已讀使用者提供交接文件並查閱官方 OpenAI、Google、MCP、Node、IANA、卑詩省來源；具體結果與限制保存在 API_CONSTRAINTS.md。未存取任何使用者 Google 資料。文件檢查結果見 TEST_PLAN.md；不能據此宣稱產品已可使用。

## 2026-10-27 核准後實作決策

- D013（已採用）：使用者明確要求安全快速迭代至可親自測試，推進本地合成資料路徑，不重複要求計畫核准。
- D014（已採用）：使用官方 SDK v2、strict TypeScript、SQLite；Node 24 為建議環境，本機驗證為 Node 26。
- D015（已採用）：本機終端逐筆核准僅用合成寫入。真實寫入保持拒絕，Q02／Q05 未解；不以 TTY 充當遠端人類身分證明。
- D016（本地已採用）：操作紀錄不自動過期，保留 DB 期間防重；刪除 DB 即失去保護。正式 Q04 保存及刪除政策仍待定。
- D017（本地已採用，Q06）：每次重新連線建立全新 connection，不繼承前帳號 refresh token。舊 stdio client 拒絕換綁後 token；重連後須重啟 client。只要求 Google tasks.readonly，不增加 openid。
- D018（已採用）：本機 tzdb 2026a 對 2026-11-02 Vancouver 回 GMT−08，診斷 localDateInferenceSafe=false。禁止相對日期推算；純日期獨立編碼仍可測。不得把過舊規則當預期值讓測試假通過。

D003–D011 的本地適用部分已實作；遠端 provider／部署與真實寫入部分仍待驗證。第 0 階段觀察保留作歷史紀錄。

- D019（使用者明確要求，已採用）：每個元件資料夾放 SPEC.md，規格含追加式決策；根索引→父→子→父雙向導覽，相依及檔案精準定位。實作依責任拆為資料夾，保留四個既有執行入口與命令。
- D020（已採用）：規格同步以內容指紋檢查，納入 npm run check／CI；新增、修改、刪除及規格本身改動都須 stamp 並追加決策與驗證。採用此方式是因目前尚無 Git metadata，且可獨立檢查工作目錄。這不是語意正確性證明，不能用機械 stamp 取代規格維護。
- D021（已採用）：原本每次要求全文讀取所有設計文件改為從根 SPEC 與目標規格按需追蹤；架構變更仍讀取相關總體限制，兼顧安全與 token 使用。

- D022（2026-10-27，本機已採用）：依使用者提出的 OrbStack 測試，新增 Docker 多階段建置與 Compose；以 OrbStack host network 保留 loopback，專用 volume 與 Google 憑證隔離。取捨為此配置專屬本機 OrbStack，不能當公開部署模板。
- D023（2026-10-27，規劃已採用、各 gate 尚待驗證）：依使用者要求強化測試至上線規劃，建立 G0–G6 放行、證據、阻擋及回復規則；通過本機測試不授予真實帳號、公開端點、正式部署或發布權限。

- D024（2026-10-27，已採用）：依使用者選擇 TypeScript、穩定版本與 keep it simple，固定 Node 24.22.1 LTS／npm 11.19.1／TS 5.9.3，移除直接依賴 ^，保留既有正式套件版本與 lockfile，容器固定基底 digest、CI 與本機對齊 Node patch。加強回傳／switch／override／模組編譯檢查；adapter 可寫欄位從既有 Zod 推導，不新增框架。取捨：不追最新 major；固定版本仍須定期人工檢視安全更新。exactOptionalPropertyTypes 試驗與目前 MCP Node adapter／Node HTTP 型別不相容，暫不啟用，不以斷言繞過；既有 strict 與 noUncheckedIndexedAccess 保留。取代 D014 的 Node 環境建議部分。
- D025（2026-10-27，本機既有實作例外已記錄；正式儲存方案未定）：官方 Node 24.22.1 原始文件將 node:sqlite 標為 Stability 1.2 Release Candidate。為保留已驗證的本機流程，本次不額外引入原生 driver、安裝腳本與遷移工作；此例外不滿足「全部 API 均穩定」，G5 阻擋。正式上線前須使用已穩定的 API／driver，記錄選擇並重驗既有資料相容、原子 claim、隔離、uncertain、逾時與備份恢復；本機測試通過不能豁免。

- D026（2026-10-27，依使用者授權採用）：使用者要求代理建立專用資料並測 CRUD；現有 Google tokeninfo 實測只有 readonly。新增 --write-test 明確要求 tasks scope，保留預設唯讀、TTY CONNECT、PKCE 與換綁隔離，不以 Cloud Console 設定推定現有授權。測試刪除僅限本次建立的合成資料清理，不擴增 v0.1 的 MCP 刪除工具；取得 Google scope 不解除 REAL_WRITES_DISABLED，也不代表已完成真實 CRUD 或 ChatGPT E2E。

- D027（2026-10-27，僅此次已授權測試採用）：使用者明確要求「你要建立，你可以測完 crud」，並完成讀寫重新同意。以獨立固定批次維護入口建立新清單與一筆合成任務，執行 CRUD、完成與清理；不接受模型參數或任意 ID，不核准正式 MCP 操作。批次／每個寫入採持久化帳號隔離紀錄及原子預留，結果不明停止且禁止重送；清理拒絕額外或指派資料。取捨：可驗證真實 Google REST 與既有 adapter，但不等同 ChatGPT E2E、不解決 Q02／Q05、不新增產品刪除工具或解除 REAL_WRITES_DISABLED。

- D028（2026-10-27，本機準備採用；外部啟用待帳號與存取範圍驗證）：依使用者要求規劃並執行 ChatGPT 私人接線，採官方 Secure MCP Tunnel → 本機 stdio → OrbStack 的唯讀試用分支。原因：可沿用既有 Node LTS image 與 Google 本機連線，無需公開 demo HTTP 或先自建 OAuth provider；不新增任務 UI／LLM／背景自動化。Google stdio 明確僅註冊四個讀取工具，保留 service 停寫。取捨：Tunnel 只是傳輸層，local-os-owner 不提供逐人身份，僅限可驗證本人獨佔的專用帳號私人測試，若不能確認獨佔則不啟用；多人與公開服務仍須 G2。Q02／Q05 與完整 G4／G5 未解，不把這個分支標為產品 CRUD 完成。官方來源、分階段驗收、登入阻擋與回復見 [私人串接計畫](CHATGPT_CONNECTION.md)。


- D029（2026-10-28，依使用者要求採用驗收計畫，非部署核准）：以 ChatGPT 自然語言安全管理（查詢、提出、可信核准、精確新增／修改／完成、Google 結果確認）為最終交付；採 RELEASE_PLAN P0–P8 與 C01–C20 記錄測試至上線。先執行已授權的本機回歸與拋棄式合成資料 SIGKILL／一致性快照還原演練，保留真實 MCP 寫入、穩定儲存與部署 gate。取捨：不把唯讀成功當 MVP 完成，也不為加速繞過人類核准；演練不碰正式 .data、不加背景排程、不部署。既有 D027 僅固定維護 CRUD，不能擴寫為正式寫入核准。


- D030（2026-10-28，本機合成原型採用，真實與正式放行未核准）：先用官方 SDK 的 request-channel form elicitation 驗證逐筆核准候選路徑，單獨 demo-stdio 入口，不修改既有私人 Google 四工具。明確 accept+approved=true、60秒期限、取消拒絕、帳號／payload 綁定、確認後重讀及原子 claim；成功重播不再提示。取捨：不新增 UI／provider／框架，但 SDK 回應本身不證明真人，ChatGPT 顯示與可信身分尚待驗證。2025 legacy 長連線 SDK／stdio 合成測試通過；現有 stateless HTTP 不保留能力而安全拒絕；2026-07-28 input_required 另待實作，不能泛稱所有 MCP 客戶端支援。條件更新共用 required expectedVersion，demo 原子比對，Google If-Match；真實端點是否確實拒絕舊版本仍須專用清單證據。真實 MCP 寫入 gate、D025、D027 範圍均維持。

  官方依據核對 2026-10-28：[SDK elicitation](https://ts.sdk.modelcontextprotocol.io/v2/servers/elicitation) 定義 accept／decline／cancel 與 flat form，且明述 2026-07-28 elicitInput 會拒絕；[OpenAI MCP server](https://developers.openai.com/plugins/build/mcp-server) 與 [auth](https://developers.openai.com/plugins/build/auth) 僅作正式安全架構依據，不是本帳戶 UI 已驗證的證據；[Google Tasks performance](https://developers.google.com/workspace/tasks/performance) 的條件請求說明僅支持設計候選，不能取代本端點實測。

- D031（2026-10-28，合成原型採用）：實際私人 ChatGPT 連線以 server/discover 使用 2026-07-28，七工具及讀取成功，但舊 elicitInput 回 APPROVAL_UNAVAILABLE。依固定 SDK 2.4.0 的 inputRequired 契約新增 modern factory 路徑；保留 legacy 原路徑。延續識別碼為256-bit隨機值，伺服器記憶體查表驗證完整preview hash、同一固定帳號 service、60秒期限與單次消耗，上限128筆；不把客戶端回傳 state 直接當核准。重啟即失效，持久化提案與寫入防重仍由 service/store負責。取捨：不加第二個儲存框架或新增對外服務，僅供合成相容性驗證；仍未證明真人或逐人身分，不解除 REAL_WRITES_DISABLED。官方核對日期2026-10-28：[OpenAI MCP elicitation](https://developers.openai.com/plugins/build/mcp-server) 明示annotations不能取代伺服器確認；精確新版協定行為以已安裝官方SDK的inputRequired／requestState契約及實測為準。

- D032（2026-10-29，本地採用，遠端設定待執行）：依使用者要求套用分層文件、獨立代理審查與品質門檻；沿用元件 SPEC 與既有 Zod／SQLite 契約，新增輕量 context 命令省略歷史與指紋，不再建立重複規格。CI 加入 legacy／modern 合成 stdio 及 SIGKILL 恢復，固定 npm、限制權限／時間／過時執行。取捨：不新增框架、UI、額外 lint 套件或自動部署；review 需證據，效果以後續同類任務量測，不能假定多代理必然更省 token。Git metadata 不存在，故 branch protection、PR 及遠端 CI 未執行。詳見 [工程流程](ENGINEERING_WORKFLOW.md)。

## D033 — SSOT Context Architecture（2026-10-29，採用本地文件與檢查改善）

- Context：既有元件 SPEC、PRD、架構草案與來源可定位，但權威範圍不明，手寫工具表出現 matches／items 漂移；入口與相依資訊易多處維護。
- Decision：docs/INDEX 為主要 Router；components.json 登錄唯一來源路徑、元件按需角色及允許相依；生成區域由 context:generate 重建。API 採現有 Zod Code-first，DDL 留 Store，意圖／驗收留 PRD，跨元件理由／未決事項留本文件，局部理由留元件 SPEC。
- Alternatives：不採另建全套 Module README、OpenAPI、ER 表、通用知識圖譜或 Skills 平台；現有 SPEC 足夠且避免第二份契約。
- Rationale：將可推導資訊指向來源，保留業務語意、例外與拒絕替代方案；用少量 metadata 支援選擇性載入。
- Consequences：新增來源／生成一致性／AST 相依檢查與拒絕測試，沿用同一 CI job。service 對 GoogleHttpError 的現有相依保留；本輪不改產品程式、資料與業務行為。機械檢查不是語意正確性或安全隔離證明；沒有量測 token 節省。
- Ambiguity：Q09 區分目前時間機制與未決使用者承諾；Q07 的授權條款仍待決，2026-10-29 使用者另已明確授權公開原始碼，不能把公開 Repo 當成已選定開源授權或正式服務放行。

## D034 — Stable SQLite driver candidate（2026-11-04, evaluated; not adopted）

- Context: D025 blocks release while the pinned Node SQLite API remains a release candidate. The existing ledger requires durable file storage, atomic claims, account isolation, uncertain-state retention and compatible recovery; those requirements cannot be replaced by an in-memory export workflow.
- Candidate: the public API of `better-sqlite3@13.0.3`, with its exact package and transitive versions recorded in the isolated experiment. The [pinned manifest](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/package.json), [binding loader](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/lib/binding.js), [API documentation](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/docs/api.md), [MIT license](https://github.com/WiseLibs/better-sqlite3/blob/v13.0.3/LICENSE) and [release history](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0) were checked on 2026-11-04. Bundled N-API binaries allow the tested Linux arm64 installation with scripts disabled; this does not establish all-platform support or binary reproducibility. Retain the MIT notice if adopted; its node-addon-api dependency is also MIT.
- Alternatives: retain `node:sqlite` for the currently working local prototype, but do not waive D025; do not upgrade the pinned Node major merely to seek a different stability label. `sql.js`'s documented in-memory/import-export approach would require a new durable-write layer, so it was not executed or selected. Avoid a schema/ORM rewrite because the candidate's synchronous file API fits the existing Store boundary.
- Evidence: the isolated candidate passed runtime regressions, round-trip compatibility, atomic competing claims and crash/snapshot recovery, as recorded in [TEST_PLAN](TEST_PLAN.md). The npm advisory check reported zero findings for the candidate tree; the [maintainer advisory page](https://github.com/WiseLibs/better-sqlite3/security/advisories) listed none on the check date. These are bounded observations, not a security guarantee.
- Status and consequences: retain as the leading candidate for a bounded integration; no project dependency, driver, production data or running tunnel has changed. Before adoption, complete strict typing without assertion-based shortcuts, a clean locked `--ignore-scripts` installation and full build/check, contention-timeout coverage and independent review. Record supported platforms from execution evidence. D025 and all real-write gates remain in force.

## D035 — Stable SQLite driver adopted for validated Linux targets (2026-11-04)

- Continue D034 with `better-sqlite3@13.0.3` and `@types/better-sqlite3@9.6.0`, pinned in package.json/lockfile. The MIT-licensed DefinitelyTyped declarations are development-only; their API subset must pass strict type checking against the selected runtime. No schema, approval policy or retention change is authorized by this integration.
- The direct synchronous API avoids a second persistence abstraction. Existing file format, encrypted vault, account scopes, atomic claim and FULL/DELETE durability are preserved. A new synthetic rehearsal exercises compatibility with the previous driver, independent connections and real lock timeout. Native prebuild availability becomes a platform dependency; no lifecycle builds or downloader are allowed.
- Validation: clean script-free installation and full `npm run check` passed on pinned Node/npm for Linux arm64 and Linux x64 (x64 under OrbStack emulation). Both stdio eras and crash/snapshot recovery passed; final storage rehearsals passed old-driver-created file upgrade, rollback reads, cursor/vault/approval continuity, isolation, 20 independent claims and the actual five-second lock timeout on both targets. Production-only arm64 runtime claim/vault checks passed without development dependencies. Native macOS and remote GitHub CI were not executed.
- Independent read-only review found one P1 gap in the first permanent compatibility test: it created the file with the new driver. Accepted and fixed by creating the first on-disk database with `node:sqlite`, deriving unchanged DDL and fixtures from an in-memory Store. Re-review confirmed the gap closed and no new concrete defects; both corrected target rehearsals exited 0. Detailed commands and limits are in [TEST_PLAN](TEST_PLAN.md).
- This supersedes D034's candidate-only status and resolves D025's RC driver requirement for the validated Linux targets. It does not waive the rest of G5, approve deployment, certify a production backup policy or enable real writes. Existing running connections retain their prior image until a separately scoped switch; no production file was opened or migrated. Retain dependency MIT notices in distributions. Native binary provenance remains limited to the package/integrity/static and isolated execution evidence described in D034.

## D036 — Local personal use, then open-source self-hosting (2026-11-04, owner approved)

- The owner's latest clarification sets two priorities: P0 runs the service locally in OrbStack for the owner's ChatGPT Web or Mac; P1 makes the project open source so others can run their own local instances for personal use. Earning stars remains an aim, not a guaranteed result. Acceptance is authoritative in [PRD](PRD.md#approved-delivery-priorities--2026-11-04).
- This replaces the earlier same-day Oracle-first hosting sequence. Oracle deployment, a public multi-user service and official directory submission are outside the current delivery sequence. Historical release P0–P8 step labels remain execution references rather than product priorities.
- Reason and tradeoff: prove one usable local installation, then make that installation reproducible for others. Each installation owns its credentials and local durable state; this avoids requiring a project-operated shared backend, but computers and connection processes must stay running during use. No centralized hosting or telemetry is introduced.
- Existing feature and write-safety requirements remain. Q04 retention, Q09 approval timing and Q07 license remain pending. This goal decision does not authorize credential access, new real Google operations, cloud deployment, publication beyond existing explicit scope, or local data deletion.

## D037 — Deliver small usable slices before full P0 (2026-11-04, owner approved)

- The owner requests smaller milestones so actual use exposes problems instead of remaining in prototype development. Adopt read-only personal use first, then independently verified create, update and complete; follow with reproducible installation and open-source publication. See [PRD](PRD.md#incremental-use-before-full-p0-completion--2026-11-04) and [release criteria](RELEASE_PLAN.md#small-usable-releases--2026-11-04).
- A verified read-only release is a usable partial product, not full P0 acceptance. Write-specific decisions, Oracle and full-feature acceptance do not block that slice. Each write capability still needs its own applicable trusted approval, persistence/recovery and real endpoint evidence; update-specific conditional checks need not block read-only or create.
- Preserve authorization boundaries: dedicated test access does not imply personal-account access, and a delivery plan does not grant new real Google operations. Keep unverified capabilities unavailable, collect feedback through the existing evidence/issue workflow, and avoid adding background telemetry or a new prototype interface.

## D038 — Shared private HTTP runtime and one-command startup (2026-11-04, owner approved)

The owner requested OrbStack packaging for Codex Mac and ChatGPT Web, then explicitly requested execution and quick startup including Secure MCP Tunnel. One Google read-only service owns the existing dedicated test connection; Codex accesses loopback HTTP while the existing macOS Tunnel client forwards to that same listener. One launcher starts/supervises both, avoiding a new Linux client download or public server. A separate local random key protects HTTP; the saved .env remains the Tunnel control-plane credential only. Neither key is public user authentication. This supersedes the private stdio single-client operating restriction for the shared path, but preserves the original path for rollback. Calendar account confirmation, public/multi-user OAuth, Google writes and full P0 acceptance remain outside this change. Runtime evidence is recorded in TEST_PLAN.

## D039 — Local approval desk and Claude connections (2026-11-04, owner approved)

The owner asked for deadline acceptance with full CRUD and for Claude Web and Claude Desktop (Mac) support, chose "本機核准頁" for human write approval after a plain comparison, and chose "Tunnel + 單人 OAuth" for Claude Web. This resolves Q02 for the single-owner private connection only.

- **Approval:** real writes are proposal-first. A tool call returns `APPROVAL_REQUIRED` and a link to a loopback page; the owner reviews server-read content and decides there; the client retries with the same key. Why: third-party sources indicate Claude Web and Desktop do not render MCP elicitation (official documentation does not say), and a client tool prompt is unverifiable by the server and removed by "Always allow". Tradeoff: one extra browser step per write, approval only at this Mac, and a narrow exception to "no separate UI": the page manages decisions, not tasks. Same-OS-user processes remain inside the trust boundary.
- **Claude Web:** a separate connector listener (loopback:3004) behind an owner-controlled tunnel, with a minimal authorization server (DCR, S256 PKCE, rotating refresh tokens, exact Claude callback). Consent happens on the loopback desk, so no passcode exists to leak and reaching the public URL alone never yields a token. The SDK provides resource-server helpers but no authorization server; a hosted identity provider would add an external account and dependency for one user. This supersedes D028's "no application-level OAuth" only for this listener. Not a multi-user service and not a hosted deployment; D036 remains in force.
- **Claude Desktop:** a stdio bridge run inside the service container relays to the shared HTTP service, so there is one ledger and no credential in client configuration. An `.mcpb` bundle was not needed for one owner.
- **Calendar:** remains outside this project (PRD scope). The deadline event used the Google Calendar connector.
- **Lists:** real writes are not limited by the demo allowlist. Google scope cannot be narrowed per list; per-operation human approval on a dedicated account is the control.
- **Gates still open:** Q04 retention/disconnect/recovery and Q09 user-facing timing are not decided by this entry. The `check_approval_channel` diagnostic stays in the code but is no longer enabled at runtime. Rollback: unset `TASKS_REAL_WRITES` in the compose file, delete `.data/public-url`, stop the tunnel.

Status: implemented with synthetic tests. Real acceptance is recorded separately in [TEST_PLAN](TEST_PLAN.md#claude-and-local-approval-verification--2026-11-04). Guide: [CLAUDE_CONNECTION](CLAUDE_CONNECTION.md).

## D040 — Google Tasks is the only store of task content (2026-11-04, owner approved)

The owner stated: "我想要已google tasks為唯一的資料庫" (Google Tasks should be the only database). For Google connections this replaces the indefinite-content part of the Q04 proposal; that proposal was never adopted. Read as a rule about task data: local storage may hold what is needed to operate safely, but no task content after a proposal is decided.

- **Local after a decision:** operation digest, state, list ID and task ID. Replay protection and uncertain-write refusal keep working, as AGENTS requires a durable idempotency record. These records stay with no automatic expiry (D016); the digest is an unsalted hash of the request, so it could confirm a guessed title but does not store one.
- **Local temporarily:** an undecided proposal keeps its content so the desk can show it, for at most 24 hours (the existing proposal window). Content is removed at approval's claim, rejection or expiry. It is cleared before the Google call, so a crash mid-write leaves none. Startup also clears earlier harness and finished rows. `secure_delete` overwrites freed pages going forward; pages freed before this change are not rewritten, and they held synthetic test data only.
- **Local, not task data:** Google credentials (encrypted), OAuth grant digests, pagination tokens.
- **Replay:** a repeated key now reads the task from Google and returns it with `replayed: true`, so it shows the current state rather than the original result. If the task was deleted in Google the replay reports `NOT_FOUND` and never recreates it. Tradeoff: replay needs Google to be reachable.
- **Scope:** demo mode keeps its local store, which is its only data. Calendar is unaffected. Q09 timing is unchanged. Still open under Q04: a disconnect path and detection of a restored older ledger. These limits are accepted only for the dedicated test account; real personal data needs them resolved first.

## D041 — Direct writes after one authorization (2026-11-04, owner approved)

The owner stated the product is highly LLM-operated and only provides an MCP tool between the LLM and Google Tasks, asked whether one authorization should cover later use, and chose "改成直接寫入" after the tradeoff was stated. This supersedes D039's per-write approval as the default and replaces the corresponding AGENTS rule and R04/R06 wording. D039's desk remains as the strict option and for Claude Web connection consent.

- **Authorization:** the connection grant, which the server can verify: Google OAuth with the owner's dedicated account, plus OAuth consent on the loopback desk for Claude Web or local configuration for Desktop. Client tool permissions, including "Always allow", add a layer the owner controls that the server cannot verify. Model parameters and conversation text are not authorization.
- **Configuration:** `TASKS_REAL_WRITES=1` enables writes; they are direct unless `TASKS_WRITE_APPROVAL=local` selects per-write approval. Neither can be set from a tool call.
- **Kept:** no delete tool, durable idempotency, `If-Match` and stale refusal, no automatic resend after an unknown outcome, sanitized errors, and D040.
- **Lost:** a model misled by task notes or web content can update or complete tasks without a further human step. Completion is reversible. Overwritten titles and notes are not recoverable: Google Tasks has no version history and D040 keeps no local copy. Tool descriptions ask the model to confirm when a target is unclear; that is behavioral guidance, not a control.
- **Alternatives:** keeping per-write approval conflicts with LLM-led use. Treating a chat statement as approval is unverifiable and spoofable by injected content.
- **Change this if:** the account holds content that cannot be lost, or the model routinely reads untrusted content; use strict mode. Q04's disconnect and restored-ledger gaps remain limits for real personal data. RELEASE_PLAN's Q02 condition is closed by this owner decision for the private connection only.

## D042 — Calendar and Tasks strategy as a user-invoked skill (2026-11-04, owner approved)

The owner asked for a concrete strategy for using Google Calendar and Google Tasks together through an LLM, written in the README, with suitable tools integrated, such as skills for complex operations.

- **Strategy:** Calendar holds fixed commitments and hard deadlines; Tasks holds next actions; the LLM translates and picks but stores nothing. Four workflows: brain dump, plan a deadline, today, weekly review. No cross-system IDs: a note line in tasks links by name and date, with Calendar authoritative.
- **Tool choice:** one Claude skill, because it is text, needs no server change and can use two connectors in one conversation. MCP prompts would need server code and still could not reach the Calendar connector's tools. Skills do not travel to ChatGPT; there the same rules can be pasted as instructions, which has not been tested.
- **Scope:** this does not add Calendar tools, reminders, recurrence or background runs to the product, so the PRD's v0.1 exclusions stand. Planning happens only when the user asks. Scheduled briefings were not added because AGENTS excludes background automation in v0.1; the owner can revisit that.
- **Limits:** the "at most 3 tasks" and "2 day buffer" defaults are chosen heuristics, not measured values. Cited research on plan-making comes from psychology studies, not this product. Any productivity or stress benefit is unmeasured. The skill has not yet been run in a real Claude conversation.

## D043 — Private repository until a security review (2026-11-04, owner approved)

The owner set the repository to private: "先改成 Private，最後要 public時候，我再一次性審查資安". This pauses the 2026-10-29 public source authorization. P1 publication now also requires that review, on top of Q07.

- **Exposure so far:** `main` was public from 2026-10-30. `codex/stable-storage` was public for a few minutes on 2026-11-04. GitHub reported 0 forks, 0 stars and 21 unique clones over 14 days; that count may include CI and automated crawlers, so it does not show who holds a copy.
- **Scan at the change:** gitleaks 8.30.1 over all refs found 2 hits across 4 commits, both reviewed as false positives (a fixed test key name and a file fingerprint). A separate pattern search found no credentials, personal email, tunnel URL or local path, and no secret-bearing file was ever tracked. A scan shows only that known patterns were not found.
- **New history:** it can keep old commits out of a future public repository, but it cannot retract copies already taken. Anything that was public must be treated as disclosed, and a credential found there must be rotated, not just removed. Current evidence does not require rewriting for secrets; a new repository at publication remains the owner's option for removing development history.
- **Not changed by this:** a private repository does not protect the running service. The tunnel endpoint stays reachable while the tunnel runs.

## D044 — Files the host runs or trusts stay out of the container mount (2026-11-04, owner approved)

Independent review of `2af9cb6` found that the whole `.data` directory is mounted writable into the container, including the tunnel client and profiles that macOS runs while holding the Tunnel key. The reviewer overwrote mode-700 fixtures from a container under the same mount conditions; no way to break into the container was found. The owner chose "現在修正".

- **Decision:** the tunnel client, tunnel profiles, health URLs, the launcher pid and lock, and Inspector storage live in `.host/`, mode 700, git-ignored and never mounted. `.data` keeps the database, vault key, Google client file, local credentials and service lock.
- **Why this split:** moving only host files leaves the database and keys in place, so no Google or Claude re-authorization is needed.
- **Trade-off:** an existing install must move the files once. The launcher refuses to run while `.data/tools` or `.data/tunnel` exists rather than moving them itself.
- **Not covered:** the host still reads `private-http.token` from `.data`; the service already knows that value, and the client sends it only to the local service. The container can still alter everything in `.data`, including the database. The other review findings (F2–F7) remain open and must be resolved or accepted in the security review before going public.

## D045 — Writes allowed on the dedicated test account with Q04 and Q09 open (2026-11-04, owner approved)

Independent review of `ee7f072` found `containers/google-compose.yaml` enabling real writes while RELEASE_PLAN required them disabled until Q04, Q09 and related conditions passed. The owner compared the options and chose the exception limited to the dedicated account.

- **Decision:** the private compose keeps `TASKS_REAL_WRITES: "1"`, for the dedicated test account only. Before connecting real personal data or another account, the Q04 gaps below must be resolved.
- **Accepted gaps:** no detection of a restored older ledger, so a retry with the same key after a restore could create a duplicate; no complete disconnect command, so revoking the Google grant is manual. Q09 timing applies only to per-write approval and stays undecided.
- **Trade-off:** no new technical control. The code does not stop a personal account from being connected; the limit relies on the owner following it. It was chosen because the test account's data is disposable, no backup and restore flow exists, and connecting already requires `--write-test` for write access. Default-off would guard only against accidental enabling, and solving Q04 now would delay this phase.
- **Change this if:** a personal account will be connected (resolve Q04 first), or the source is prepared for other users (revisit default-off).
- **Not closed by this:** Q04 and Q09 stay open.

## D046 — Self-install defaults for public users (2026-11-04, owner goal; Q04 part not approved)

The owner set the goal of a public repository with simple install: "盡快完成這階段，我想快點放到 github 上公開給大家用". D045 asked to revisit default-off once the source was prepared for other users.

- **Decision:** `setup.sh` is the install path. Writes are off unless the user chooses them; the choice lives in `.host/runtime.env`, and compose no longer sets it. Scripts use the current Docker context rather than OrbStack by name. Claude Desktop's bridge starts the service on demand.
- **Why:** each user owns the Google client and consent, so no shared service or verification is needed. Default-off means a mistaken Enter gives read-only access.
- **Trade-off:** each user must still create a Google client, which is most of the install effort. A shared verified client would be simpler but makes the maintainer responsible for user access; it is not proposed.
- **Awaiting owner decision:** D045 requires Q04 to be solved before personal data. Public users will connect personal accounts. Proposal: accept the gaps for self-install by documenting them. There is no disconnect command, so README lists manual steps; it warns against restoring old `.data`. Publication stays blocked until the owner decides this.
- **Limits:** tested on OrbStack only. The wizard's flow is covered with a fake Docker; a clean-machine run has not happened.

## D047 — Findings from the pre-public security review (2026-11-04)

An independent review of `9deb143` returned 5 blockers. Fixed here, on the author's judgment, within the owner's request to review security before going public:

- **Owner code on desk decisions.** Host, Origin and CSRF checks stop browsers but not scripts, and loopback ports were reachable from other containers. Every consent and approval now needs the code in `.data/desk.key`, then an 8-hour HttpOnly cookie. Same-user processes can still read the file.
- **`expectedEtag` required on update and complete.** Reading the version at call time protected only milliseconds, so a person's edit after the model's read was silently overwritten. This changes the tool contract; a caller must read first.
- **Fail closed and revocation.** A mistyped `TASKS_WRITE_APPROVAL` refuses to start. Tokens are bound to read or write mode, and deleting `public-url` revokes them at restart. Direct mode no longer stores payloads.
- **Not changed:** consent phishing, anonymous registration filling the 32 client slots, refresh-family revocation, and test harnesses in the runtime image remain accepted limits.
- **Still the owner's:** Q04 for public users, the license and history handling. Publication stays blocked until those are decided.
- **Sanitized:** real fixture names and account-type details were removed from current documents, which rewrites some earlier evidence wording. They stay in Git history unless a fresh history is published.

## D048 — Public release choices (2026-11-04, owner approved)

The owner answered the open release questions: MIT ("MIT"), a disconnect command first ("先做斷開指令"), a fresh Git history ("全新歷史"), and removing the dated authorization from the public `AGENTS.md` ("公開版移除").

- **Q04 for public users:** `./setup.sh disconnect` revokes at Google, removes local credentials and keeps the ledger, cleared of any undecided proposal content. Credentials are removed even when Google cannot confirm, and the command then says so. Detection of a restored older ledger is not built; README warns against restoring `.data`. This replaces the D045 condition for self-install; Q04 is not closed for any hosted service.
- **Q07:** MIT closes the license part. Security contact is GitHub private reports. A privacy policy is not needed while there is no hosted service.
- **Trade-off of a fresh history:** decision history stays out of the public Git log; the documents themselves remain. GitHub can keep old commits reachable by SHA in a force-pushed repository, so a new repository is cleaner than rewriting this one. Copies from the earlier public period cannot be retracted.
- **Not done yet:** creating the public tree, and setting anything public. Both wait for the owner's go-ahead at publication.

