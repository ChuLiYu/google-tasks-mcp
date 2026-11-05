# 本機容器驗收（containers）

上層：[專案規格](../SPEC.md)。依賴：[應用入口](../src/SPEC.md)、[測試](../tests/SPEC.md)、[發布規劃](../docs/RELEASE_PLAN.md)。根層 [.dockerignore](../.dockerignore) 管理建置來源邊界。

## 職責與邊界

將合成資料版本包成 OrbStack 本機容器；不發布 image、不設定公開網域、demo Compose 不掛載 Google 憑證。另提供已獲授權的單一擁有人 Google stdio wrapper，僅供私人唯讀測試，不開放真實寫入。

## 契約與不變條件

Private Google Compose is separate from synthetic demo Compose. It uses the existing authorized .data bind mount, which holds only what the service needs (host-only files live in the unmounted `.host/`, D044), pinned runtime, loopback host networking, read-only filesystem and no restart policy. The Mac launcher supervises the existing macOS Secure MCP Tunnel binary; the Tunnel is not a container sidecar. No additional downloads occur during quick start.

- build 階段必須執行 npm run check；runtime 僅裝 production dependencies，以 node 使用者執行。
- OrbStack 專用 host network 配合程式既有 127.0.0.1 綁定及 Host／Origin guard；Mac 使用 localhost:3001，沒有 ports mapping。不使用 orb.local 網域繞過 guard。
- host network 與同 host 容器共享網路，不能作為不可信程式隔離；不聲稱通用 Docker Desktop 或公開部署已驗證。
- 專用 named volume 保存合成資料與冪等紀錄，不掛載宿主 .data；root filesystem 唯讀，移除 capabilities，禁止權限提升。
- 單一服務 instance；restart=no，正常停止保留 volume。不得自動刪除鎖檔、uncertain 或操作紀錄。
- Node 24.22.1-bookworm-slim 與 sha256 digest 固定於 build／runtime；升級時同步版本並重新完整驗證，記錄依賴／漏洞／時區診斷。

Google wrapper 以 -i（無 TTY）連接 stdin/stdout；固定容器名拒絕重複啟動，--pull never 避免隱式下載。只掛載既有 .data 供 vault／cursor 使用，無 host network、無公開 listener。此掛載例外只適用已授權的 Google 測試，demo Compose 仍用獨立 volume。

計畫與回復見 [私人 ChatGPT 串接](../docs/CHATGPT_CONNECTION.md)；協定驗證入口見 [scripts](../scripts/SPEC.md)。

The owner-run `google-connect.sh` uses the same local runtime image for initial authorization or reconnection. It requires an interactive terminal, accepts only the optional `--write-test` argument, and otherwise invokes the default read-only OAuth flow. It uses the `private-http` image. OrbStack host networking makes the application's loopback-only callback reachable from the Mac browser; it does not change the application's bind address or Host/Origin checks. The owner opens the URL and chooses the dedicated test account personally. The script does not control a browser, print credential files, delete data, or start the Tunnel. Stop existing Google clients before reconnecting and restart them afterward because authorization replaces the connection identity. Its only writable mount is the existing private `.data` directory; initial setup still requires the owner's client JSON.

合成核准 demo-stdio wrapper 使用獨立 p3-demo image、固定容器名與專用持久 named volume，--network none、不掛載任何宿主資料／Google憑證、不開 port、不接受參數；同時第二個程序拒絕。資料與防重紀錄保留於專用 volume，停止不刪除。此入口是本機待審閱候選，不能默默取代既有私人唯讀 Tunnel。

## 檔案與定位

- [google-compose.yaml](google-compose.yaml)：writes stay off unless `.host/runtime.env` sets `TASKS_REAL_WRITES=1`, which `setup.sh` writes from the user's choice (D046). Direct writes per D041.
- [claude-desktop-stdio.sh](claude-desktop-stdio.sh)：Claude Desktop 的 stdio 入口，加入執行中的服務容器，不攜帶憑證。

- [demo-stdio.sh](demo-stdio.sh)：無網路、專用持久合成資料的 stdio 核准原型。
- [google-stdio.sh](google-stdio.sh)：固定 OrbStack／image、拒絕參數、不開 HTTP port 的 Google 唯讀 stdio 入口。
- [google-connect.sh](google-connect.sh)：由擁有人在互動終端執行的唯讀 OAuth 登入／重新連線入口。
- [Dockerfile](Dockerfile)：多階段建置與非 root runtime。
- [compose.yaml](compose.yaml)：本機網路、持久化、health 與資源權限。

操作見 [使用者指南](../docs/USER_TESTING.md)；放行條件見 [上線計畫](../docs/RELEASE_PLAN.md)。使用此元件：[根索引](../SPEC.md)、[設計文件](../docs/SPEC.md)。

## 驗證

先 `docker --context orbstack compose -f containers/compose.yaml config --quiet`，再依上線計畫執行 build、health、MCP、持久化、停啟及拒絕路徑。沒有引擎或 image pull 失敗時，只能記錄未完成，不能宣稱容器驗收通過。

## 修改決策紀錄

2026-10-27：使用者提出 OrbStack 測試並要求強化至上線規劃；採本機合成資料容器，不改現有 HTTP 綁定位址。接受 OrbStack host network 的本機網路共享，以避免增加通用公開監聽設定。後續實際證據追加於此。

### 2026-10-27

- 決策／原因／取捨：加入 OrbStack 合成資料容器打包與 G0–G6 放行規劃，保留 loopback、獨立資料與真實寫入拒絕；補齊依賴、雙向索引、驗收與回復操作。
- 驗證：Docker 29.8.2 與 Compose config exit 0；容器 build／runtime 尚待實測，真實帳號與部署未執行。

### 2026-10-27

- 決策／原因／取捨：追加 OrbStack 實際驗證證據；維持人工核准與 crash 驗收為未完成，避免將基本啟動誤報為完整上線驗收。
- 驗證：Linux Node 24 完整 check 通過；health、七工具列舉、四個唯讀 MCP、Host/Origin 拒絕及待核准提案重啟保存通過。

### 2026-10-27

- 決策／原因／取捨：將已測 Node 24.22.1 基底鎖版本與 digest，並納入精確安裝設定
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-27

- 決策／原因／取捨：固定 digest 重建完成，追加實測並保留 SQLite 正式穩定性阻擋與人工驗收限制
- 驗證：Node 24.22.1/npm 11.19.1 完整 check、healthy、MCP 七工具與三頁搜尋、403 拒絕、提案保存通過

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-28

- 決策／原因／取捨：準備無網路與獨立持久volume的合成核准容器入口，保留既有唯讀Tunnel並以隨機操作鍵支援重複演練
- 驗證：宿主78產品及6文件check通過，固定容器78產品通過；新wrapper待完整容器smoke

### 2026-10-28

- 決策／原因／取捨：補記固定版本容器與持久合成資料重跑證據，保留外部核准及真實寫入界線
- 驗證：Node24.22.1及npm11.19.1容器完整check通過78產品與6文件；stdio與恢復演練通過；實際runtime wrapper連續兩次smoke exit0，未測真人ChatGPT核准

### 2026-11-05

- 決策／原因／取捨：Add an owner-run OrbStack read-only OAuth reconnection wrapper; reuse the existing local image and callback guards without browser automation or write-scope arguments.
- 驗證：Shell syntax passed; write-test argument and non-interactive invocations refused before Docker. Runtime prompt smoke and full check pending.

### 2026-11-05

- 決策／原因／取捨：Record owner-run reconnect wrapper validation; retain the existing local image and require the owner to complete Google consent.
- 驗證：Actual OrbStack wrapper displayed read-only CONNECT prompt; CANCEL exited 0 without starting OAuth. Syntax and argument/non-TTY rejection passed. Fixed Node 24.22.1 build ran npm run check successfully: 89 product tests, 9 tooling tests, typecheck, build and 14-component checks. Callback completion remains untested.

### 2026-11-05

- 決策／原因／取捨：Add separate private Google HTTP Compose without changing synthetic deployment
- 驗證：Compose and pinned build pending

### 2026-11-05

- 決策／原因／取捨：Enable writes in compose, add Desktop entry, allow explicit --write-test in connect wrapper using the current image (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Compose now means direct writes under D041
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Move host-run and host-trusted files out of the writable container mount (D044), because review F1 showed a compromised container could replace the tunnel client that macOS runs with the Tunnel key.
- 驗證：Launcher tests 3/3 with new refusal and mount cases on host; real container listed /data without tools or tunnel; real client --version ran from .host; real tunnel not started.

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

<!-- component-snapshot
{
  "containers/Dockerfile": "574f22221854049f0d87af422847c72bd675d9ff2ab31f723799a55f3382f2fc",
  "containers/claude-desktop-stdio.sh": "c64c37daeb0ab4ace910ce0f5ccc6ad45bbbaad615006e91b3c27fc6b3577538",
  "containers/compose.yaml": "2e1e53250ad1c7d5a6577bc29155eb9a2010725be9116376ec1ecab2f95de582",
  "containers/demo-stdio.sh": "b45eff2cf25c316ce384a6738a3b2daa0b364f9ba2933008197137ed4bf9f8a7",
  "containers/google-compose.yaml": "c78a5a3fc78d564d908c9428e0c0ba9ffa0ca74e2abd5771c401f1de84b5118c",
  "containers/google-connect.sh": "412e1fa4b0a81bdab8aeec15e1e254dab7e73e9b18f3fb3d8176c5458a9be7ba",
  "containers/google-stdio.sh": "4fac38aa46fcd7d03db864f69fbb3d5c4839c8ff2d0e947b27ed0a74cc1a975a",
  "containers/SPEC.md": "d730bba0eb27bab575087152593e3543bdcfd17cdb5a799807bc4e425ed09c19"
}
-->
