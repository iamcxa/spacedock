---
id: 016
title: Dashboard Gate Approval — UI 上的階段審批與 PR-style Review
status: explore
source: /build brainstorming
started:
completed:
verdict:
score: 0.95
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 011 completed (collaborative review, inline comments & suggestions)
- Feature 015 (war room identity — conceptual foundation)

## Brainstorming Spec

APPROACH:     將 workflow gate approval 從 Claude Code CLI 搬到 dashboard UI。Captain 可以在 UI 上打開 plan/pr-review 等 gate stage 的 detail，像 PR review 一樣瀏覽完整內容，然後直接在 UI 上 Approve / Request Changes。Request Changes 走已有的 comment pattern（011），Approve 透過 channel 發送 gate decision 給 FO。UI 顯示 gate 狀態（pending review / approved / changes requested）。
ALTERNATIVE:  僅在 CLI 中做 gate approval，dashboard 只顯示狀態（rejected: 限制了非 CLI 用戶的參與能力，也無法支援後續多人協作分享場景）
GUARDRAILS:   Gate decision 必須經過明確的人類操作（點擊 button），不能因 UI bug 意外 approve。必須與 CLI approval 共存 — 兩邊都能操作，先到先得。必須處理 race condition（CLI 和 UI 同時 approve）。Gate state 以 FO 的 frontmatter 為 source of truth。
RATIONALE:    核心 UX 突破 — 讓非 CLI 用戶也能參與工作流決策，是戰情室從「觀看」到「操作」的關鍵跨越。結合 011 的 comment pattern，形成完整的 review → comment → approve 工作流。

## Acceptance Criteria

- Gate stage entity 在 UI 上顯示 "Pending Review" 狀態標記
- 可在 UI 上瀏覽 gate stage 的完整 stage report
- Approve button 發送 gate decision 到 FO（via channel）
- Request Changes button 觸發 comment flow（複用 011 pattern）
- CLI 和 UI 的 gate approval 共存，先到先得
- Gate 狀態即時更新（WebSocket push）
- 不會因 UI bug 意外觸發 approve（需確認步驟）
