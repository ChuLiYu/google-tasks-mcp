# 官方文件核對與技術限制

核對日期：2026-10-27。以下將官方能力、文件推論、產品選擇分開。所有連結已讀取，除明確標示未取得的內容。來源會更新，進入相應階段前須重核。

## Google Tasks

| 項目 | 核對結果 | 設計影響 | 來源 |
|---|---|---|---|
| 日期與 deadline | `due` 只記錄日期，設定時捨棄時間；官方明確說不是 deadline，不能讀寫 scheduled time | 公開欄位命名 taskDate；拒絕任意時間，不宣稱定時提醒 | G1 |
| 欄位 | title 上限 1024、notes 上限 8192 characters；狀態 needsAction／completed | Zod 長度及狀態驗證；Unicode 邊界需測試 | G1 |
| 循環、提醒、硬性截止 | 已核對的 Task schema 沒有可寫 recurrence、reminder 或獨立 deadline 欄位 | 推論：這些功能不受目前公開 schema 支援；不可用 UI 能力推定 API 能力 | G1 |
| 排序／階層 | position、parent 為唯讀；排序使用 move；insert 可帶 parent／previous | v0.1 不暴露排序與子任務建立，不直接寫 position | G1、G3 |
| 任務分頁 | maxResults 預設 20、最大 100；nextPageToken 續頁 | 不可只讀第一頁 | G2 |
| 完成／隱藏／指派 | 第一方客戶端完成的任務需 showCompleted 與 showHidden；assigned 預設不回傳 | 明確設定 flags；v0.1 不寫 assigned tasks | G2 |
| 搜尋 | list 參數沒有文字 q/search | 伺服器讀頁後做字串比對；不得稱為 Google 原生全文搜尋 | G2 |
| 清單 | 清單也有分頁，單頁最多 1000；API 有建立、更新與刪除清單 | v0.1 僅列出，與 Google 能力區分 | G4、G5 |
| ID 與更新 | get／patch 需要清單與任務 ID，patch 支援部分更新 | 完成使用 status=completed；不以標題更新 | G6、G7 |
| 新增冪等 | insert 文件沒有 requestId／idempotency key 參數，也未承諾客戶端自訂 ID 去重 | 不假設原生 exactly-once；本地持久化與 uncertain 狀態必要 | G3 |
| 權限 | 讀取可用 tasks.readonly 或 tasks；新增／更新需 tasks | 完整 MVP 只要求 tasks，不加 Calendar／Drive scopes；讀取模式可另用 readonly | G2、G3、G7 |

來源：

- G1 [Task 資源](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)
- G2 [tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)
- G3 [tasks.insert](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert)
- G4 [tasklists.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list)
- G5 [Tasklists 資源](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists)
- G6 [tasks.get](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/get)
- G7 [tasks.patch](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/patch)
- G8 [Google Web Server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)：使用授權碼、state、註冊的 redirect URI；offline access 支援 refresh token。refresh token 並非每次授權一定提供，重連時不能用缺值覆蓋既有 token。
- G9 [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)：公開服務可能須驗證，依 scope、使用方式及豁免而定。實際 Cloud Console scope 分類、測試使用者限制、token 存續期及送審需求尚待獲授權後確認，不視為已通過。

## OpenAI 與 MCP

| 項目 | 核對結果與專案選擇 | 來源 |
|---|---|---|
| Plugin 名稱與 UI | 現行官方文件使用 Plugins／Add custom MCP server；權限受 workspace 限制，未驗證使用者帳號介面 | O1、O2 |
| 傳輸與 UI | 自訂 MCP 可支援讀寫與 SSE／streaming HTTP；UI 選填。本計畫採 Streamable HTTP /mcp，不另建前端 | O1、O2、O4 |
| 工具命名 | 一般自訂 MCP 不強制 search/fetch；company knowledge 的相容要求是另一件事 | O1、O4 |
| MCP 認證 | OAuth discovery、PKCE S256、resource/audience 驗證；支援的 client registration 可含 CIMD／DCR／預設 client | O3、M1 |
| 兩層 OAuth | MCP token 必須發給本服務；禁止拿 Google bearer token 當任意 MCP token 再透傳 | M1、M2 |
| 核准 | ChatGPT 寫入預設要求確認，但可記住選擇；annotations 不能取代伺服器授權及核准 | O1、O4 |
| SDK | 官方 repo 核對時 v2 是穩定線，server／client 拆成套件；舊 @modelcontextprotocol/sdk 為 v1 線 | M3、M4 |

- O1 [Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- O2 [Plugin quickstart](https://developers.openai.com/plugins/quickstart)
- O3 [Plugin authentication](https://developers.openai.com/plugins/build/auth)
- O4 [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- M1 [MCP authorization，2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- M2 [MCP security best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- M3 [官方 TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk)
- M4 [SDK v2 文件](https://ts.sdk.modelcontextprotocol.io/v2/)
- M5 [MCP schema](https://modelcontextprotocol.io/specification/2026-07-28/schema)

不把最新協定／SDK 與 ChatGPT 的全部相容性視為已證實；第 2、4 階段須實測協商與工具呼叫。OAuth provider 是否完整支援所選註冊方式，須另作驗證。最低 scope 不代表只能操作某一清單，測試清單限制由本服務額外執行。

## 日期、時區與執行環境

- [卑詩省 2026-03-02 公告](https://archive.news.gov.bc.ca/releases/news_releases_2024-2028/2026AG0013-000209.htm) 確認 2026-03-08 春季調整後維持 UTC−7，2026-11-01 不再回撥。交接說法方向正確，但不能把 2026 全年或歷史日期一律當 UTC−7，也不能泛化到卑詩省所有地區。
- [IANA](https://www.iana.org/time-zones) 說明時區資料隨政治決策更新，核對時網站列出 2026e。未成功取得該版本 NEWS，故不斷言它是首次納入 Vancouver 新規則的版本。實作以行為測試和 runtime 的 ICU／tz 版本共同驗證。
- YYYY-MM-DD 不是 instant；寫入建議固定序列化為同日期 `T00:00:00.000Z`，這只是 Google 日期欄位的編碼，不是溫哥華午夜。回讀取日期部分，避免本地轉換造成日期偏移。這是設計建議，尚未經真實 API round trip 驗證。
- [Node 官方發行表](https://nodejs.org/en/about/previous-releases) 核對時 Node 24 為 LTS，26 仍列 Current；建議先用 Node 24 LTS，實作時鎖定仍受支援的 patch 並測 tz 行為，不硬猜「最新 LTS」。
- 已安裝並以 package-lock.json 鎖定：MCP server/client 2.4.0、node adapter 2.1.2、TypeScript 5.9、Zod 4、Vitest 4.1.12、MSW 2、Inspector 2.12.0。本機 Node 26.0.0 的 typecheck/test/build 與 Inspector CLI 已實際通過；Node 24/26 的 GitHub Actions 僅已設定，未遠端執行。

## 明確差異與尚未證實事項

1. 原文件只說 due 偏向日期；官方更明確：它不是硬性 deadline。工具與文案應使用「任務日期」。
2. 「建立剛好一次」不是 Google API 端的通用保證。服務只能對已保留的 key 防重，結果不明時犧牲自動重試，不能用相似任務猜測。
3. 寫入 annotations／模型填入 confirmed 值不是可驗證的人類核准；此機制是寫入開放前阻擋項。
4. Token storage 可依 OAuth provider 分工，但冪等狀態持久化不能列成可有可無；重啟後仍須防重。
5. 本次核對的是公開文件，沒有驗證真實帳號的 plugin 可用性、Google OAuth 專案設定、API 清除欄位語意、If-Match 條件更新或跨 plugin 實際協作。

## 工具鏈與套件核對（2026-10-27）

- [Node 24.22.1 官方發布](https://nodejs.org/en/blog/release/v24.22.1)：LTS security release，作本專案固定環境；Node 26 Current 不作支援基準。容器以已拉取的 Node 24.22.1-bookworm-slim digest 固定。
- [npm lockfile](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) 與 [TypeScript 編譯選項](https://www.typescriptlang.org/tsconfig/)：精確直接依賴＋lockfile＋npm ci 提供可重現安裝；型別不能驗證外部執行時資料。
- 透過 [npm 官方 registry](https://registry.npmjs.org/) 查詢 9 個直接套件的精確版本：MCP node 2.1.2、server/client 2.4.0、inspector 2.12.0、Zod 4.6.7、@types/node 24.19.2、MSW 2.15.0、TS 5.9.3、Vitest 4.1.12。均為非預覽發布，未標示 deprecated；不表示沒有未知缺陷或永遠適用。線上 npm audit --json 為 0 個已知漏洞（生產 7／開發 245／總計 251 個依賴）；此為當次資料庫快照，不是安全保證。
- [Node v24.22.1 SQLite 官方原始文件](https://github.com/nodejs/node/blob/v24.22.1/doc/api/sqlite.md)：Stability 1.2 Release Candidate。這是目前本機實作的明確例外，正式放行須解決，見 D025；不以 Node LTS 推導個別 API 已穩定。

## 2026-10-27 專用合成資料清理核對

官方 [tasklists.insert](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/insert) 回傳 TaskList；[tasks.delete](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/delete) 與 [tasklists.delete](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/delete) 使用 tasks scope，成功回傳空本文。清單刪除可能影響指派來源，故測試僅清理新建清單，且刪除前完整核對無額外／指派任務。核對日期 2026-10-27；適用此次已授權維護測試，不承諾條件更新或 Google 原生冪等支援。

## 私人 stdio Tunnel 補充（2026-10-27）

已讀取 [OpenAI Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)：官方支援本機 stdio 上游、主動 HTTPS、Platform 組織與 ChatGPT workspace 關聯及分開的權限控制。適用本次私人唯讀試用，不適用公開 plugin 發布；不是應用層 OAuth／逐人核准的替代品。本人帳號可用性、實際權限與 CLI 版本尚待登入確認。產品取捨與執行見 [串接計畫](CHATGPT_CONNECTION.md)。
