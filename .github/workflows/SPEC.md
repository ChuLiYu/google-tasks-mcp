# 持續整合（workflows）

上層：[project 規格](../../SPEC.md)。

## 職責與邊界

GitHub Actions 安裝依賴，執行 npm run check，再強制執行 npm run test:synthetic，涵蓋兩種 stdio 核准協定與故障恢復。另有 `launchers`（macOS：殼層語法與啟動腳本測試）與 `container`（compose 驗證、建置執行映像、以強化參數啟動合成服務並列舉工具）。

This is CI only: nothing here deploys or publishes. The project runs on each owner's computer (D036), and real Google, Claude and ChatGPT acceptance stays manual because automated tests use synthetic data and no real secrets. A passing run proves neither.

## 契約與不變條件

Node 24.22.1 固定單一支援版本；npm ci --ignore-scripts 使用鎖檔；不注入真實 Google secrets。文件檢查失敗必須使 check 及 CI 失敗。當地驗證不等於 GitHub CI 已執行。

CI 固定 npm 11.19.1、使用 .nvmrc 的 Node；15 分鐘 timeout、同分支取消過時執行、checkout 不保留憑證。無真實秘密與部署步驟。遠端 branch protection 需另設定，不由檔案自動生效。相關流程：[工程流程](../../docs/ENGINEERING_WORKFLOW.md)、[合成演練](../../scripts/SPEC.md)。

既有 check 入口包含 context:check：驗證權威引用、Router 生成一致性及 src 允許相依；docs:test 包含合成拒絕案例。主要檢查沿用同一 job，新增 job 只放 Linux check 跑不到的項目；來源 metadata 或文件漂移必須使 CI 失敗，語意仍需獨立審查。本輪修改尚未推送，不能沿用基線遠端成功當成本輪 CI 證據。

## 檔案與定位

- [.github/workflows/ci.yml](ci.yml)

## 驗證

`npm run check；GitHub CI 尚未遠端執行`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：建立 CI 元件規格並記錄既有 npm run check 入口；沿用 Node 24／26 矩陣即可強制新增文件檢查。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：CI 對齊唯一支援的 Node 24.22.1，依鎖檔且不執行安裝腳本
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-30

- 決策／原因／取捨：將合成stdio與恢復納入CI並固定npm，限制憑證保存與執行時間
- 驗證：本地test:synthetic通過，GitHub遠端未執行

### 2026-10-30

- 決策／原因／取捨：記錄既有check承接SSOT來源、生成與相依檢查，維持同一CI job及無真實秘密界線
- 驗證：本地9開發與79產品案例通過；本輪遠端CI未執行

### 2026-11-05

- 決策／原因／取捨：Add macOS launcher and container jobs at the owner's request to automate existing tests; CI only, since real acceptance needs real accounts and the product has no hosted deployment
- 驗證：locally: shell syntax, 2 launcher tests, compose config, image build with full check, hardened synthetic start; not yet run on GitHub

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

<!-- component-snapshot
{
  ".github/workflows/ci.yml": "6e5e1a13456d299047c18faf818689cd4003f1cdec3d3f9090bbf12d79fa0ada",
  ".github/workflows/SPEC.md": "29969b7af4dda2addb468c8abfd90fd62372103f5066d06f387f060fd77e149d"
}
-->
