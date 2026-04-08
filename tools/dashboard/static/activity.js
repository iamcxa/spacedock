(function () {
  "use strict";

  var feedContainer = document.getElementById("activity-feed");
  var statusIndicator = document.getElementById("ws-status");
  var channelIndicator = document.getElementById("channel-status");
  var inputEl = document.getElementById("channel-input");
  var sendBtn = document.getElementById("channel-send-btn");
  var lastSeq = 0;
  var ws = null;
  var retryCount = 0;
  var maxRetries = 10;
  var baseDelay = 500;
  var maxDelay = 30000;
  var channelConnected = false;

  // ABOUTME: Browser-side mirror of src/permission-tracker.ts (canonical, unit-tested source).
  // Tracks pending permission requests and infers resolution via the
  // "conversation-continues" heuristic: any non-permission_request event with
  // a higher seq resolves all currently-pending requests. 30s timeout fallback
  // via tick(). Keep in sync with permission-tracker.ts; divergence is a bug.
  var PERM_TIMEOUT_MS = 30000;

  var permissionTracker = (function () {
    var pending = {};  // request_id → { seq, timestamp_ms }

    function track(event) {
      if (event.type === "permission_request" && event.request_id) {
        pending[event.request_id] = { seq: event.seq, timestamp_ms: event.timestamp_ms };
        return [];
      }
      var resolved = [];
      for (var id in pending) {
        if (pending.hasOwnProperty(id) && pending[id].seq < event.seq) {
          resolved.push(id);
        }
      }
      for (var i = 0; i < resolved.length; i++) {
        delete pending[resolved[i]];
      }
      return resolved;
    }

    function tick(now_ms) {
      var expired = [];
      for (var id in pending) {
        if (pending.hasOwnProperty(id) && now_ms - pending[id].timestamp_ms >= PERM_TIMEOUT_MS) {
          expired.push(id);
        }
      }
      for (var i = 0; i < expired.length; i++) {
        delete pending[expired[i]];
      }
      return expired;
    }

    function resolve(request_id) {
      delete pending[request_id];
    }

    return { track: track, tick: tick, resolve: resolve };
  })();

  function buildTrackedEvent(entry, timestampMs) {
    var requestId;
    if (entry.event.type === "permission_request") {
      try { requestId = JSON.parse(entry.event.detail || "{}").request_id; } catch (e) { /* ignore */ }
    }
    return {
      type: entry.event.type,
      seq: entry.seq,
      request_id: requestId || undefined,
      timestamp_ms: timestampMs,
    };
  }

  function getWsUrl() {
    var loc = window.location;
    var proto = loc.protocol === "https:" ? "wss:" : "ws:";
    return proto + "//" + loc.host + "/ws/activity";
  }

  function setStatus(state) {
    if (!statusIndicator) return;
    statusIndicator.textContent = state === "connected" ? "Live" : state === "connecting" ? "Connecting..." : "Disconnected";
    statusIndicator.className = "indicator" + (state === "connected" ? "" : " paused");
  }

  function setChannelStatus(connected) {
    channelConnected = connected;
    if (channelIndicator) {
      channelIndicator.textContent = connected ? "Channel: connected" : "Channel: disconnected";
      channelIndicator.className = "indicator " + (connected ? "channel-connected" : "channel-disconnected");
    }
    if (inputEl && sendBtn) {
      inputEl.disabled = !connected;
      sendBtn.disabled = !connected;
      inputEl.placeholder = connected
        ? "Message to FO..."
        : "No active session \u2014 launch with --channels to enable";
    }
  }

  function connect() {
    setStatus("connecting");
    ws = new WebSocket(getWsUrl());

    ws.onopen = function () {
      retryCount = 0;
      setStatus("connected");
    };

    ws.onmessage = function (ev) {
      var msg = JSON.parse(ev.data);
      if (msg.type === "replay") {
        if (msg.events && msg.events.length > 0) {
          // SQLite is the single source of truth — render all replay events directly.
          msg.events.forEach(function (entry) {
            renderEntry(entry);
            if (entry.seq > lastSeq) lastSeq = entry.seq;
          });
          // Permission tracker: batch-track after all entries are rendered
          // so cards exist in the DOM before markResolved runs.
          msg.events.forEach(function (entry) {
            var tracked = buildTrackedEvent(entry, Date.now());
            var resolved = permissionTracker.track(tracked);
            for (var ri = 0; ri < resolved.length; ri++) {
              markResolved(resolved[ri], "inferred");
            }
          });
        }
      } else if (msg.type === "event") {
        if (msg.data.seq > lastSeq) {
          renderEntry(msg.data);
          // Permission tracker: track after render so card exists in DOM
          var tracked = buildTrackedEvent(msg.data, Date.now());
          var resolved = permissionTracker.track(tracked);
          for (var ri = 0; ri < resolved.length; ri++) {
            markResolved(resolved[ri], "inferred");
          }
          lastSeq = msg.data.seq;
        }
      } else if (msg.type === "channel_status") {
        setChannelStatus(msg.connected);
      }
    };

    ws.onclose = function () {
      setStatus("disconnected");
      scheduleReconnect();
    };

    ws.onerror = function () {};
  }

  function scheduleReconnect() {
    if (retryCount >= maxRetries) {
      setStatus("disconnected");
      return;
    }
    var delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    delay = delay * (0.75 + Math.random() * 0.5);
    retryCount++;
    setTimeout(connect, delay);
  }

  function statusColor(type) {
    var colors = {
      dispatch: "#58a6ff",
      completion: "#3fb950",
      gate: "#f0883e",
      gate_decision: "#f0883e",
      feedback: "#d2a8ff",
      merge: "#79c0ff",
      idle: "#8b949e",
    };
    return colors[type] || "#8b949e";
  }

  function timeAgo(isoStr) {
    var diff = Date.now() - new Date(isoStr).getTime();
    if (diff < 60000) return Math.floor(diff / 1000) + "s ago";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    return Math.floor(diff / 3600000) + "h ago";
  }

  function setTimeWithTooltip(el, isoStr) {
    el.textContent = timeAgo(isoStr);
    el.title = new Date(isoStr).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZoneName: "short"
    });
  }

  function renderEntry(entry) {
    var e = entry.event;
    if (e.type === "channel_message") {
      renderChannelMessage(entry);
    } else if (e.type === "channel_response") {
      renderChannelResponse(entry);
    } else if (e.type === "permission_request") {
      renderPermissionRequest(entry);
    } else if (e.type === "permission_response") {
      renderPermissionResponse(entry);
    } else if (e.type === "gate_decision") {
      renderGateDecision(entry);
    } else {
      renderEvent(entry);
    }
  }

  function removeEmptyState() {
    if (!feedContainer) return;
    var emptyState = feedContainer.querySelector(".empty-state");
    if (emptyState) emptyState.remove();
  }

  function capFeedItems() {
    if (!feedContainer) return;
    while (feedContainer.children.length > 100) {
      feedContainer.removeChild(feedContainer.lastChild);
    }
  }

  function renderEvent(entry) {
    if (!feedContainer) return;
    var e = entry.event;
    removeEmptyState();

    var item = document.createElement("div");
    item.className = "activity-item";

    var badge = document.createElement("span");
    badge.className = "activity-badge";
    badge.style.background = statusColor(e.type) + "22";
    badge.style.color = statusColor(e.type);
    badge.textContent = e.type;

    var info = document.createElement("span");
    info.className = "activity-info";
    info.textContent = e.agent + " \u2192 " + e.entity + " @ " + e.stage;

    var time = document.createElement("span");
    time.className = "activity-time";
    setTimeWithTooltip(time, e.timestamp);

    item.appendChild(badge);
    item.appendChild(info);
    item.appendChild(time);

    if (e.detail) {
      var detail = document.createElement("div");
      detail.className = "activity-detail";
      detail.textContent = e.detail;
      item.appendChild(detail);
    }

    feedContainer.appendChild(item);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  function renderChannelMessage(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble captain";

    var content = document.createElement("div");
    content.className = "bubble-content";
    content.textContent = entry.event.detail || "";
    bubble.appendChild(content);

    var time = document.createElement("span");
    time.className = "bubble-time";
    setTimeWithTooltip(time, entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.appendChild(bubble);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  function renderChannelResponse(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var text = entry.event.detail || "";

    // Check if FO response is a structured suggestion
    var suggestion = null;
    try {
      var parsed = JSON.parse(text);
      if (parsed && parsed.type === "suggestion" && parsed.comment_id) {
        suggestion = parsed;
      }
    } catch (e) {
      // Not JSON — render as normal chat bubble
    }

    if (suggestion) {
      renderSuggestionBubble(entry, suggestion);
      storeSuggestionFromChannel(suggestion);
      return;
    }

    var isLong = text.length > 100;

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble fo" + (isLong ? " truncated" : "");

    var content = document.createElement("div");
    content.className = "bubble-content";
    content.textContent = text;
    bubble.appendChild(content);

    if (isLong) {
      var toggle = document.createElement("span");
      toggle.className = "show-more";
      toggle.textContent = "Show more \u2193";
      toggle.addEventListener("click", function () {
        var isTruncated = bubble.classList.contains("truncated");
        bubble.classList.toggle("truncated");
        toggle.textContent = isTruncated ? "Show less \u2191" : "Show more \u2193";
      });
      bubble.appendChild(toggle);
    }

    var time = document.createElement("span");
    time.className = "bubble-time";
    setTimeWithTooltip(time, entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.appendChild(bubble);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  function renderSuggestionBubble(entry, suggestion) {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble fo suggestion-bubble";

    var header = document.createElement("div");
    header.className = "bubble-content";
    header.textContent = "Suggested edit:";
    bubble.appendChild(header);

    var diff = document.createElement("div");
    diff.style.fontFamily = "monospace";
    diff.style.fontSize = "0.85rem";
    diff.style.margin = "0.5rem 0";

    var del = document.createElement("span");
    del.style.background = "rgba(248, 81, 73, 0.15)";
    del.style.color = "#f85149";
    del.style.textDecoration = "line-through";
    del.textContent = suggestion.diff_from;
    diff.appendChild(del);

    diff.appendChild(document.createTextNode(" \u2192 "));

    var ins = document.createElement("span");
    ins.style.background = "rgba(63, 185, 80, 0.15)";
    ins.style.color = "#3fb950";
    ins.textContent = suggestion.diff_to;
    diff.appendChild(ins);

    bubble.appendChild(diff);

    var time = document.createElement("span");
    time.className = "bubble-time";
    setTimeWithTooltip(time, entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.appendChild(bubble);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  function storeSuggestionFromChannel(suggestion) {
    // Get entity path from URL params (detail page) or skip on dashboard page
    var params = new URLSearchParams(window.location.search);
    var entityPath = params.get("path");
    if (!entityPath) return;

    fetch("/api/entity/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: entityPath,
        selected_text: suggestion.diff_from,
        section_heading: "",
        content: "AI suggested edit",
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (comment) {
        // Create the Suggestion record linked to the comment
        return fetch("/api/entity/suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: entityPath,
            comment_id: comment.id,
            diff_from: suggestion.diff_from,
            diff_to: suggestion.diff_to,
          }),
        });
      })
      .then(function () {
        // Trigger comment reload if on detail page
        if (typeof loadComments === "function") loadComments();
      })
      .catch(function () { /* Best effort */ });
  }

  function renderPermissionRequest(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var params;
    try {
      params = JSON.parse(entry.event.detail || "{}");
    } catch (e) {
      params = { tool_name: "Unknown", description: entry.event.detail || "" };
    }

    var card = document.createElement("div");
    card.className = "permission-card";
    card.setAttribute("data-request-id", params.request_id || "");

    var header = document.createElement("div");
    header.className = "perm-header";
    header.textContent = "Permission Request";
    card.appendChild(header);

    var tool = document.createElement("div");
    tool.className = "perm-tool";
    tool.textContent = params.tool_name + ": " + params.description;
    card.appendChild(tool);

    if (params.input_preview) {
      var preview = document.createElement("div");
      preview.className = "perm-preview";
      preview.textContent = params.input_preview;
      card.appendChild(preview);
    }

    var actions = document.createElement("div");
    actions.className = "perm-actions";

    var approveBtn = document.createElement("button");
    approveBtn.className = "perm-btn approve";
    approveBtn.textContent = "Approve";
    approveBtn.addEventListener("click", function () {
      sendPermissionVerdict(params.request_id, "allow", card);
    });

    var denyBtn = document.createElement("button");
    denyBtn.className = "perm-btn deny";
    denyBtn.textContent = "Reject";
    denyBtn.addEventListener("click", function () {
      sendPermissionVerdict(params.request_id, "deny", card);
    });

    actions.appendChild(approveBtn);
    actions.appendChild(denyBtn);
    card.appendChild(actions);

    feedContainer.appendChild(card);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  function markResolved(requestId, reason) {
    if (!feedContainer) return;
    var card = feedContainer.querySelector('[data-request-id="' + requestId + '"]');
    if (!card) return;
    if (card.classList.contains("resolved")) return; // idempotent
    card.classList.add("resolved");
    var actions = card.querySelector(".perm-actions");
    if (actions) actions.remove();
    var badge = document.createElement("div");
    badge.className = "perm-verdict";
    badge.textContent = reason === "inferred"
      ? "\uD83D\uDD12 Resolved (continued)"
      : "\uD83D\uDD12 Resolved (timeout)";
    card.appendChild(badge);
    mergeIntoResolvedGroup(card);
  }

  function buildGroupSummary(count) {
    var summary = document.createElement("summary");
    var label = document.createTextNode("\uD83D\uDD12 Permission resolved (");
    var countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = String(count);
    var suffix = document.createTextNode(" " + (count === 1 ? "item" : "items") + ") ");
    var chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "\u25B8";
    summary.appendChild(label);
    summary.appendChild(countSpan);
    summary.appendChild(suffix);
    summary.appendChild(chevron);
    return summary;
  }

  function mergeIntoResolvedGroup(card) {
    var prev = card.previousElementSibling;
    var next = card.nextElementSibling;
    var prevIsGroup = prev && prev.classList && prev.classList.contains("collapsed-group");
    var nextIsGroup = next && next.classList && next.classList.contains("collapsed-group");

    if (prevIsGroup && nextIsGroup) {
      // Sandwiched: merge card + next group's cards into prev group
      prev.appendChild(card);
      while (next.children.length > 1) {
        prev.appendChild(next.children[1]);
      }
      next.remove();
      updateGroupCount(prev);
    } else if (prevIsGroup) {
      prev.appendChild(card);
      updateGroupCount(prev);
    } else if (nextIsGroup) {
      var summaryEl = next.querySelector("summary");
      if (summaryEl && summaryEl.nextSibling) {
        next.insertBefore(card, summaryEl.nextSibling);
      } else {
        next.appendChild(card);
      }
      updateGroupCount(next);
    } else {
      // Create a new collapsed group wrapping this card
      var details = document.createElement("details");
      details.className = "collapsed-group";
      details.appendChild(buildGroupSummary(1));
      card.parentNode.insertBefore(details, card);
      details.appendChild(card);
    }
  }

  function updateGroupCount(group) {
    var n = group.querySelectorAll(".permission-card").length;
    var oldSummary = group.querySelector("summary");
    if (oldSummary) oldSummary.remove();
    // Prepend new summary as first child
    var newSummary = buildGroupSummary(n);
    group.insertBefore(newSummary, group.firstChild);
  }

  function sendPermissionVerdict(requestId, behavior, card) {
    var buttons = card.querySelectorAll(".perm-btn");
    buttons.forEach(function (btn) { btn.disabled = true; });

    fetch("/api/channel/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: behavior,
        meta: { type: "permission_response", request_id: requestId },
      }),
    })
      .then(function () {
        permissionTracker.resolve(requestId);
        card.classList.add("resolved");
        var actions = card.querySelector(".perm-actions");
        if (actions) actions.remove();
        var verdict = document.createElement("div");
        verdict.className = "perm-verdict";
        verdict.textContent = behavior === "allow" ? "\u2705 Approved" : "\u274C Rejected";
        card.appendChild(verdict);
        mergeIntoResolvedGroup(card);
      })
      .catch(function () {
        buttons.forEach(function (btn) { btn.disabled = false; });
      });
  }

  function renderPermissionResponse(entry) {
    // Called when server replays a permission_response event back.
    // Remove from tracker so the heuristic doesn't double-fire on the
    // next non-permission event. The card was already visually resolved
    // by sendPermissionVerdict's .then() callback when the dashboard
    // itself sent the verdict, so markResolved's idempotency guard
    // (classList.contains("resolved")) handles the no-op case.
    if (!feedContainer) return;
    var requestId;
    try { requestId = JSON.parse(entry.event.detail || "{}").request_id; } catch (e) { /* ignore */ }
    if (requestId) {
      permissionTracker.resolve(requestId);
    }
  }

  function renderGateDecision(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var e = entry.event;
    var isApproved = e.detail === "approved";

    var card = document.createElement("div");
    card.className = "permission-card resolved";

    var header = document.createElement("div");
    header.className = "perm-header";
    header.textContent = "Gate Decision";
    card.appendChild(header);

    var detail = document.createElement("div");
    detail.className = "perm-tool";
    detail.textContent = e.entity + " @ " + e.stage;
    card.appendChild(detail);

    var verdict = document.createElement("div");
    verdict.className = "perm-verdict";
    verdict.style.color = isApproved ? "#3fb950" : "#f85149";
    verdict.textContent = isApproved ? "Approved" : "Changes Requested";
    card.appendChild(verdict);

    var time = document.createElement("span");
    time.className = "bubble-time";
    setTimeWithTooltip(time, e.timestamp);
    card.appendChild(time);

    feedContainer.appendChild(card);
    feedContainer.scrollTop = feedContainer.scrollHeight;
    capFeedItems();
  }

  // --- Input Bar ---

  function sendMessage() {
    if (!inputEl || !channelConnected) return;
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.disabled = true;
    sendBtn.disabled = true;

    fetch("/api/channel/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, meta: { type: "message" } }),
    })
      .then(function () {
        inputEl.value = "";
        inputEl.style.height = "auto";
      })
      .catch(function () {
        // Leave text in input so user can retry
      })
      .finally(function () {
        if (channelConnected) {
          inputEl.disabled = false;
          sendBtn.disabled = false;
          inputEl.focus();
        }
      });
  }

  if (inputEl) {
    inputEl.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    inputEl.addEventListener("input", function () {
      inputEl.style.height = "auto";
      inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + "px";
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  // Safe DOM removal — avoid innerHTML = "" so we never parse attacker-controlled
  // HTML from stored events. Uses removeChild loop per XSS guardrails.
  function clearFeedDom() {
    if (!feedContainer) return;
    while (feedContainer.firstChild) {
      feedContainer.removeChild(feedContainer.firstChild);
    }
  }

  function clearHistory() {
    fetch("/api/events", { method: "DELETE" }).catch(function () { /* best effort */ });
    clearFeedDom();
    lastSeq = 0;
    if (feedContainer) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No activity yet.";
      feedContainer.appendChild(empty);
    }
  }

  var clearBtn = document.getElementById("clear-history-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearHistory);
  }

  // Permission tracker: poll every 5s, resolve requests pending > 30s.
  setInterval(function () {
    var now = Date.now();
    var expired = permissionTracker.tick(now);
    for (var i = 0; i < expired.length; i++) {
      markResolved(expired[i], "timeout");
    }
  }, 5000);

  // Start disconnected — channel.ts will broadcast status when connected
  setChannelStatus(false);
  connect();
})();
