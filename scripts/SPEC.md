# 元件文件強制檢查（scripts）

上層：[project 規格](../SPEC.md)。

## 職責與邊界

以 components.json 指派最近元件，驗證 SPEC 結構、雙向上下層、全部檔案定位與 SHA-256 指紋；stamp 追加修改決策。另提供 Google stdio 協定 smoke，只 initialize／tools/list，不呼叫任務工具或 Google API。

## 契約與不變條件

private-stack.py start prepares a private static local credential and HTTP profile reusing the existing readonly tunnel ID, refuses an active old stdio container, starts Compose without building/pulling, then supervises the shared Tunnel launcher. start is foreground, Ctrl-C/stop shuts down both without deleting data; status checks local health and Tunnel readiness separately. An OS file lock prevents duplicate launchers. Shared data/profile directory chains must be non-symlink, current-owner and mode 700. Cleanup covers interrupted Compose startup as well as Tunnel failure. The optional headers action emits the local credential for clients supporting http_headers_helper; never run it for display. Installed CLI 0.146 ignores that option, so the configured client uses a mode-600 private static header instead. Shell permission masks use explicit base-eight notation. The shared tunnel mode loads the same strict .env parser as readonly. Failed startup does not imply readiness.

`start-private-tunnel.zsh` is a manual, foreground launcher for the existing `synthetic`, `readonly` or `shared` profile only. It checks the pinned local client, profile and OrbStack image, ignores inherited runtime keys, and loads only GOOGLE_TASKS_TUNNEL_API_KEY from the repository .env for readonly/shared. The local file must be owned by the current user, have no group/other permissions, and be a regular non-symlink. Only comments, blank lines and a single unquoted alphanumeric/underscore/hyphen assignment are accepted; contents are parsed, never executed. Missing/empty values fall back to hidden interactive input; empty input fails. Synthetic always uses hidden input. Keys are never printed or placed in command arguments. The owner explicitly opted into plaintext local .env storage on 2026-11-04; .env.example contains no secret. It does not create credentials, change permissions, or enable Google writes. Ctrl-C stops the client; existing data and profiles remain.

程式、測試、設定或 SPEC 本身異動均必須更新該元件規格並追加決策；新增及刪除檔案同樣受管。檢查不依賴 Git。指紋只能驗證同步狀態，規格語意正確性仍需審查。

恢復演練僅接受無參數入口，在系統暫存目錄自建合成 DB，實際 SIGKILL 子程序後驗證 uncertain、成功重播、帳號隔離、VACUUM INTO 還原及金鑰錯誤拒絕。不得接受使用者資料路徑、接觸 .data 或網路；模擬核准不算真人核准。舊快照遺失後續 ledger 的案例必須揭露，不能宣稱正式回復已安全。

合成 stdio 核准 smoke 在自身暫存目錄啟動 demo-stdio，SDK 模擬拒絕及接受，驗證建立／修改／完成／讀回、重播不再提示與第三頁搜尋。預設無參數，另支援 --modern；不載入 Google credential，20秒連線上限；不輸出任務內容，結束清除自身目錄。模擬客戶端的接受不代表真人或 ChatGPT 核准。

check-demo-stdio 預設本機暫存資料；TASKS_DEMO_SMOKE_CONTAINER=1 時改啟動 [容器 wrapper](../containers/demo-stdio.sh)，只使用專用合成 named volume，保留防重紀錄，隨機 operation keys 允許重複演練。容器模式不刪 volume，不接觸 .data。

component-context 接受 components.json 的單一精確 ID，或 --sources 只列權威路徑；讀登錄表與選定 SPEC；輸出目前契約及定位，省略決策歷史與指紋，不掃描程式、不讀 .data。無效參數非零結束。讀取前檢查相對路徑、真實路徑邊界及忽略目錄，拒絕 .env*、coverage、sqlite/log 路徑段、traversal、外部與導向忽略目錄的 symlink；登錄表本身也經邊界檢查。

合成 stdio smoke 預設 legacy，唯一選用參數 `--modern` 固定 2026-07-28，驗證 input_required 表單及 requestState 恢復、拒絕不寫、接受後 CRUD、防重與三頁搜尋；仍非人類核准證據。`npm run test:synthetic` 依序執行兩協定及恢復演練，需先 build；CI 強制執行。

context-model 驗證唯一元件／權威實體路徑、最近父層及角色引用。check-context 從登錄表重建 INDEX 標記區域，CI 僅比對不寫入；不複製來源正文。允許相依由 components.json 定義，AST 檢查 src 的相對 import／export／type import／literal dynamic import 及直接 require；computed imports 與 node:module／module loader 拒絕。這是原始碼結構檢查，不涵蓋任意 eval、套件內部或完整執行期安全分析。個別來源的業務語意仍需審查。

## Storage rehearsal contract

`check-storage.mjs` accepts no user paths and only creates disposable synthetic databases. It first creates an on-disk database with the previous Node driver using unchanged DDL/fixtures obtained from an in-memory Store (no duplicated DDL), then verifies upgrade and rollback file interoperability, preserved approval/claim, cursor isolation, encrypted vault continuity, 20 independent connection claims, and the actual default five-second lock timeout. A failed claim must preserve pending state and approval. It runs after build through `npm run test:synthetic`; simulated approvals are not human evidence.

## 檔案與定位

- [private-stack.test.mjs](private-stack.test.mjs): disposable launcher fixtures; run with node --test on macOS.

- [private-stack.py](private-stack.py)

- [start-private-tunnel.test.mjs](start-private-tunnel.test.mjs): disposable fake-client tests for file loading, permissions, symlinks, non-execution and profile separation; run with `node --test scripts/start-private-tunnel.test.mjs` on macOS with /bin/zsh. No real credentials or network.

- [scripts/start-private-tunnel.zsh](start-private-tunnel.zsh): secure manual restart entry point; operation guide: [ChatGPT connection](../docs/CHATGPT_CONNECTION.md).

- [scripts/context-model.mjs](context-model.mjs)：共用登錄及讀取邊界。
- [scripts/check-context.mjs](check-context.mjs)：Router 生成／漂移與相依政策檢查。
- [scripts/check-context.test.mjs](check-context.test.mjs)：合成 fixture 驗證來源唯一、漂移及禁止相依。

- [scripts/component-context.test.mjs](component-context.test.mjs)：合成暫存 fixture 驗證合法輸出、目錄穿越及 symlink 拒絕。
- [scripts/component-context.mjs](component-context.mjs)：按元件的唯讀上下文入口。

- [scripts/check-demo-stdio.mjs](check-demo-stdio.mjs)：build 後以 node 執行，僅合成資料與模擬確認。
- [scripts/check-recovery.mjs](check-recovery.mjs)：build 後以 node 執行，15 秒子程序等待上限，失敗非零；只輸出去識別化斷言，清理自身暫存目錄。
- [scripts/check-google-stdio.mjs](check-google-stdio.mjs)：SDK stdio initialize／四工具列舉；需已建置 OrbStack image 與已授權本機憑證，逾時 20 秒且不輸出 runtime stderr。
- [scripts/check-components.mjs](check-components.mjs)
- [scripts/check-components.test.mjs](check-components.test.mjs)

修改前讀目標 SPEC；修改後先補契約與定位，再執行：

```sh
npm run docs:stamp -- <元件 id> --decision "修改原因、決策及取捨" --validation "實際命令、結果或未測原因"
npm run check
```

`docs:stamp` 只追加紀錄與更新指紋，不代寫契約、不代跑測試，也不能修復缺少的上下層／檔案連結。SPEC 自身的變更也需重新 stamp。新元件須在登錄表新增父層、在雙方 SPEC 補連結。未登錄子目錄仍由最近元件管理。

忽略產物與秘密：node_modules、dist、.data、.host、.git、.agents、.codex、.aws、coverage、.env*、*.sqlite*、*.log；不得將原始碼放入忽略目錄規避檢查。受管 symlink 拒絕。Markdown 連結檢查存在性與專案邊界，不檢查標題 anchor 或遠端 URL。

恢復演練依賴：[storage](../src/storage/SPEC.md)、[service](../src/service/SPEC.md)、[demo](../src/demo/SPEC.md)；使用者：[放行計畫](../docs/RELEASE_PLAN.md)。

- [check-storage.mjs](check-storage.mjs)
- [setup-helper.mjs](setup-helper.mjs)：`setup.sh` runs this in the image to validate a client file and add one Claude Desktop entry, never printing secrets. [setup.test.mjs](setup.test.mjs) covers the wizard with a fake Docker.
- [check-container.mjs](check-container.mjs)：以無網路、唯讀根目錄啟動合成服務並列舉工具；只用合成資料，不掛載 .data。

## 驗證

`npm run docs:test && npm run docs:check`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：新增不依賴 Git 的文件指紋與雙向連結檢查，stamp 強制具體決策及驗證；以拒絕案例驗證同步制度。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-28

- 決策／原因／取捨：新增純合成 SIGKILL 與快照還原演練，驗證成功重播與 uncertain 拒絕並揭露舊備份遺失 ledger；不碰正式資料與核准
- 驗證：待執行固定 Node 容器與完整 check

### 2026-10-28

- 決策／原因／取捨：補記合成恢復腳本的實際 SIGKILL 與隔離容器證據；保留舊備份風險及模擬核准限制
- 驗證：宿主及固定 Node 24.22.1 無網路容器恢復演練 exit 0；完整 check 63 產品與6文件通過

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-28

- 決策／原因／取捨：準備無網路與獨立持久volume的合成核准容器入口，保留既有唯讀Tunnel並以隨機操作鍵支援重複演練
- 驗證：宿主78產品及6文件check通過，固定容器78產品通過；新wrapper待完整容器smoke

### 2026-10-28

- 決策／原因／取捨：補記固定版本容器與持久合成資料重跑證據，保留外部核准及真實寫入界線
- 驗證：Node24.22.1及npm11.19.1容器完整check通過78產品與6文件；stdio與恢復演練通過；實際runtime wrapper連續兩次smoke exit0，未測真人ChatGPT核准

### 2026-10-30

- 決策／原因／取捨：補齊modern stdio合成驗證並新增只讀指定元件的context命令，避免重複掃描
- 驗證：build及legacy/modern stdio和SIGKILL恢復全通過，獨立複審中

### 2026-10-30

- 決策／原因／取捨：修補獨立審查發現的context路徑信任問題，讀取前限制真實路徑及忽略目錄
- 驗證：7項文件與導航案例通過，含穿越和兩種symlink拒絕

### 2026-10-30

- 決策／原因／取捨：依獨立複審補齊.env前綴等忽略路徑，讓導航拒絕政策與文件掃描一致
- 驗證：導航合成拒絕測試及文件制度7項全通過

### 2026-10-30

- 決策／原因／取捨：新增共享權威登錄、Router生成與AST相依檢查，拒絕重複實體權威及runtime loader，沿用既有檢查入口且限定靜態保證範圍
- 驗證：9項開發測試與context檢查通過，獨立複審修補有效；合成stdio與恢復通過

### 2026-10-30

- 決策／原因／取捨：Add a foreground private-tunnel launcher with hidden key entry and fixed profile selection; avoid repeated multiline shell setup without saving secrets or expanding permissions
- 驗證：zsh syntax passed; missing and invalid arguments exit2; noninteractive and empty interactive key exit1 before starting; fixed container synthetic suites and actual wrapper pass

### 2026-11-04

- 決策／原因／取捨：Add disposable storage compatibility, independent connection and real lock timeout rehearsal to synthetic gate
- 驗證：New rehearsal pending fixed-environment execution

### 2026-11-04

- 決策／原因／取捨：Bound storage worker response waits and fail on premature exit to avoid a hung CI rehearsal
- 驗證：Initial isolated complete synthetic gate passed; bounded-wait revision pending rerun

### 2026-11-04

- 決策／原因／取捨：Address independent review P1: previous Node driver must create first persisted file; new Store must recover its ledger, vault, cursor and existing approval
- 驗證：Prior reverse-direction, concurrency and timeout checks passed; corrected upgrade-direction rehearsal pending

### 2026-11-04

- 決策／原因／取捨：Close independent compatibility test finding with old-driver-first file creation and preserved approval verification
- 驗證：Corrected arm64 and x64 targeted storage rehearsals exited 0; independent re-review found no new concrete defects

### 2026-11-05

- 決策／原因／取捨：Support owner-approved readonly .env storage with strict non-executing parsing and profile isolation
- 驗證：zsh syntax and disposable launcher refusal/loading tests passed; complete check pending

### 2026-11-05

- 決策／原因／取捨：Record tested readonly local-key loading and refusal boundaries
- 驗證：macOS zsh syntax and fake-client suite pass; fixed Node full check (89 product,9 docs) and offline synthetic suites pass

### 2026-11-05

- 決策／原因／取捨：Add one-command foreground service and Tunnel supervisor with private header helper
- 驗證：Existing launcher synthetic test and shell syntax passed; new path pending

### 2026-11-05

- 決策／原因／取捨：Add launcher synthetic fixture covering failed client cleanup and private header references
- 驗證：Launcher fixture execution in progress

### 2026-11-05

- 決策／原因／取捨：Locate synthetic quick-start test and record passing cleanup and credential checks
- 驗證：Two macOS launcher fixtures passed; no real credentials used

### 2026-11-05

- 決策／原因／取捨：Fix independent review: reject unsafe private directory chains and clean interrupted Compose startup; align shared launcher contract
- 驗證：macOS synthetic launcher tests exercise unsafe permissions, symlink parents, interrupted Compose and failed Tunnel cleanup

### 2026-11-05

- 決策／原因／取捨：Fix zsh decimal-leading-zero permission mask using explicit base eight; exercise successful shared launcher path and document CLI fallback
- 驗證：macOS launcher fixtures pass including mode-700 directory chain reaching fake client; actual first startup cleaned service after permission refusal

### 2026-11-05

- 決策／原因／取捨：Add explicit group-write credential refusal regression for corrected base-eight shell mask
- 驗證：Two macOS launcher fixtures passed; actual shared service and Tunnel ready; real Google four-tool dual-client acceptance passed

### 2026-11-05

- 決策／原因／取捨：Add check-container for a hardened synthetic start with tool discovery using only Node built-ins
- 驗證：locally: shell syntax, 2 launcher tests, compose config, image build with full check, hardened synthetic start; not yet run on GitHub

### 2026-11-05

- 決策／原因／取捨：Move host-run and host-trusted files out of the writable container mount (D044), because review F1 showed a compromised container could replace the tunnel client that macOS runs with the Tunnel key.
- 驗證：Launcher tests 3/3 with new refusal and mount cases on host; real container listed /data without tools or tunnel; real client --version ran from .host; real tunnel not started.

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：The compatibility check looks up the key digest, since the ledger no longer stores raw keys.
- 驗證：npm run test:synthetic in the build image.

### 2026-11-05

- 決策／原因／取捨：Make the operation key migration idempotent, because a logical restore loses user_version and double hashing would defeat replay protection; synthetic recovery check now uses key digests.
- 驗證：tests/storage-key-digest.test.ts; npm run test:synthetic in the build image; full check.

### 2026-11-05

- 決策／原因／取捨：Cover a client file downloaded while the setup prompt waits.
- 驗證：Launcher tests.

### 2026-11-05

- 決策／原因／取捨：Fix final review findings (D049): consent always needs the owner code, cookie scoped to approvals, truthful disconnect reporting with lock before revoke and a timeout, replay protection documented as per connection, refuse unmountable paths, drop Dependabot version PRs.
- 驗證：Full image check, test:synthetic, launcher tests; new disconnect cases. Not re-reviewed.

### 2026-11-05

- 決策／原因／取捨：Re-record fingerprints without the Python cache produced by the launcher test.
- 驗證：Docs check.

<!-- component-snapshot
{
  "scripts/check-components.mjs": "6ff190f454b12bf1406e6a5ac11b1ebe02f11031272438f5146f86231ccb1bcf",
  "scripts/check-components.test.mjs": "969899dfc6359e4c7dc7d50aa6be33f2303d2436963fdd621d52de6fd003ad47",
  "scripts/check-container.mjs": "f856576fd88e86559b2d451d5330a8501db36941255484a48dbc8380b35d8c7e",
  "scripts/check-context.mjs": "00dfa6b2331018e30c878a8da484cd3eb1b35df2fa686b06e6de249e59e853bb",
  "scripts/check-context.test.mjs": "2cf668cf3f7f4d58a3a5a2cb4dc0bcf189458c89adf4b138821b3400b2923bbc",
  "scripts/check-demo-stdio.mjs": "685893a4bc43431d0e0f639db2e018247763f1ad6db6ea62e66bb208d3165585",
  "scripts/check-google-stdio.mjs": "c13adf42abddff112d5beab82f2b8fe94bccb3056b0a248a50a716dcd3168624",
  "scripts/check-recovery.mjs": "eebfc8d3d25386aaa7bcde0e9549aada25b8fb892aa27659ae5d4e8c27717edc",
  "scripts/check-storage.mjs": "68b22883ae6833282ca85cc6ef8a18ed6dec6d963d96059464b4c0dbdafc346f",
  "scripts/component-context.mjs": "d804f4dac26b846a17b39e2dcae327b996c324389844e91b0a06f44c14d2b0fb",
  "scripts/component-context.test.mjs": "bd36d950d9ffce3be10523fef0391ca52dc1b6521b5ee1b89b9a3778cc78d0e9",
  "scripts/context-model.mjs": "478ad98bf7b8df747a1ae44a9dc3aa54b6805433ef2cb097bc9cfe120cd0f8c8",
  "scripts/private-stack.py": "3e285f5096b6648397c74909c2dd81a7f9d078f13811d1ac586e3741f5e228dd",
  "scripts/private-stack.test.mjs": "56a1ff3cfe769fdcf99c625133f55d20c45e50ce7b51675bcae30e47cf68107e",
  "scripts/setup-helper.mjs": "b721838b12259f80d2e5f8332fe31a6caa9c7422fbe99200b438b386468320a5",
  "scripts/setup.test.mjs": "aae7d879b360cb1b13c93b60117272e079d10197fb1ee25b4f50756bd998bd18",
  "scripts/start-private-tunnel.test.mjs": "34be6062d43303c33cab0ae21d8b418fdc7b3554958453db6151ea0168dc0f35",
  "scripts/start-private-tunnel.zsh": "228719e49fb4c612405afc7e35decaccb3af3918fd71707e7817e616a32dd1a4",
  "scripts/SPEC.md": "2aac60ee40aa699165f6c0818f32892754a63b8895116f8848f2bb5e9332a495"
}
-->
