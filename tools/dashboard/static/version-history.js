// ABOUTME: Version history panel for entity detail page.
// ABOUTME: Fetches snapshot versions, renders timeline, triggers diff view on version selection.

(function initVersionHistory() {
  var params = new URLSearchParams(window.location.search);
  var entityPath = params.get('path');

  // Derive entity slug from path (filename without .md)
  function entitySlugFromPath(p) {
    if (!p) return '';
    return p.replace(/\.md$/, '').split('/').pop();
  }

  var entitySlug = entitySlugFromPath(entityPath);

  // --- State ---
  var versions = [];
  var fromVersion = null;
  var toVersion = null;

  // --- DOM refs ---
  var versionPanel = document.getElementById('version-panel');
  var specPanel = document.getElementById('spec-panel');
  var historyBtn = document.getElementById('history-btn');

  if (!versionPanel || !historyBtn) return;

  // --- Toggle between spec and version panels ---
  function showVersionPanel() {
    specPanel.style.display = 'none';
    versionPanel.style.display = '';
    historyBtn.textContent = '\u2190 Back to Spec';
    historyBtn.classList.add('active');
    loadVersions();
  }

  function showSpecPanel() {
    versionPanel.style.display = 'none';
    specPanel.style.display = '';
    historyBtn.textContent = 'History';
    historyBtn.classList.remove('active');
  }

  historyBtn.addEventListener('click', function () {
    if (specPanel.style.display === 'none') {
      showSpecPanel();
    } else {
      showVersionPanel();
    }
  });

  // --- Load versions from API ---
  function loadVersions() {
    if (!entitySlug) return;
    while (versionPanel.firstChild) versionPanel.removeChild(versionPanel.firstChild);
    var loading = document.createElement('div');
    loading.className = 'version-loading';
    loading.textContent = 'Loading versions\u2026';
    versionPanel.appendChild(loading);

    fetch('/api/entity/versions?entity=' + encodeURIComponent(entitySlug))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        versions = (data.versions || []).slice().reverse(); // newest first
        fromVersion = null;
        toVersion = null;
        renderVersionPanel();
      })
      .catch(function () {
        while (versionPanel.firstChild) versionPanel.removeChild(versionPanel.firstChild);
        var err = document.createElement('div');
        err.className = 'version-error';
        err.textContent = 'Failed to load versions.';
        versionPanel.appendChild(err);
      });
  }

  // --- Render version panel layout ---
  function renderVersionPanel() {
    while (versionPanel.firstChild) versionPanel.removeChild(versionPanel.firstChild);

    var header = document.createElement('div');
    header.className = 'version-panel-header';

    var title = document.createElement('h2');
    title.className = 'version-panel-title';
    title.textContent = 'Version History';
    header.appendChild(title);

    if (versions.length > 1) {
      var compareHint = document.createElement('span');
      compareHint.className = 'version-compare-hint';
      compareHint.textContent = 'Click two versions to compare';
      header.appendChild(compareHint);
    }

    versionPanel.appendChild(header);

    if (!versions.length) {
      var empty = document.createElement('div');
      empty.className = 'version-empty';
      empty.textContent = 'No versions recorded yet.';
      versionPanel.appendChild(empty);
      return;
    }

    var body = document.createElement('div');
    body.className = 'version-panel-body';

    // Timeline list
    var timeline = document.createElement('div');
    timeline.className = 'version-timeline';
    timeline.id = 'version-timeline';

    versions.forEach(function (v) {
      timeline.appendChild(renderVersionItem(v));
    });

    body.appendChild(timeline);

    // Diff area
    var diffArea = document.createElement('div');
    diffArea.className = 'version-diff-area';
    diffArea.id = 'version-diff-area';

    var diffPlaceholder = document.createElement('div');
    diffPlaceholder.className = 'version-diff-placeholder';
    diffPlaceholder.textContent = 'Select a version to view diff';
    diffArea.appendChild(diffPlaceholder);

    body.appendChild(diffArea);
    versionPanel.appendChild(body);
  }

  // --- Render a single version item in the timeline ---
  function renderVersionItem(v) {
    var item = document.createElement('div');
    item.className = 'version-item';
    item.setAttribute('data-version', String(v.version));

    if (v.source === 'rollback') {
      item.classList.add('version-rollback');
    }

    var vNum = document.createElement('span');
    vNum.className = 'version-num';
    vNum.textContent = 'v' + v.version;
    item.appendChild(vNum);

    var vMeta = document.createElement('div');
    vMeta.className = 'version-meta';

    var vAuthor = document.createElement('span');
    vAuthor.className = 'version-author';
    vAuthor.textContent = v.author;
    vMeta.appendChild(vAuthor);

    var vTime = document.createElement('span');
    vTime.className = 'version-time';
    vTime.textContent = new Date(v.created_at).toLocaleString();
    vMeta.appendChild(vTime);

    var vReason = document.createElement('div');
    vReason.className = 'version-reason';
    vReason.textContent = v.reason;
    vMeta.appendChild(vReason);

    if (v.source === 'rollback' && v.rollback_section) {
      var vBadge = document.createElement('span');
      vBadge.className = 'version-badge rollback-badge';
      vBadge.textContent = 'rollback: ' + v.rollback_section;
      vMeta.appendChild(vBadge);
    }

    item.appendChild(vMeta);

    item.addEventListener('click', function () {
      selectVersion(v.version);
    });

    return item;
  }

  // --- Version selection logic ---
  function selectVersion(version) {
    if (toVersion === null) {
      // Compare selected version against latest (most intuitive for single click)
      var latestVersion = versions[0].version;
      fromVersion = version;
      toVersion = latestVersion;
      highlightSelected();
      if (fromVersion !== toVersion) {
        loadDiff(fromVersion, toVersion);
      }
      return;
    }

    if (version === toVersion) {
      toVersion = null;
      fromVersion = null;
      highlightSelected();
      clearDiff();
      return;
    }

    var newFrom = Math.min(version, toVersion);
    var newTo = Math.max(version, toVersion);
    fromVersion = newFrom;
    toVersion = newTo;
    highlightSelected();
    loadDiff(fromVersion, toVersion);
  }

  function highlightSelected() {
    var items = versionPanel.querySelectorAll('.version-item');
    items.forEach(function (el) {
      var v = parseInt(el.getAttribute('data-version'), 10);
      el.classList.remove('selected', 'in-range');
      if (fromVersion !== null && toVersion !== null) {
        if (v === fromVersion || v === toVersion) el.classList.add('selected');
        else if (v > fromVersion && v < toVersion) el.classList.add('in-range');
      } else if (toVersion !== null && v === toVersion) {
        el.classList.add('selected');
      }
    });
  }

  function clearDiff() {
    var diffArea = document.getElementById('version-diff-area');
    if (!diffArea) return;
    while (diffArea.firstChild) diffArea.removeChild(diffArea.firstChild);
    var placeholder = document.createElement('div');
    placeholder.className = 'version-diff-placeholder';
    placeholder.textContent = 'Select a version to view diff';
    diffArea.appendChild(placeholder);
  }

  // --- Load and render diff ---
  function loadDiff(from, to) {
    var diffArea = document.getElementById('version-diff-area');
    if (!diffArea) return;
    while (diffArea.firstChild) diffArea.removeChild(diffArea.firstChild);
    var loading = document.createElement('div');
    loading.className = 'version-loading';
    loading.textContent = 'Loading diff\u2026';
    diffArea.appendChild(loading);

    fetch('/api/entity/diff?entity=' + encodeURIComponent(entitySlug) +
          '&from=' + from + '&to=' + to)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderDiff(diffArea, data, from, to);
      })
      .catch(function () {
        while (diffArea.firstChild) diffArea.removeChild(diffArea.firstChild);
        var err = document.createElement('div');
        err.className = 'version-error';
        err.textContent = 'Failed to load diff.';
        diffArea.appendChild(err);
      });
  }

  // --- Render diff sections ---
  function renderDiff(container, data, from, to) {
    while (container.firstChild) container.removeChild(container.firstChild);

    var header = document.createElement('div');
    header.className = 'diff-header';

    var fromLabel = document.createElement('span');
    fromLabel.className = 'diff-from-label';
    fromLabel.textContent = 'v' + from;
    header.appendChild(fromLabel);

    var arrow = document.createTextNode(' \u2192 ');
    header.appendChild(arrow);

    var toLabel = document.createElement('span');
    toLabel.className = 'diff-to-label';
    toLabel.textContent = 'v' + to;
    header.appendChild(toLabel);

    container.appendChild(header);

    var sections = data.sections || [];
    if (!sections.length) {
      var empty = document.createElement('div');
      empty.className = 'version-empty';
      empty.textContent = 'No sections found in these versions.';
      container.appendChild(empty);
      return;
    }

    sections.forEach(function (section) {
      container.appendChild(renderDiffSection(section, from, to));
    });
  }

  // --- Render a single section diff ---
  // rollbackVersion = older version to restore to; currentVersion = newer version for labels
  function renderDiffSection(section, rollbackVersion, currentVersion) {
    var el = document.createElement('div');
    el.className = 'diff-section diff-section-' + section.status;

    var sectionHeader = document.createElement('div');
    sectionHeader.className = 'diff-section-header';

    var headingSpan = document.createElement('span');
    headingSpan.className = 'diff-section-heading';
    headingSpan.textContent = section.heading;
    sectionHeader.appendChild(headingSpan);

    var statusBadge = document.createElement('span');
    statusBadge.className = 'diff-status-badge diff-status-' + section.status;
    statusBadge.textContent = section.status;
    sectionHeader.appendChild(statusBadge);

    el.appendChild(sectionHeader);

    if (section.status === 'unchanged') {
      el.classList.add('collapsed');
      sectionHeader.title = 'Click to expand unchanged section';
      sectionHeader.style.cursor = 'pointer';
      sectionHeader.addEventListener('click', function () {
        el.classList.toggle('collapsed');
      });
      return el;
    }

    if (section.status === 'modified' && section.diff) {
      var diffLines = parseDiffHunks(section.diff);
      var diffEl = document.createElement('div');
      diffEl.className = 'diff-lines';
      diffLines.forEach(function (line) {
        var lineEl = document.createElement('div');
        lineEl.className = 'diff-line diff-line-' + line.type;
        var prefix = document.createElement('span');
        prefix.className = 'diff-line-prefix';
        prefix.textContent = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
        lineEl.appendChild(prefix);
        var text = document.createElement('span');
        text.className = 'diff-line-text';
        text.textContent = line.text;
        lineEl.appendChild(text);
        diffEl.appendChild(lineEl);
      });
      el.appendChild(diffEl);

      // Rollback button for the "to" version's state
      var rollbackBtn = document.createElement('button');
      rollbackBtn.className = 'btn btn-small rollback-btn';
      rollbackBtn.textContent = '\u23EA Rollback to v' + rollbackVersion;
      // Use pathKey for disambiguation when available, fall back to heading
      var rollbackKey = section.pathKey || section.heading;
      rollbackBtn.setAttribute('data-section', rollbackKey);
      rollbackBtn.setAttribute('data-version', String(rollbackVersion));
      rollbackBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof window.showRollbackModal === 'function') {
          window.showRollbackModal(rollbackKey, rollbackVersion);
        }
      });
      el.appendChild(rollbackBtn);
    }

    if (section.status === 'added') {
      var addedNote = document.createElement('div');
      addedNote.className = 'diff-added-note';
      addedNote.textContent = '(new section in v' + currentVersion + ')';
      el.appendChild(addedNote);
    }

    if (section.status === 'removed') {
      var removedNote = document.createElement('div');
      removedNote.className = 'diff-removed-note';
      removedNote.textContent = '(section removed in v' + currentVersion + ')';
      el.appendChild(removedNote);
    }

    return el;
  }

  // --- Parse unified diff string into line objects ---
  // Returns [{type: 'add'|'del'|'ctx', text: string}]
  // Skips file headers (---/+++) and hunk headers (@@)
  function parseDiffHunks(patch) {
    var lines = patch.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.startsWith('---') || line.startsWith('+++')) continue;
      if (line.startsWith('@@')) continue;
      if (line.startsWith('+')) {
        result.push({ type: 'add', text: line.slice(1) });
      } else if (line.startsWith('-')) {
        result.push({ type: 'del', text: line.slice(1) });
      } else if (line.startsWith(' ')) {
        result.push({ type: 'ctx', text: line.slice(1) });
      }
    }
    return result;
  }

  // Expose so detail.js can refresh after rollback
  window.refreshVersionHistory = function () {
    if (specPanel.style.display === 'none') {
      loadVersions();
    }
  };

  // Expose parseDiffHunks so other scripts (e.g. permission modal) share one implementation
  window.spacedock_parseDiffHunks = parseDiffHunks;
})();
