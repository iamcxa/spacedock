/**
 * Visual workflow editor — drag-to-reorder, add/remove stages,
 * property editing, undo/redo, validation, and write-back.
 *
 * Uses Pointer Events API for SVG drag (NOT HTML5 Drag API).
 * Coordinates converted via getScreenCTM() for accurate SVG positioning.
 */
(function (window) {
  "use strict";

  // --- Undo/Redo (Memento pattern) ---

  function EditorState(stages) {
    this.stages = JSON.parse(JSON.stringify(stages));
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
  }

  EditorState.prototype.snapshot = function () {
    this.undoStack.push(JSON.parse(JSON.stringify(this.stages)));
    this.redoStack = [];
    this.dirty = true;
  };

  EditorState.prototype.undo = function () {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.parse(JSON.stringify(this.stages)));
    this.stages = this.undoStack.pop();
    this.dirty = this.undoStack.length > 0;
    return true;
  };

  EditorState.prototype.redo = function () {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.parse(JSON.stringify(this.stages)));
    this.stages = this.redoStack.pop();
    this.dirty = true;
    return true;
  };

  // --- Validation ---

  function validateStages(stages, entityCountByStage) {
    var errors = [];

    if (stages.length === 0) {
      errors.push("Pipeline must have at least one stage");
      return errors;
    }

    // Check for terminal stage
    var hasTerminal = stages.some(function (s) { return s.terminal; });
    if (!hasTerminal) {
      errors.push("Pipeline must have a terminal stage");
    }

    // Check for initial stage
    var hasInitial = stages.some(function (s) { return s.initial; });
    if (!hasInitial) {
      errors.push("Pipeline must have an initial stage");
    }

    // Check for unique names
    var names = {};
    stages.forEach(function (s) {
      if (names[s.name]) {
        errors.push("Duplicate stage name: " + s.name);
      }
      names[s.name] = true;
    });

    // Check feedback-to targets exist
    stages.forEach(function (s) {
      if (s.feedback_to && !names[s.feedback_to]) {
        errors.push(s.name + ": feedback-to target '" + s.feedback_to + "' does not exist");
      }
    });

    // Warn if removing stages that have entities
    if (entityCountByStage) {
      Object.keys(entityCountByStage).forEach(function (stageName) {
        if (entityCountByStage[stageName] > 0 && !names[stageName]) {
          errors.push("Stage '" + stageName + "' has " + entityCountByStage[stageName] + " entities but was removed");
        }
      });
    }

    return errors;
  }

  // --- Drag-and-drop via Pointer Events ---

  function setupDragReorder(svgElement, editorState, onReorder) {
    var dragging = null; // { idx, startX, startY, node }

    function screenToSVG(evt) {
      var ctm = svgElement.getScreenCTM();
      return {
        x: (evt.clientX - ctm.e) / ctm.a,
        y: (evt.clientY - ctm.f) / ctm.d,
      };
    }

    svgElement.addEventListener("pointerdown", function (evt) {
      var nodeEl = evt.target.closest(".pipeline-node");
      if (!nodeEl) return;
      var stageName = nodeEl.getAttribute("data-stage");
      var idx = editorState.stages.findIndex(function (s) { return s.name === stageName; });
      if (idx === -1) return;

      evt.preventDefault();
      svgElement.setPointerCapture(evt.pointerId);
      dragging = { idx: idx, startX: screenToSVG(evt).x, originIdx: idx };
      nodeEl.classList.add("dragging");
    });

    svgElement.addEventListener("pointermove", function (evt) {
      if (!dragging) return;
      evt.preventDefault();
      var pos = screenToSVG(evt);

      // Determine which slot the pointer is over
      var nodeWidth = 120 + 60; // NODE_W + NODE_GAP_X
      var targetIdx = Math.round((pos.x - 30) / nodeWidth); // 30 = PADDING
      targetIdx = Math.max(0, Math.min(targetIdx, editorState.stages.length - 1));

      if (targetIdx !== dragging.idx) {
        // Move the stage in the array
        editorState.snapshot();
        var stage = editorState.stages.splice(dragging.idx, 1)[0];
        editorState.stages.splice(targetIdx, 0, stage);
        dragging.idx = targetIdx;
        if (onReorder) onReorder();
      }
    });

    svgElement.addEventListener("pointerup", function (evt) {
      if (!dragging) return;
      svgElement.releasePointerCapture(evt.pointerId);
      var nodes = svgElement.querySelectorAll(".pipeline-node");
      nodes.forEach(function (n) { n.classList.remove("dragging"); });
      dragging = null;
    });
  }

  // --- Stage property editor panel ---

  function createPropsPanel(stage, editorState, entityCountByStage, onUpdate) {
    var panel = document.createElement("div");
    panel.className = "editor-props-panel";

    function addCheckbox(label, prop) {
      var lbl = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!stage[prop];
      cb.addEventListener("change", function () {
        editorState.snapshot();
        stage[prop] = cb.checked;
        if (onUpdate) onUpdate();
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(" " + label));
      panel.appendChild(lbl);
    }

    // Stage name (read-only display)
    var nameP = document.createElement("div");
    nameP.style.marginBottom = "0.5rem";
    nameP.style.fontWeight = "600";
    nameP.style.color = "#f0f6fc";
    nameP.textContent = stage.name;
    panel.appendChild(nameP);

    addCheckbox("Gate", "gate");
    addCheckbox("Terminal", "terminal");
    addCheckbox("Initial", "initial");
    addCheckbox("Conditional", "conditional");

    // Feedback-to select
    var fbLabel = document.createElement("label");
    fbLabel.textContent = "Feedback to: ";
    var fbSelect = document.createElement("select");
    var noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "(none)";
    fbSelect.appendChild(noneOpt);
    editorState.stages.forEach(function (s) {
      if (s.name === stage.name) return;
      var opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name;
      if (stage.feedback_to === s.name) opt.selected = true;
      fbSelect.appendChild(opt);
    });
    fbSelect.addEventListener("change", function () {
      editorState.snapshot();
      stage.feedback_to = fbSelect.value;
      if (onUpdate) onUpdate();
    });
    fbLabel.appendChild(fbSelect);
    panel.appendChild(fbLabel);

    return panel;
  }

  // --- Editor toolbar ---

  function createToolbar(editorState, workflowDir, entityCountByStage, onUpdate, onSaved) {
    var bar = document.createElement("div");
    bar.className = "editor-toolbar";

    // Add stage button
    var addBtn = document.createElement("button");
    addBtn.className = "editor-btn";
    addBtn.textContent = "+ Add Stage";
    addBtn.addEventListener("click", function () {
      var name = prompt("Stage name:");
      if (!name || !name.trim()) return;
      name = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (editorState.stages.some(function (s) { return s.name === name; })) {
        alert("Stage '" + name + "' already exists");
        return;
      }
      editorState.snapshot();
      editorState.stages.push({
        name: name,
        worktree: true,
        concurrency: 2,
        gate: false,
        terminal: false,
        initial: false,
        feedback_to: "",
        conditional: false,
        model: "",
      });
      if (onUpdate) onUpdate();
    });
    bar.appendChild(addBtn);

    // Undo button
    var undoBtn = document.createElement("button");
    undoBtn.className = "editor-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", function () {
      if (editorState.undo()) {
        if (onUpdate) onUpdate();
      }
    });
    bar.appendChild(undoBtn);

    // Redo button
    var redoBtn = document.createElement("button");
    redoBtn.className = "editor-btn";
    redoBtn.textContent = "Redo";
    redoBtn.addEventListener("click", function () {
      if (editorState.redo()) {
        if (onUpdate) onUpdate();
      }
    });
    bar.appendChild(redoBtn);

    // Save button
    var saveBtn = document.createElement("button");
    saveBtn.className = "editor-btn save";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", function () {
      var errors = validateStages(editorState.stages, entityCountByStage);
      if (errors.length > 0) {
        alert("Validation errors:\n" + errors.join("\n"));
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      fetch("/api/workflow/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dir: workflowDir,
          stages: editorState.stages,
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.ok) {
            editorState.dirty = false;
            editorState.undoStack = [];
            editorState.redoStack = [];
            if (onSaved) onSaved();
          } else {
            alert("Save failed: " + (data.error || "Unknown error"));
          }
        })
        .catch(function (err) {
          alert("Save failed: " + err.message);
        })
        .finally(function () {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        });
    });
    bar.appendChild(saveBtn);

    return bar;
  }

  // --- Main editor entry point ---

  /**
   * @param {HTMLElement} container - DOM element to render editor into
   * @param {Array} stages - Stage objects from API (will be deep-cloned)
   * @param {Object} entityCountByStage - {stageName: count}
   * @param {string} workflowDir - workflow directory path for write-back
   * @param {Function} onSaved - callback after successful save
   */
  function createEditor(container, stages, entityCountByStage, workflowDir, onSaved) {
    var state = new EditorState(stages);
    var selectedStage = null;

    function renderEditor() {
      container.textContent = "";

      // Toolbar
      var toolbar = createToolbar(state, workflowDir, entityCountByStage, renderEditor, function () {
        if (onSaved) onSaved();
        renderEditor();
      });
      container.appendChild(toolbar);

      // Error display
      var errorContainer = document.createElement("div");
      container.appendChild(errorContainer);

      // SVG graph in edit mode
      var graphWrapper = document.createElement("div");
      graphWrapper.className = "pipeline-graph-container";
      var svgGraph = window.SpacedockVisualizer.renderPipelineGraph(
        state.stages,
        entityCountByStage,
        new Set(),
        function (stageName) {
          selectedStage = stageName;
          renderEditor();
        }
      );
      if (svgGraph) {
        // Enable drag reorder
        setupDragReorder(svgGraph, state, renderEditor);
        graphWrapper.appendChild(svgGraph);
      }
      container.appendChild(graphWrapper);

      // Properties panel for selected stage
      if (selectedStage) {
        var stage = state.stages.find(function (s) { return s.name === selectedStage; });
        if (stage) {
          // Remove button
          var removeBtn = document.createElement("button");
          removeBtn.className = "editor-btn danger";
          removeBtn.textContent = "Remove " + stage.name;
          var count = (entityCountByStage || {})[stage.name] || 0;
          removeBtn.addEventListener("click", function () {
            if (count > 0) {
              if (!confirm(stage.name + " has " + count + " entities. Remove anyway?")) return;
            }
            state.snapshot();
            state.stages = state.stages.filter(function (s) { return s.name !== stage.name; });
            selectedStage = null;
            renderEditor();
          });
          container.appendChild(removeBtn);

          var propsContainer = createPropsPanel(stage, state, entityCountByStage, renderEditor);
          container.appendChild(propsContainer);
        }
      }

      // Show validation errors live
      var errors = validateStages(state.stages, entityCountByStage);
      if (errors.length > 0) {
        errors.forEach(function (err) {
          var errEl = document.createElement("div");
          errEl.className = "editor-validation-error";
          errEl.textContent = err;
          errorContainer.appendChild(errEl);
        });
      }
    }

    renderEditor();
    return state;
  }

  // Export
  window.SpacedockEditor = {
    createEditor: createEditor,
    validateStages: validateStages,
  };
})(window);
