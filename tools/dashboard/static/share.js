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
        if (!res.ok) {
          authError.textContent = "Server error. Please try again.";
          authError.style.display = "block";
          verifyBtn.disabled = false;
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.scope) return;
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

    // Apply highlights after body render + comments load
    fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(path))
      .then(function (res) { return res.json(); })
      .then(function (thread) {
        cachedComments = thread.comments || [];
        applyCommentHighlights(cachedComments);
      });

    document.getElementById("back-to-list").onclick = function () {
      detailView.style.display = "none";
      document.getElementById("entity-list").style.display = "block";
    };
  }

  // --- Comment Highlights (share page) ---

  var cachedComments = null;
  var activePopover = null;

  function applyCommentHighlights(comments) {
    var bodyEl = document.getElementById('entity-body');
    if (!bodyEl || !comments || !comments.length) return;

    // Remove existing highlights before re-applying
    var existingMarks = bodyEl.querySelectorAll('.comment-highlight');
    for (var m = existingMarks.length - 1; m >= 0; m--) {
      var parent = existingMarks[m].parentNode;
      while (existingMarks[m].firstChild) parent.insertBefore(existingMarks[m].firstChild, existingMarks[m]);
      parent.removeChild(existingMarks[m]);
    }
    bodyEl.normalize();

    var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
    var node;
    var fullText = '';
    var nodeOffsets = [];
    while ((node = walker.nextNode())) {
      var start = fullText.length;
      fullText += node.textContent;
      nodeOffsets.push({ node: node, start: start, end: fullText.length });
    }

    var intervals = [];
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      if (!c.selected_text) continue;
      var idx = fullText.indexOf(c.selected_text);
      if (idx === -1) continue;
      intervals.push({
        start: idx,
        end: idx + c.selected_text.length,
        commentId: c.id,
        resolved: c.resolved
      });
    }
    if (!intervals.length) return;

    var points = [];
    for (var i = 0; i < intervals.length; i++) {
      points.push(intervals[i].start);
      points.push(intervals[i].end);
    }
    points = points.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
    points.sort(function (a, b) { return a - b; });

    var segments = [];
    for (var i = 0; i < points.length - 1; i++) {
      var segStart = points[i];
      var segEnd = points[i + 1];
      var ids = [];
      var allResolved = true;
      for (var j = 0; j < intervals.length; j++) {
        if (intervals[j].start <= segStart && intervals[j].end >= segEnd) {
          ids.push(intervals[j].commentId);
          if (!intervals[j].resolved) allResolved = false;
        }
      }
      if (ids.length > 0) {
        segments.push({ start: segStart, end: segEnd, commentIds: ids, resolved: allResolved });
      }
    }

    for (var s = segments.length - 1; s >= 0; s--) {
      var seg = segments[s];
      wrapTextRange(nodeOffsets, seg.start, seg.end, seg.commentIds, seg.resolved);
    }
  }

  function wrapTextRange(nodeOffsets, rangeStart, rangeEnd, commentIds, resolved) {
    for (var i = 0; i < nodeOffsets.length; i++) {
      var info = nodeOffsets[i];
      if (info.end <= rangeStart || info.start >= rangeEnd) continue;

      var node = info.node;
      var nodeStart = info.start;
      var localStart = Math.max(0, rangeStart - nodeStart);
      var localEnd = Math.min(node.textContent.length, rangeEnd - nodeStart);

      if (localStart > 0) {
        var before = node.splitText(localStart);
        var splitLen = node.textContent.length;
        info.node = before;
        info.start = nodeStart + splitLen;
        node = before;
        localEnd = localEnd - localStart;
        localStart = 0;
      }
      if (localEnd < node.textContent.length) {
        node.splitText(localEnd);
      }

      var mark = document.createElement('mark');
      mark.className = 'comment-highlight' + (resolved ? ' resolved' : '');
      mark.setAttribute('data-comment-ids', commentIds.join(','));
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
      break;
    }
  }

  function showCommentPopover(mark, comments) {
    hideCommentPopover();
    var ids = (mark.getAttribute('data-comment-ids') || '').split(',');
    var matching = comments.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    if (!matching.length) return;

    var popover = document.createElement('div');
    popover.className = 'comment-popover';

    for (var i = 0; i < matching.length; i++) {
      var c = matching[i];
      var div = document.createElement('div');
      div.className = 'popover-comment';

      var authorSpan = document.createElement('span');
      authorSpan.className = 'popover-author';
      authorSpan.textContent = c.author;
      div.appendChild(authorSpan);

      var timeSpan = document.createElement('span');
      timeSpan.className = 'popover-time';
      timeSpan.textContent = new Date(c.timestamp).toLocaleString();
      div.appendChild(timeSpan);

      var textDiv = document.createElement('div');
      textDiv.className = 'popover-text';
      textDiv.textContent = c.content;
      div.appendChild(textDiv);

      popover.appendChild(div);

      if (c.thread && c.thread.length) {
        for (var r = 0; r < c.thread.length; r++) {
          var reply = c.thread[r];
          var replyDiv = document.createElement('div');
          replyDiv.className = 'popover-comment';

          var replyAuthor = document.createElement('span');
          replyAuthor.className = 'popover-author';
          replyAuthor.textContent = reply.author;
          replyDiv.appendChild(replyAuthor);

          var replyTime = document.createElement('span');
          replyTime.className = 'popover-time';
          replyTime.textContent = new Date(reply.timestamp).toLocaleString();
          replyDiv.appendChild(replyTime);

          var replyText = document.createElement('div');
          replyText.className = 'popover-text';
          replyText.textContent = reply.content;
          replyDiv.appendChild(replyText);

          popover.appendChild(replyDiv);
        }
      }

      if (i === 0) {
        var form = document.createElement('div');
        form.className = 'popover-reply-form';
        var input = document.createElement('input');
        input.className = 'popover-reply-input';
        input.placeholder = 'Reply...';
        input.type = 'text';
        var btn = document.createElement('button');
        btn.className = 'popover-reply-btn';
        btn.textContent = 'Reply';
        var capturedId = c.id;
        btn.onclick = function () {
          var text = input.value.trim();
          if (!text) return;
          submitReply(capturedId, text);
        };
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') btn.click();
        });
        form.appendChild(input);
        form.appendChild(btn);
        popover.appendChild(form);
      }
    }

    var rect = mark.getBoundingClientRect();
    var bodyEl = document.getElementById('entity-body');
    var bodyRect = bodyEl.getBoundingClientRect();
    popover.style.top = (rect.bottom - bodyRect.top + 8) + 'px';
    popover.style.left = (rect.left - bodyRect.left) + 'px';

    bodyEl.style.position = 'relative';
    bodyEl.appendChild(popover);
    activePopover = popover;

    setTimeout(function () {
      document.addEventListener('click', handlePopoverOutsideClick);
    }, 0);
  }

  function hideCommentPopover() {
    if (activePopover && activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
    }
    activePopover = null;
    document.removeEventListener('click', handlePopoverOutsideClick);
  }

  function handlePopoverOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target) && !e.target.classList.contains('comment-highlight')) {
      hideCommentPopover();
    }
  }

  function submitReply(commentId, content) {
    fetch('/api/share/' + token + '/entity/comment/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentCommentPath,
        comment_id: commentId,
        content: content,
      }),
    }).then(function () {
      hideCommentPopover();
      loadComments(currentCommentPath);
      // Re-fetch and re-apply highlights after reply
      fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(currentCommentPath))
        .then(function (res) { return res.json(); })
        .then(function (thread) {
          cachedComments = thread.comments || [];
          applyCommentHighlights(cachedComments);
        });
    });
  }

  document.getElementById('entity-body').addEventListener('click', function (e) {
    var mark = e.target.closest('.comment-highlight');
    if (mark && cachedComments) {
      e.stopPropagation();
      showCommentPopover(mark, cachedComments);
    }
  });

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
        // Sort: unresolved first, then by newest
        var sorted = thread.comments.slice().sort(function (a, b) {
          if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        sorted.forEach(function (c) {
          var card = document.createElement("div");
          card.className = "comment-card" + (c.resolved ? " resolved" : "");

          // Selected text preview
          if (c.selected_text) {
            var selectedText = document.createElement("div");
            selectedText.className = "comment-selected-text";
            selectedText.textContent = '"' + c.selected_text + '"';
            card.appendChild(selectedText);
          }

          // Comment content
          var content = document.createElement("div");
          content.className = "comment-content";
          content.textContent = c.content;
          card.appendChild(content);

          // Meta: author + section + resolve
          var meta = document.createElement("div");
          meta.className = "comment-meta";

          var authorSpan = document.createElement("span");
          authorSpan.textContent = c.author + (c.section_heading ? " \u2022 " + c.section_heading.replace("## ", "") : "");
          meta.appendChild(authorSpan);

          // No resolve button on share page — only captain can resolve

          card.appendChild(meta);

          // Click card → scroll to highlight + flash
          (function (commentId) {
            card.addEventListener("click", function (e) {
              var marks = document.querySelectorAll(".comment-highlight");
              for (var m = 0; m < marks.length; m++) {
                var ids = (marks[m].getAttribute("data-comment-ids") || "").split(",");
                if (ids.indexOf(commentId) !== -1) {
                  marks[m].scrollIntoView({ behavior: "smooth", block: "center" });
                  marks[m].classList.add("comment-highlight-flash");
                  setTimeout(function () { marks[m].classList.remove("comment-highlight-flash"); }, 700);
                  marks[m].click();
                  break;
                }
              }
            });
          })(c.id);

          container.appendChild(card);
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
        // Re-fetch and re-apply highlights after new comment
        fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(currentCommentPath))
          .then(function (res) { return res.json(); })
          .then(function (thread) {
            cachedComments = thread.comments || [];
            applyCommentHighlights(cachedComments);
          });
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
            // Re-fetch and re-apply highlights after new comment
            fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(currentCommentPath))
              .then(function (res) { return res.json(); })
              .then(function (thread) {
                cachedComments = thread.comments || [];
                applyCommentHighlights(cachedComments);
              });
          }
        }
      } catch (e) { /* ignore parse errors */ }
    };
    ws.onclose = function () {
      setTimeout(connectScopedWebSocket, 3000);
    };
  }
})();
