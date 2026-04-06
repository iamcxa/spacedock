(function () {
  "use strict";

  // Extract token from URL path: /share/:token
  var pathParts = window.location.pathname.split("/");
  var token = pathParts[2];
  if (!token) {
    document.getElementById("auth-view").textContent = "Invalid share link.";
    return;
  }

  var scope = null;

  // --- Auth View ---
  var authView = document.getElementById("auth-view");
  var reviewView = document.getElementById("review-view");
  var passwordInput = document.getElementById("password-input");
  var verifyBtn = document.getElementById("verify-btn");
  var authError = document.getElementById("auth-error");

  verifyBtn.addEventListener("click", doVerify);
  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doVerify();
  });

  function doVerify() {
    var password = passwordInput.value;
    if (!password) return;
    verifyBtn.disabled = true;
    authError.style.display = "none";

    fetch("/api/share/" + token + "/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) {
        if (res.status === 401) {
          authError.style.display = "block";
          verifyBtn.disabled = false;
          return null;
        }
        if (res.status === 404) {
          authView.textContent = "This share link has expired or does not exist.";
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        scope = data.scope;
        showReviewView();
      })
      .catch(function () {
        authError.textContent = "Connection error. Please try again.";
        authError.style.display = "block";
        verifyBtn.disabled = false;
      });
  }

  // --- Review View ---
  function showReviewView() {
    authView.style.display = "none";
    reviewView.style.display = "block";
    document.getElementById("review-label").textContent = scope.label || "Shared Review";
    document.getElementById("review-expires").textContent =
      "Expires: " + new Date(scope.expiresAt).toLocaleString();
    renderEntityList();
    connectScopedWebSocket();
  }

  function renderEntityList() {
    var container = document.getElementById("entity-list");
    container.textContent = "";
    scope.entityPaths.forEach(function (path) {
      fetch("/api/share/" + token + "/entity/detail?path=" + encodeURIComponent(path))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var card = document.createElement("div");
          card.className = "entity-card";

          var h3 = document.createElement("h3");
          h3.textContent = data.frontmatter.title || path.split("/").pop();
          card.appendChild(h3);

          var meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = "Status: " + (data.frontmatter.status || "\u2014") +
            " | Score: " + (data.frontmatter.score || "\u2014");
          card.appendChild(meta);

          card.addEventListener("click", function () {
            showEntityDetail(path, data);
          });
          container.appendChild(card);
        });
    });
  }

  function showEntityDetail(path, data) {
    document.getElementById("entity-list").style.display = "none";
    var detailView = document.getElementById("entity-detail-view");
    detailView.style.display = "block";

    // Render body safely — DOMPurify sanitizes all HTML from marked output
    var bodyEl = document.getElementById("entity-body");
    if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
      var sanitized = DOMPurify.sanitize(marked.parse(data.body || ""));
      bodyEl.innerHTML = sanitized; // Safe: DOMPurify-sanitized output
    } else {
      bodyEl.textContent = data.body || "";
    }

    loadComments(path);
    setupCommentTooltip(path);

    document.getElementById("back-to-list").onclick = function () {
      detailView.style.display = "none";
      document.getElementById("entity-list").style.display = "block";
    };
  }

  function loadComments(path) {
    fetch("/api/share/" + token + "/entity/comments?path=" + encodeURIComponent(path))
      .then(function (res) { return res.json(); })
      .then(function (thread) {
        var container = document.getElementById("comment-threads");
        container.textContent = "";
        if (!thread.comments || thread.comments.length === 0) {
          var empty = document.createElement("div");
          empty.className = "empty-state";
          empty.textContent = "No comments yet. Select text to add one.";
          container.appendChild(empty);
          return;
        }
        thread.comments.forEach(function (c) {
          var div = document.createElement("div");
          div.className = "comment-item";

          var author = document.createElement("div");
          author.className = "comment-author";
          author.textContent = c.author;
          div.appendChild(author);

          var text = document.createElement("div");
          text.className = "comment-text";
          text.textContent = c.content;
          div.appendChild(text);

          var time = document.createElement("div");
          time.className = "comment-time";
          time.textContent = new Date(c.timestamp).toLocaleString();
          div.appendChild(time);

          container.appendChild(div);
        });
      });
  }

  var currentCommentPath = null;
  function setupCommentTooltip(path) {
    currentCommentPath = path;
    var tooltip = document.getElementById("comment-tooltip");
    var input = document.getElementById("comment-input");
    var submitBtn = document.getElementById("comment-submit");
    var cancelBtn = document.getElementById("comment-cancel");

    document.getElementById("entity-body").addEventListener("mouseup", function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        tooltip.style.display = "none";
        return;
      }
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      tooltip.style.display = "block";
      tooltip.style.position = "fixed";
      tooltip.style.top = (rect.bottom + 8) + "px";
      tooltip.style.left = rect.left + "px";
      input.value = "";
      input.dataset.selectedText = sel.toString();
    });

    submitBtn.onclick = function () {
      var selectedText = input.dataset.selectedText;
      var content = input.value.trim();
      if (!content || !selectedText) return;
      fetch("/api/share/" + token + "/entity/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentCommentPath,
          selected_text: selectedText,
          section_heading: "",
          content: content,
        }),
      }).then(function () {
        tooltip.style.display = "none";
        loadComments(currentCommentPath);
      });
    };

    cancelBtn.onclick = function () {
      tooltip.style.display = "none";
    };
  }

  // --- Scoped WebSocket ---
  function connectScopedWebSocket() {
    var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    var wsUrl = protocol + "//" + window.location.host + "/ws/share/" + token + "/activity";
    var ws = new WebSocket(wsUrl);
    ws.onmessage = function (ev) {
      try {
        var msg = JSON.parse(ev.data);
        if (msg.type === "event" && msg.data && msg.data.event) {
          if (msg.data.event.type === "comment" && currentCommentPath) {
            loadComments(currentCommentPath);
          }
        }
      } catch (e) { /* ignore parse errors */ }
    };
    ws.onclose = function () {
      setTimeout(connectScopedWebSocket, 3000);
    };
  }
})();
