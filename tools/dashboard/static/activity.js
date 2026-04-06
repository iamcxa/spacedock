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
          msg.events.forEach(function (entry) {
            renderEntry(entry);
            if (entry.seq > lastSeq) lastSeq = entry.seq;
          });
        }
      } else if (msg.type === "event") {
        renderEntry(msg.data);
        if (msg.data.seq > lastSeq) lastSeq = msg.data.seq;
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
    time.textContent = timeAgo(e.timestamp);

    item.appendChild(badge);
    item.appendChild(info);
    item.appendChild(time);

    if (e.detail) {
      var detail = document.createElement("div");
      detail.className = "activity-detail";
      detail.textContent = e.detail;
      item.appendChild(detail);
    }

    feedContainer.insertBefore(item, feedContainer.firstChild);
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
    time.textContent = timeAgo(entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.insertBefore(bubble, feedContainer.firstChild);
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
    time.textContent = timeAgo(entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.insertBefore(bubble, feedContainer.firstChild);
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
    time.textContent = timeAgo(entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.insertBefore(bubble, feedContainer.firstChild);
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

    feedContainer.insertBefore(card, feedContainer.firstChild);
    capFeedItems();
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
        card.classList.add("resolved");
        var verdict = document.createElement("div");
        verdict.className = "perm-verdict";
        verdict.textContent = behavior === "allow" ? "Approved" : "Rejected";
        card.appendChild(verdict);
      })
      .catch(function () {
        buttons.forEach(function (btn) { btn.disabled = false; });
      });
  }

  function renderPermissionResponse(entry) {
    // Find the matching permission card and mark it resolved
    // Since we resolve cards in sendPermissionVerdict, this handles
    // verdicts from other sources (e.g., terminal responded first).
    if (!feedContainer) return;
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
    time.textContent = timeAgo(e.timestamp);
    card.appendChild(time);

    feedContainer.insertBefore(card, feedContainer.firstChild);
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

  // Start disconnected — channel.ts will broadcast status when connected
  setChannelStatus(false);
  connect();
})();
