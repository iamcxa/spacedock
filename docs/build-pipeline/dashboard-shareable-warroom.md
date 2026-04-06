---
id: 017
title: Dashboard Shareable War Room — 戰情室分享與多人協作審批
status: explore
source: /build brainstorming
started: 2026-04-06T07:30:00Z
completed:
verdict:
score: 0.9
worktree: .worktrees/spacedock-ensign-dashboard-shareable-warroom
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 015 (war room identity)
- Feature 016 (gate approval — required for shared review/approve flow)

## Brainstorming Spec

APPROACH:     整合 ngrok（或 Cloudflare Tunnel 等免費替代方案）讓戰情室可以產生公開 URL 分享給同事。每次分享可限定特定 phase/entity，並設置獨立密碼。同事 A 收到 plan phase 的連結 + 密碼，review 後 approve；同事 B 收到 execute phase 的連結 + 不同密碼。密碼驗證在 server 端，per-share scope 控制可見範圍。
ALTERNATIVE:  Screen share 或截圖分享（rejected: 沒有互動能力，同事無法直接 comment 或 approve，也無法非同步 review）。VPN/內網方案（rejected: 設定門檻高，不適合跨團隊快速分享）
GUARDRAILS:   密碼必須 server-side 驗證，不能只靠前端。Share link 必須有過期時間（預設 24h）。分享範圍嚴格限定 — per-phase scope 不能看到其他 phase 的內容。ngrok 掉線時要有重連機制或友善錯誤提示。必須考慮 ngrok 免費方案的限制（連線數、頻寬、session 時長）。
RATIONALE:    把 AI-human 協作從單人擴展到團隊 — 讓領域專家參與對應階段的 review，是戰情室概念的完整實現。Plan 階段讓架構師 review，E2E 階段讓 QA review，PR 階段讓 tech lead review — 每個人只看到自己該看的部分。

## Acceptance Criteria

- 可從 UI 產生 share link（指定 entity + phase + 密碼）
- Share link 透過 ngrok/tunnel 可從外部存取
- 密碼驗證在 server 端，錯誤密碼無法存取
- 分享範圍限定（只能看到指定 phase 的內容）
- 分享頁面支援 comment 和 approve 操作（複用 016 pattern）
- Share link 有過期時間（預設 24h，可設定）
- 每個 share 可以有不同密碼
- ngrok 斷線時顯示友善提示
