(function () {
  "use strict";

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

  var POLL_INTERVAL = 5000;
  var container = document.getElementById("workflows-container");
  var sortState = {};
  var filterState = (function loadFilterState() {
    try {
      var raw = sessionStorage.getItem("dashboardFilterState");
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      var result = {};
      Object.keys(parsed).forEach(function (k) {
        result[k] = new Set(parsed[k]);
      });
      return result;
    } catch (_) { return {}; }
  })();

  function saveFilterState() {
    var serializable = {};
    Object.keys(filterState).forEach(function (k) {
      serializable[k] = Array.from(filterState[k]);
    });
    try { sessionStorage.setItem("dashboardFilterState", JSON.stringify(serializable)); } catch (_) {}
  }

  function fetchWorkflows() {
    fetch("/api/workflows")
      .then(function (res) { return res.json(); })
      .then(function (data) { render(data); })
      .catch(function () {
        container.textContent = "";
        var p = document.createElement("p");
        p.className = "loading";
        p.textContent = "Error loading data. Retrying...";
        container.appendChild(p);
      });
  }

  function statusColor(status) {
    var colors = {
      backlog: "#8b949e",
      ideation: "#d2a8ff",
      implementation: "#58a6ff",
      validation: "#f0883e",
      done: "#3fb950",
      explore: "#d2a8ff",
      research: "#79c0ff",
      plan: "#58a6ff",
    };
    return colors[status] || "#8b949e";
  }

  function sortEntities(entities, column, ascending) {
    return entities.slice().sort(function (a, b) {
      var va = a[column] || "";
      var vb = b[column] || "";
      if (column === "score" || column === "id") {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      }
      if (va < vb) return ascending ? -1 : 1;
      if (va > vb) return ascending ? 1 : -1;
      return 0;
    });
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") { node.className = attrs[k]; }
        else if (k === "textContent") { node.textContent = attrs[k]; }
        else if (k.indexOf("style.") === 0) { node.style[k.slice(6)] = attrs[k]; }
        else { node.setAttribute(k, attrs[k]); }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (typeof child === "string") {
          node.appendChild(document.createTextNode(child));
        } else if (child) {
          node.appendChild(child);
        }
      });
    }
    return node;
  }

  function render(workflows) {
    container.textContent = "";

    if (!workflows.length) {
      container.appendChild(el("p", { className: "empty-state", textContent: "No Spacedock workflows found." }));
      return;
    }

    workflows.forEach(function (wf, wfIdx) {
      var card = el("div", { className: "workflow-card" });
      card.appendChild(el("h2", { textContent: wf.name }));

      var metaText = (wf.entity_label || wf.entity_type || "entity") + "s \u00B7 " + wf.entities.length + " total";
      card.appendChild(el("div", { className: "workflow-meta", textContent: metaText }));

      var pipeline = el("div", { className: "stage-pipeline" });
      var activeFilters = filterState[wfIdx] || new Set();
      wf.stages.forEach(function (stage) {
        var count = (wf.entity_count_by_stage || {})[stage.name] || 0;
        var isActive = activeFilters.has(stage.name);
        var chipClass = "stage-chip" + (isActive ? " stage-chip--active" : "");
        var chip = el("span", { className: chipClass }, [
          stage.name,
          el("span", { className: "count", textContent: String(count) })
        ]);
        chip.addEventListener("click", function () {
          if (!filterState[wfIdx]) filterState[wfIdx] = new Set();
          if (filterState[wfIdx].has(stage.name)) {
            filterState[wfIdx].delete(stage.name);
          } else {
            filterState[wfIdx].add(stage.name);
          }
          saveFilterState();
          fetchWorkflows();
        });
        pipeline.appendChild(chip);
      });
      card.appendChild(pipeline);

      if (wf.entities.length > 0) {
        var filters = filterState[wfIdx] || new Set();
        var filtered = filters.size > 0
          ? wf.entities.filter(function (e) { return filters.has(e.status); })
          : wf.entities;
        var sort = sortState[wfIdx] || { column: "id", asc: true };
        var sorted = sortEntities(filtered, sort.column, sort.asc);
        var columns = ["id", "slug", "status", "title", "score", "source"];

        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        columns.forEach(function (col) {
          var cls = "";
          if (sort.column === col) {
            cls = sort.asc ? "sorted-asc" : "sorted-desc";
          }
          var th = el("th", { className: cls, "data-wf": String(wfIdx), "data-col": col, textContent: col.toUpperCase() });
          th.addEventListener("click", function () {
            var prev = sortState[wfIdx] || { column: "id", asc: true };
            if (prev.column === col) {
              sortState[wfIdx] = { column: col, asc: !prev.asc };
            } else {
              sortState[wfIdx] = { column: col, asc: true };
            }
            fetchWorkflows();
          });
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        var tbody = document.createElement("tbody");
        sorted.forEach(function (e) {
          var isArchived = e.archived === "true" || e.status === "shipped";
          var row = document.createElement("tr");
          if (isArchived) {
            row.className = "entity-row--archived";
          }
          if (e.path) {
            row.style.cursor = "pointer";
            row.addEventListener("click", function () {
              window.location.href = "/detail?path=" + encodeURIComponent(e.path);
            });
          }
          columns.forEach(function (col) {
            var val = e[col] || "";
            var td = document.createElement("td");
            if (col === "status" && val) {
              var badge = el("span", { className: "status-badge" });
              badge.style.background = statusColor(val) + "22";
              badge.style.color = statusColor(val);
              badge.textContent = val;
              td.appendChild(badge);
            } else {
              td.textContent = val;
            }
            row.appendChild(td);
          });
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        card.appendChild(table);
      } else {
        card.appendChild(el("p", { className: "empty-state", textContent: "No entities." }));
      }

      container.appendChild(card);
    });
  }

  fetchWorkflows();
  setInterval(fetchWorkflows, POLL_INTERVAL);
})();
