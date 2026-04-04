// web/static/detail.js

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
    });
}

function addTag() {
    var input = document.getElementById('tag-input');
    var tag = input.value.trim();
    if (!tag || currentTags.indexOf(tag) !== -1) return;
    currentTags.push(tag);
    input.value = '';
    saveTags();
}

function removeTag(tag) {
    currentTags = currentTags.filter(function(t) { return t !== tag; });
    saveTags();
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
