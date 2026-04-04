(function () {
  "use strict";

  var POLL_INTERVAL = 5000;
  var container = document.getElementById("workflows-container");
  var sortState = {};

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
      wf.stages.forEach(function (stage) {
        var count = (wf.entity_count_by_stage || {})[stage.name] || 0;
        var chip = el("span", { className: "stage-chip" }, [
          stage.name,
          el("span", { className: "count", textContent: String(count) })
        ]);
        pipeline.appendChild(chip);
      });
      card.appendChild(pipeline);

      if (wf.entities.length > 0) {
        var sort = sortState[wfIdx] || { column: "id", asc: true };
        var sorted = sortEntities(wf.entities, sort.column, sort.asc);
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
          var row = document.createElement("tr");
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
