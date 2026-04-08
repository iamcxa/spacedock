// ABOUTME: Browser notifications module for Spacedock dashboard.
// Handles permission, per-type config, dedup (30s), visibility suppression.
// Exported as singleton via window.SpacedockNotifications.

(function (global) {
  var CONFIG_KEY = "dashboard.notifications.config";

  var DEFAULT_CONFIG = {
    enabled: false,
    types: {
      gate: true,
      permission_request: true,
      comment: true,
      channel_response: true,
      pr_ready: true,
      pipeline_error: true,
      entity_shipped: false,
    },
  };

  // Events that should NOT auto-dismiss (require explicit close)
  var PERSISTENT_TYPES = new Set(["gate", "permission_request"]);

  // dedup: Map<key, timestamp_ms>
  var dedupMap = new Map();
  var DEDUP_WINDOW_MS = 30000;
  var DEDUP_CLEANUP_THRESHOLD_MS = 60000;

  function dedupKey(type, entity, detail) {
    return type + ":" + (entity || "") + ":" + (detail || "").slice(0, 32);
  }

  function cleanDedupMap() {
    var now = Date.now();
    dedupMap.forEach(function (ts, key) {
      if (now - ts > DEDUP_CLEANUP_THRESHOLD_MS) {
        dedupMap.delete(key);
      }
    });
  }

  function isDuplicate(key) {
    var ts = dedupMap.get(key);
    if (ts == null) return false;
    return (Date.now() - ts) < DEDUP_WINDOW_MS;
  }

  function getConfig() {
    try {
      var ls = global.localStorage;
      var raw = ls ? ls.getItem(CONFIG_KEY) : null;
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      var parsed = JSON.parse(raw);
      // Merge with defaults to handle missing fields from older config versions
      var config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      if (typeof parsed.enabled === "boolean") config.enabled = parsed.enabled;
      if (parsed.types && typeof parsed.types === "object") {
        Object.keys(config.types).forEach(function (t) {
          if (typeof parsed.types[t] === "boolean") config.types[t] = parsed.types[t];
        });
      }
      return config;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  function saveConfig(config) {
    try {
      var ls = global.localStorage;
      if (ls) ls.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) { /* storage full or private mode */ }
  }

  var NotifAPI = global.Notification;

  function getPermissionState() {
    if (!NotifAPI) return "unsupported";
    return NotifAPI.permission;
  }

  function requestPermission(onGranted, onDenied) {
    if (!NotifAPI) {
      if (onDenied) onDenied("unsupported");
      return;
    }
    if (NotifAPI.permission === "granted") {
      if (onGranted) onGranted();
      return;
    }
    if (NotifAPI.permission === "denied") {
      if (onDenied) onDenied("denied");
      return;
    }
    NotifAPI.requestPermission().then(function (result) {
      if (result === "granted") {
        if (onGranted) onGranted();
      } else {
        if (onDenied) onDenied(result);
      }
    });
  }

  function showNotification(opts) {
    // opts: { type, entity, title, body, onClick }
    var config = getConfig();
    if (!config.enabled) return;

    if (getPermissionState() !== "granted") return;

    // Visibility suppression: skip if tab is in foreground
    var doc = global.document;
    if (doc && doc.visibilityState === "visible") return;

    // Per-type filter
    if (config.types[opts.type] === false) return;

    // Dedup
    cleanDedupMap();
    var key = dedupKey(opts.type, opts.entity, opts.body);
    if (isDuplicate(key)) return;
    dedupMap.set(key, Date.now());

    var notifOpts = {
      body: opts.body || "",
      tag: key,
    };

    var n = new NotifAPI(opts.title || "Spacedock", notifOpts);

    // Auto-dismiss after 10s for non-persistent types
    if (!PERSISTENT_TYPES.has(opts.type)) {
      setTimeout(function () { n.close(); }, 10000);
    }

    if (opts.onClick) {
      n.onclick = function () {
        n.close();
        opts.onClick();
      };
    } else {
      n.onclick = function () {
        n.close();
        if (global.window) global.window.focus();
      };
    }

    return n;
  }

  // Export singleton
  global.SpacedockNotifications = {
    getConfig: getConfig,
    saveConfig: saveConfig,
    getPermissionState: getPermissionState,
    requestPermission: requestPermission,
    showNotification: showNotification,
    // Exposed for testing
    _dedupKey: dedupKey,
    _dedupMap: dedupMap,
    _isDuplicate: isDuplicate,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
