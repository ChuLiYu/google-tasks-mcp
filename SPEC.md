# 專案入口與元件索引（project）

下層元件：[skills](skills/SPEC.md)、[containers](containers/SPEC.md)、[src](src/SPEC.md)、[tests](tests/SPEC.md)、[scripts](scripts/SPEC.md)、[docs](docs/SPEC.md)、[workflows](.github/workflows/SPEC.md)。

## 職責與邊界

維持 v0.1 Google Tasks MCP 範圍；提供本機合成資料試用及受限制的 Google 只讀接線。此索引負責跨元件導覽、依賴設定及協作規則。

## 契約與不變條件

禁止 Calendar 寫入、刪除、背景自動化、獨立 UI 與額外 LLM。真實帳號、部署與發布須另有明確授權。身分只能來自可信 request context；寫入核准不可由模型參數宣告。

主要文件入口：[Context Router](docs/INDEX.md)。元件及權威來源／允許相依以 [components.json](components.json) 為準；本 SPEC 管理根層檔案與同步，不維護第二份手寫導航表。

更新流程：閱讀目標 SPEC → 修改程式與契約／檔案索引 → 執行相關測試 → 使用 docs:stamp 追加決策及驗證 → 執行 npm run check。只更新實際受影響的元件；上層介面或目錄關係變動才需同步上層。

標準工具鏈固定 Node 24.22.1 LTS／npm 11.19.1／TS 5.9.3；直接依賴精確版本加 lockfile，更新必須重跑 check 與容器驗證。strict 編譯及既有 Zod 契約優先於新增框架；Stable SQLite driver integration and the previous RC exception are tracked in [D025/D034 and successor](docs/DECISIONS.md); release evidence remains required.

另有明確分離的合成資料 stdio 核准原型，入口與驗證見 [src](src/SPEC.md)、[scripts](scripts/SPEC.md)。不取代私人 Google 唯讀入口，不代表 ChatGPT 已支援可信逐筆核准。

工程流程與文件入口：[docs/INDEX](docs/INDEX.md)、[獨立審查與品質門檻](docs/ENGINEERING_WORKFLOW.md)。`npm run context -- <元件 id>` 只載入指定元件目前契約與權威路徑；`--sources` 只列來源。`context:generate` 重建 Router，`context:check` 驗證 metadata、生成內容與來源相依，並由 docs:check 納入 CI；`npm run test:synthetic` 在 build 後執行無憑證程序整合與恢復演練。

The owner-approved optional local `.env` holds only the readonly Tunnel runtime key, is Git/Docker-ignored and must be owner-only; `.env.example` is a secret-free template. The launcher contract and verification live in [scripts SPEC](scripts/SPEC.md).

公開原始碼交付須排除 .data、憑證、金鑰、執行日誌與私人接線識別資訊；原始碼公開不表示正式服務或真實 MCP 寫入已放行。

## 檔案與定位

- [Start Google Tasks.command](Start%20Google%20Tasks.command): owner-only quick start for the shared local stack.

- [.dockerignore](.dockerignore)
- [.gitignore](.gitignore)
- [.nvmrc](.nvmrc)
- [.npmrc](.npmrc)
- [AGENTS.md](AGENTS.md)
- [README.md](README.md)
- [README.zh-TW.md](README.zh-TW.md)
- [setup.sh](setup.sh): guided install for a new user; writes default to off (D046).
- [LICENSE](LICENSE)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [.github/dependabot.yml](.github/dependabot.yml)
- [.github/pull_request_template.md](.github/pull_request_template.md)
- [.github/ISSUE_TEMPLATE/bug_report.yml](.github/ISSUE_TEMPLATE/bug_report.yml)
- [.github/ISSUE_TEMPLATE/install_report.yml](.github/ISSUE_TEMPLATE/install_report.yml)
- [.github/ISSUE_TEMPLATE/feature_request.yml](.github/ISSUE_TEMPLATE/feature_request.yml)
- [.github/ISSUE_TEMPLATE/config.yml](.github/ISSUE_TEMPLATE/config.yml)
- [components.json](components.json)
- [package-lock.json](package-lock.json)
- [package.json](package.json)
- [tsconfig.json](tsconfig.json)
- [vitest.config.ts](vitest.config.ts)

## 驗證

`npm run check`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：新增按需求定位元件的根索引、登錄表與強制檢查入口，保留安全規則；以局部閱讀取代每次全文搜尋。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：加入 OrbStack 合成資料容器打包與 G0–G6 放行規劃，保留 loopback、獨立資料與真實寫入拒絕；補齊依賴、雙向索引、驗收與回復操作。
- 驗證：Docker 29.8.2 與 Compose config exit 0；容器 build／runtime 尚待實測，真實帳號與部署未執行。

### 2026-10-27

- 決策／原因／取捨：固定穩定工具鏈及直接依賴，收緊編譯並記錄簡單契約與版本升級規則
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-30

- 決策／原因／取捨：採用按元件context入口及獨立合成品質門檻，沿用既有規格不新增工具框架
- 驗證：context service與build及兩協定合成演練通過，完整check待執行

### 2026-10-30

- 決策／原因／取捨：獨立複審後將context安全拒絕測試納入docs:test，避免導航命令越界讀取
- 驗證：7項文件與導航測試通過，CI YAML結構斷言通過

### 2026-10-30

- 決策／原因／取捨：依使用者授權準備公開原始碼，排除秘密與本機設定並區分公開儲存庫和正式服務
- 驗證：公開候選來源已盤點；完整check與Git索引安全掃描待執行

### 2026-10-30

- 決策／原因／取捨：依D033統一Router與權威登錄並整合SSOT原則，保留既有安全規則及固定工具鏈，不改產品行為
- 驗證：9項開發檢查、79產品測試、型別及build、兩協定合成與恢復通過；完整check待最終同步；本輪固定容器及遠端CI未執行

### 2026-11-04

- 決策／原因／取捨：Pin stable SQLite runtime and declaration dependencies, retain lockfile and script-free installation
- 驗證：Isolated dependency resolution passed; clean installation and full checks pending

### 2026-11-04

- 決策／原因／取捨：Record script-free stable driver integration verified against pinned toolchain on Linux arm64 and x64
- 驗證：Clean full checks passed on both Linux targets; native macOS and remote GitHub CI not run

### 2026-11-05

- 決策／原因／取捨：Document owner-approved secret-free environment template and ignored local key file
- 驗證：Existing Git/Docker exclusions inspected; complete check pending

### 2026-11-05

- 決策／原因／取捨：Add double-click owner quick start entrypoint
- 驗證：Syntax passed; runtime pending

### 2026-11-05

- 決策／原因／取捨：Include quick-start entrypoint in checked build context
- 驗證：Build context link failure corrected

### 2026-11-05

- 決策／原因／取捨：Expose the owner quick-start entry and distinguish reported ChatGPT acceptance from actual local Google SDK evidence
- 驗證：Shared startup and stop succeeded; dedicated Google dual-client four-tool reads passed; current conversation reload pending

### 2026-11-05

- 決策／原因／取捨：Record the D039 approval page as the only exception to the no-separate-UI rule in AGENTS; other safety rules unchanged
- 驗證：documentation rule change; full check runs in the pinned image build

### 2026-11-05

- 決策／原因／取捨：Change AGENTS write rule to the owner-approved authorization mechanism in D041; model parameters remain non-authorization
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Add test:launchers and test:container npm scripts
- 驗證：locally: shell syntax, 2 launcher tests, compose config, image build with full check, hardened synthetic start; not yet run on GitHub

### 2026-11-05

- 決策／原因／取捨：Rewrite README status and add the Calendar and Tasks strategy; register skills component; correct outdated statements that real writes are disabled
- 驗證：Pinned image check; skill format test only, not yet run in a real Claude conversation

### 2026-11-05

- 決策／原因／取捨：Allow skills through the Docker build context so the full check can read them
- 驗證：Pinned image build reruns the full check

### 2026-11-05

- 決策／原因／取捨：README no longer describes the repository as public (D043)
- 驗證：gh reports private; anonymous web, API and raw requests return 404; git and API access for the owner work; gitleaks 8.30.1 run over all refs

### 2026-11-05

- 決策／原因／取捨：Make README.md English as the authority, per owner instruction that main docs are English with a zh-TW version for high-level content only. Other existing docs stay as they are; no bulk translation. Status text now reflects the completed Claude Web conversation.
- 驗證：Docs check run below; translation meaning reviewed by the author only.

### 2026-11-05

- 決策／原因／取捨：Add README.zh-TW.md as a derived full translation of the English README, and allow it in the image build context. It creates no rules.
- 驗證：Full check run in the pinned image.

### 2026-11-05

- 決策／原因／取捨：Record the reviewed source commit in the zh-TW README header.
- 驗證：Docs check passed; semantic match reviewed by the author only.

### 2026-11-05

- 決策／原因／取捨：Move host-run and host-trusted files out of the writable container mount (D044), because review F1 showed a compromised container could replace the tunnel client that macOS runs with the Tunnel key.
- 驗證：Launcher tests 3/3 with new refusal and mount cases on host; real container listed /data without tools or tunnel; real client --version ran from .host; real tunnel not started.

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Record reviewed source commit in the zh-TW README.
- 驗證：Docs check.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Update reviewed source commit in the zh-TW README.
- 驗證：Docs check.

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Look for the downloaded client file when the user presses Enter, found during the first real install: the file is usually downloaded while the prompt waits.
- 驗證：Launcher tests with a new case.

### 2026-11-05

- 決策／原因／取捨：Warn that the client secret may not be downloadable later, seen on the Google console during the first real install.
- 驗證：Launcher tests.

### 2026-11-05

- 決策／原因／取捨：Remove the dated owner authorization from the public AGENTS.md (D048).
- 驗證：Full image check on this tree.

<!-- component-snapshot
{
  ".dockerignore": "7dea5a0c1797efc24cf53c4b6352cb7d9c10d472c6d1db0843ba3b15250c9f93",
  ".github/ISSUE_TEMPLATE/bug_report.yml": "97b95341e6cab75da75b013864a62b5ba4a4e8ef30d71ce5614ba4370fb3895c",
  ".github/ISSUE_TEMPLATE/config.yml": "5d391499ab14b8965dc246918cd830923e400a7793c89b054eff0298e4a9c6ee",
  ".github/ISSUE_TEMPLATE/feature_request.yml": "ed3c2348718aa0be38b01096a04bfa86abd237cf8a8a627a43ebe6e51f192e0f",
  ".github/ISSUE_TEMPLATE/install_report.yml": "de113b1014d023815b510d4ff5e88efea367c8e4ad6ac53f46a53c9e07b64968",
  ".github/dependabot.yml": "e6714156ceca913ca03c2235c80c76c735ebc9312279ad69ffb86457efd7670c",
  ".github/pull_request_template.md": "1046e7a7143d9e9c9547bd6cbfb481c7a61ae0eb634a329501a67a87520b68d0",
  ".gitignore": "1f698a2bf260c3b90923a4e123754505338f105da87d13e9a34ac552509eef59",
  ".npmrc": "be85cc462e740587626bbcbb1c3ed1c40b26e62ec072e8cbd2768f23915c28e6",
  ".nvmrc": "d9f318747a126ce2247661af67852b185def7789492eabfad7bba322be087c33",
  "AGENTS.md": "fd6589f9b6663eeab8252cfbe915faf296422a49d51e1e33a428c0b7fe726f65",
  "CODE_OF_CONDUCT.md": "8629ac2fb2c9862f83d5332378392c6e2f62b2295daebeb3e4f6883227b747f2",
  "CONTRIBUTING.md": "47f274c27d0e925cb89548443ad088c5ac8269da1bfee5f4f0ca43af754124f0",
  "LICENSE": "68719bdff787d37f6c8ca053b43304d1f6c4f8b893f9bfa8fff66c4357827a79",
  "README.md": "7c953579354ed3f5cb13f7a8fe9dd29617658cf1416a736a9b8ca084241c18f4",
  "README.zh-TW.md": "0e441d086b8a21621fadd6288f10c2be383e7f1e376ff4ec3ac71acff258c22b",
  "SECURITY.md": "c30c99054d3e51d1a0fd901d627b11e90d1bfc8897bf6654634e6f8d3d6ff830",
  "Start Google Tasks.command": "34c1d575504355b018cb7ec9973cfd307fa4ccdee1df4ebf5463c5a319265167",
  "components.json": "e96d0fa66d84f2a57d9e825f8da8160c7d8cd0cde10310e67a427a83f1ff9872",
  "package-lock.json": "48f35e9b55601a5e2f78d716e83c8a9772edc944a50e4563428f4182b7cffd14",
  "package.json": "3d86b84d5628753abb7d15daf6a3d2c590087773a7832a55ae1f2abfd468b257",
  "setup.sh": "300a5d160abd469451e519bdcef2758c15a9487b20a5a986d01352d8305cfbfb",
  "tsconfig.json": "4ef2657319d7990ea442439c820b9a315a7741eeb57701bdf1b88d7ac5fb8296",
  "vitest.config.ts": "430ca3bbd088e694cc4564030645100fe55f65f86dcc121dce06842201b3b5c0",
  "SPEC.md": "9e88fbbe237b273dc0269ae2a33b22c7cf2badfc42b8370c04aece3fb8dcbf22"
}
-->
