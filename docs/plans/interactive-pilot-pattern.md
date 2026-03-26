---
id: 019
title: Design a pattern for pilots that interact directly with the captain
status: ideation
source: testflight-005
started: 2026-03-24T00:00:00Z
completed:
verdict:
score: 0.50
worktree:
---

CL can talk directly to team ensigns — they're all teammates in the same team. The actual problem is that the first officer has no awareness or internal state for when CL is in direct conversation with an ensign.

Observed patterns:
- CL says "I will discuss with the ensign in the ready room" to signal direct communication, but the first officer has no explicit knowledge of what that means
- An ensign sends many clarification requests, and CL wants to cut out the relay and talk to it directly
- CL starts talking to an ensign directly, and the first officer doesn't know whether to wait, continue dispatching other work, or what

The core question: what workflow and state-keeping makes sense when CL is in direct communication with an ensign? How does the first officer know this is happening, what does it do while it's happening, and how does it know when to resume normal operations?
