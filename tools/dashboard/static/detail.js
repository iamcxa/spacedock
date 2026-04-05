// web/static/detail.js

// --- Optional PostHog analytics ---
(function initPosthogAnalytics() {
  fetch("/api/config")
    .then(function (res) { return res.json(); })
    .then(function (config) {
      if (!config.posthog) return;
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init(config.posthog.apiKey, {
        api_host: config.posthog.host,
        capture_pageview: true,
        persistence: "memory",
      });
      var indicator = document.getElementById("telemetry-indicator");
      if (indicator) {
        indicator.textContent = "Analytics: ON";
        indicator.style.display = "";
      }
    })
    .catch(function () { /* PostHog init failed silently */ });
})();

// -- Initialization --

var params = new URLSearchParams(window.location.search);
var entityPath = params.get('path');

if (!entityPath) {
    document.getElementById('entity-body').textContent = 'No entity path specified.';
}

var currentTags = [];

// -- API helpers --

function apiFetch(url, options) {
    return fetch(url, options).then(function(res) {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    });
}

// -- Render functions --

function renderMetadata(frontmatter) {
    var dl = document.getElementById('metadata-fields');
    // Clear existing children safely
    while (dl.firstChild) dl.removeChild(dl.firstChild);
    var skipKeys = ['tags']; // tags shown in tag editor
    Object.keys(frontmatter).forEach(function(key) {
        if (skipKeys.indexOf(key) !== -1) return;
        var dt = document.createElement('dt');
        dt.textContent = key;
        var dd = document.createElement('dd');
        dd.textContent = frontmatter[key] || '(empty)';
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
}

function renderBody(bodyMarkdown) {
    // Extract body content before stage reports for the main body section
    var parts = bodyMarkdown.split(/^## Stage Report: /m);
    var bodyContent = parts[0].trim();
    var container = document.getElementById('entity-body');
    // Clear existing children safely
    while (container.firstChild) container.removeChild(container.firstChild);
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined' && bodyContent) {
        // Render markdown then sanitize to prevent XSS
        var rawHtml = marked.parse(bodyContent);
        // DOMPurify.sanitize() strips all dangerous content (scripts, event handlers, etc.)
        // This is the standard safe pattern for rendering user-provided HTML
        var cleanHtml = DOMPurify.sanitize(rawHtml);
        // Use a temporary container to convert DOMPurify-sanitized HTML string to DOM nodes
        var temp = document.createElement('div');
        temp.innerHTML = cleanHtml; // Safe: cleanHtml is DOMPurify-sanitized
        while (temp.firstChild) {
            container.appendChild(temp.firstChild);
        }
    } else {
        container.textContent = bodyContent || '(No body content)';
    }
}

function renderStageReports(reports) {
    var container = document.getElementById('stage-reports');
    while (container.firstChild) container.removeChild(container.firstChild);
    if (!reports || reports.length === 0) return;

    reports.forEach(function(report) {
        var card = document.createElement('div');
        card.className = 'stage-report-card';

        var heading = document.createElement('h3');
        heading.textContent = 'Stage Report: ' + report.stage;
        card.appendChild(heading);

        var ul = document.createElement('ul');
        ul.className = 'checklist';
        report.items.forEach(function(item) {
            var li = document.createElement('li');
            li.className = 'checklist-item ' + item.status;

            var icon = document.createElement('span');
            icon.className = 'status-icon';
            if (item.status === 'done') icon.textContent = '\u2713';
            else if (item.status === 'skip') icon.textContent = '\u2014';
            else if (item.status === 'fail') icon.textContent = '\u2717';
            else icon.textContent = '\u25CB';

            var textSpan = document.createElement('span');
            textSpan.className = 'item-text';
            textSpan.textContent = item.text;

            li.appendChild(icon);
            li.appendChild(textSpan);

            if (item.detail) {
                var detail = document.createElement('span');
                detail.className = 'item-detail';
                detail.textContent = item.detail;
                li.appendChild(detail);
            }

            ul.appendChild(li);
        });
        card.appendChild(ul);

        if (report.summary) {
            var summary = document.createElement('div');
            summary.className = 'stage-summary';
            summary.textContent = report.summary;
            card.appendChild(summary);
        }

        container.appendChild(card);
    });
}

function renderTags(tags) {
    currentTags = tags.slice();
    var container = document.getElementById('tag-chips');
    while (container.firstChild) container.removeChild(container.firstChild);
    tags.forEach(function(tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.appendChild(document.createTextNode(tag + ' '));

        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove-tag';
        removeBtn.textContent = '\u00d7';
        removeBtn.setAttribute('data-tag', tag);
        removeBtn.addEventListener('click', function() {
            removeTag(tag);
        });
        chip.appendChild(removeBtn);
        container.appendChild(chip);
    });
}

function initScore(scoreStr) {
    var slider = document.getElementById('score-slider');
    var display = document.getElementById('score-display');
    var val = parseFloat(scoreStr) || 0;
    slider.value = val;
    display.textContent = val.toFixed(2);
    slider.addEventListener('input', function() {
        display.textContent = parseFloat(slider.value).toFixed(2);
    });
}

// -- Management actions --

function saveScore() {
    var score = parseFloat(document.getElementById('score-slider').value);
    apiFetch('/api/entity/score', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: entityPath, score: score})
    }).then(function() {
        loadEntity();
        if (window.posthog) posthog.capture('score_saved', {score: score});
    });
}

function addTag() {
    var input = document.getElementById('tag-input');
    var tag = input.value.trim();
    if (!tag || currentTags.indexOf(tag) !== -1) return;
    currentTags.push(tag);
    input.value = '';
    saveTags();
    if (window.posthog) posthog.capture('tag_added');
}

function removeTag(tag) {
    currentTags = currentTags.filter(function(t) { return t !== tag; });
    saveTags();
    if (window.posthog) posthog.capture('tag_removed');
}

function saveTags() {
    apiFetch('/api/entity/tags', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: entityPath, tags: currentTags})
    }).then(function() {
        renderTags(currentTags);
    });
}

// -- Load entity --

function loadEntity() {
    if (!entityPath) return;
    apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function(data) {
            document.getElementById('entity-title').textContent = data.frontmatter.title || '(untitled)';
            document.title = (data.frontmatter.title || 'Entity') + ' \u2014 Spacedock';
            renderMetadata(data.frontmatter);
            renderBody(data.body);
            renderStageReports(data.stage_reports);
            renderTags(data.tags);
            initScore(data.frontmatter.score || '0');
            if (typeof loadComments === 'function') loadComments();
        });
}

// -- Event listeners --

document.getElementById('score-save').addEventListener('click', saveScore);
document.getElementById('tag-add').addEventListener('click', addTag);
document.getElementById('tag-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addTag();
});

// -- Initial load --

loadEntity();

// --- Collaborative Review: Text Selection + Comment System ---

var commentTooltip = document.getElementById('comment-tooltip');
var commentInput = document.getElementById('comment-input');
var commentSubmitBtn = document.getElementById('comment-submit');
var commentCancelBtn = document.getElementById('comment-cancel');
var commentThreadsContainer = document.getElementById('comment-threads');

var pendingSelection = null; // { text, sectionHeading, rect }

// --- Text Selection Listener ---

function getSelectionContext(range) {
    // Walk up from range start to find nearest preceding h2/h3
    var node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    // Walk backwards through siblings and up through parents
    var heading = '';
    var current = node;
    while (current && current.id !== 'entity-body') {
        // Check previous siblings for headings
        var sibling = current.previousElementSibling;
        while (sibling) {
            var tag = sibling.tagName;
            if (tag === 'H2' || tag === 'H3' || tag === 'H1') {
                heading = sibling.textContent || '';
                break;
            }
            sibling = sibling.previousElementSibling;
        }
        if (heading) break;
        current = current.parentNode;
    }
    return '## ' + heading;
}

document.getElementById('entity-body').addEventListener('mouseup', function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var selectedText = sel.toString().trim();
    if (!selectedText) return;

    var range = sel.getRangeAt(0);
    // Research correction #1: use getClientRects() for accurate multi-line positioning
    var rects = range.getClientRects();
    var rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

    var sectionHeading = getSelectionContext(range);

    pendingSelection = {
        text: selectedText,
        sectionHeading: sectionHeading,
    };

    showCommentTooltip(rect);
});

function showCommentTooltip(rect) {
    commentInput.value = '';
    commentTooltip.style.display = '';
    commentTooltip.style.top = (rect.bottom + 8) + 'px';
    commentTooltip.style.left = Math.max(8, rect.left) + 'px';
    commentInput.focus();
}

function hideCommentTooltip() {
    commentTooltip.style.display = 'none';
    pendingSelection = null;
    window.getSelection().removeAllRanges();
}

// --- Comment Submission ---

function submitComment() {
    if (!pendingSelection || !entityPath) return;
    var content = commentInput.value.trim();
    if (!content) return;

    apiFetch('/api/entity/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: entityPath,
            selected_text: pendingSelection.text,
            section_heading: pendingSelection.sectionHeading,
            content: content,
        }),
    }).then(function (comment) {
        hideCommentTooltip();
        loadComments();
        // Send comment to FO via channel
        sendCommentToChannel(comment);
    });
}

function sendCommentToChannel(comment) {
    fetch('/api/channel/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: comment.content,
            meta: {
                type: 'comment',
                entity_path: comment.entity_path,
                section_heading: comment.section_heading,
                selected_text: comment.selected_text,
                comment_id: comment.id,
            },
        }),
    });
}

commentSubmitBtn.addEventListener('click', submitComment);
commentCancelBtn.addEventListener('click', hideCommentTooltip);
commentInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitComment();
    }
    if (e.key === 'Escape') {
        hideCommentTooltip();
    }
});

// Close tooltip when clicking outside
document.addEventListener('mousedown', function (e) {
    if (commentTooltip.style.display !== 'none' && !commentTooltip.contains(e.target)) {
        hideCommentTooltip();
    }
});

// --- Comment Rendering in Sidebar ---

function loadComments() {
    if (!entityPath) return;
    apiFetch('/api/entity/comments?path=' + encodeURIComponent(entityPath))
        .then(function (thread) {
            renderComments(thread);
        });
}

function renderComments(thread) {
    while (commentThreadsContainer.firstChild) commentThreadsContainer.removeChild(commentThreadsContainer.firstChild);

    if (thread.comments.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Select text to add a comment';
        commentThreadsContainer.appendChild(empty);
        return;
    }

    // Show unresolved comments first, then resolved
    var sorted = thread.comments.slice().sort(function (a, b) {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    sorted.forEach(function (comment) {
        var card = document.createElement('div');
        card.className = 'comment-card' + (comment.resolved ? ' resolved' : '');

        var selectedText = document.createElement('div');
        selectedText.className = 'comment-selected-text';
        selectedText.textContent = '"' + comment.selected_text + '"';
        card.appendChild(selectedText);

        var content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content;
        card.appendChild(content);

        var meta = document.createElement('div');
        meta.className = 'comment-meta';

        var author = document.createElement('span');
        author.textContent = comment.author + ' \u2022 ' + comment.section_heading.replace('## ', '');
        meta.appendChild(author);

        if (!comment.resolved) {
            var resolveBtn = document.createElement('button');
            resolveBtn.className = 'comment-resolve-btn';
            resolveBtn.textContent = 'Resolve';
            resolveBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                resolveCommentAction(comment.id);
            });
            meta.appendChild(resolveBtn);
        }

        card.appendChild(meta);

        // Render suggestions linked to this comment
        var linkedSuggestions = (thread.suggestions || []).filter(function (s) {
            return s.comment_id === comment.id;
        });
        linkedSuggestions.forEach(function (suggestion) {
            card.appendChild(renderSuggestionCard(suggestion));
        });

        commentThreadsContainer.appendChild(card);
    });
}

function renderSuggestionCard(suggestion) {
    var card = document.createElement('div');
    card.className = 'suggestion-card';

    var diff = document.createElement('div');
    diff.className = 'suggestion-diff';

    var del = document.createElement('span');
    del.className = 'diff-del';
    del.textContent = suggestion.diff_from;
    diff.appendChild(del);

    diff.appendChild(document.createTextNode(' \u2192 '));

    var ins = document.createElement('span');
    ins.className = 'diff-ins';
    ins.textContent = suggestion.diff_to;
    diff.appendChild(ins);

    card.appendChild(diff);

    if (suggestion.status === 'pending') {
        var actions = document.createElement('div');
        actions.className = 'suggestion-actions';

        var acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn btn-small btn-accept';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', function () {
            acceptSuggestionAction(suggestion.id);
        });
        actions.appendChild(acceptBtn);

        var rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-small btn-reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', function () {
            rejectSuggestionAction(suggestion.id);
        });
        actions.appendChild(rejectBtn);

        card.appendChild(actions);
    } else {
        var status = document.createElement('div');
        status.className = 'comment-meta';
        status.textContent = suggestion.status === 'accepted' ? '\u2713 Accepted' : '\u2717 Rejected';
        card.appendChild(status);
    }

    return card;
}

// --- Comment/Suggestion Actions ---

function resolveCommentAction(commentId) {
    apiFetch('/api/entity/comment/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, comment_id: commentId }),
    }).then(function () {
        loadComments();
    });
}

function acceptSuggestionAction(suggestionId) {
    apiFetch('/api/entity/suggestion/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, suggestion_id: suggestionId }),
    }).then(function () {
        loadComments();
        loadEntity(); // Re-render body with accepted changes
    }).catch(function (err) {
        if (err.message && err.message.indexOf('409') !== -1) {
            alert('Conflict: The entity file was modified. Please reload and try again.');
            loadEntity();
            loadComments();
        }
    });
}

function rejectSuggestionAction(suggestionId) {
    apiFetch('/api/entity/suggestion/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, suggestion_id: suggestionId }),
    }).then(function () {
        loadComments();
    });
}

