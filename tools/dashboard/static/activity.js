(function () {
  "use strict";

  var feedContainer = document.getElementById("activity-feed");
  var statusIndicator = document.getElementById("ws-status");
  var lastSeq = 0;
  var ws = null;
  var retryCount = 0;
  var maxRetries = 10;
  var baseDelay = 500;  // ms
  var maxDelay = 30000; // ms

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
            renderEvent(entry);
            if (entry.seq > lastSeq) lastSeq = entry.seq;
          });
        }
      } else if (msg.type === "event") {
        renderEvent(msg.data);
        if (msg.data.seq > lastSeq) lastSeq = msg.data.seq;
      }
    };

    ws.onclose = function () {
      setStatus("disconnected");
      scheduleReconnect();
    };

    ws.onerror = function () {
      // onclose will fire after onerror -- reconnect handled there
    };
  }

  function scheduleReconnect() {
    if (retryCount >= maxRetries) {
      setStatus("disconnected");
      return;
    }
    var delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    // Add jitter: +/- 25%
    delay = delay * (0.75 + Math.random() * 0.5);
    retryCount++;
    setTimeout(connect, delay);
  }

  function statusColor(type) {
    var colors = {
      dispatch: "#58a6ff",
      completion: "#3fb950",
      gate: "#f0883e",
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

  function renderEvent(entry) {
    if (!feedContainer) return;
    var e = entry.event;

    // Remove empty state placeholder on first event
    var emptyState = feedContainer.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

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

    // Prepend newest at top
    feedContainer.insertBefore(item, feedContainer.firstChild);

    // Cap visible items at 100
    while (feedContainer.children.length > 100) {
      feedContainer.removeChild(feedContainer.lastChild);
    }
  }

  connect();
})();
