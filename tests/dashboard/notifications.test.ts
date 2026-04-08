import { describe, test, expect, beforeEach } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

// ---- Browser API shims ----

class MockNotification {
  static permission: NotificationPermission = "granted";
  static _instances: MockNotification[] = [];
  title: string;
  options: NotificationOptions;
  closed = false;
  onclick: ((this: Notification, ev: Event) => void) | null = null;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options || {};
    MockNotification._instances.push(this);
  }

  close() { this.closed = true; }

  static reset() {
    MockNotification._instances = [];
    MockNotification.permission = "granted";
  }

  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve(MockNotification.permission);
  }
}

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

// Load notifications.js via script evaluation into a controlled sandbox.
// The module is a browser IIFE that writes to globalThis — we pass a sandbox
// object as `globalThis` so each test gets a clean, isolated instance.
const MODULE_SRC = readFileSync(
  join(import.meta.dir, "../../tools/dashboard/static/notifications.js"),
  "utf8"
);

type NotificationsModule = {
  SpacedockNotifications: {
    getConfig: () => { enabled: boolean; types: Record<string, boolean> };
    saveConfig: (c: { enabled: boolean; types: Record<string, boolean> }) => void;
    getPermissionState: () => string;
    requestPermission: (onGranted?: () => void, onDenied?: (r: string) => void) => void;
    showNotification: (opts: {
      type: string; entity?: string; title?: string;
      body?: string; onClick?: () => void;
    }) => MockNotification | undefined;
    _dedupKey: (type: string, entity: string, detail: string) => string;
    _dedupMap: Map<string, number>;
    _isDuplicate: (key: string) => boolean;
  };
  localStorage: MockLocalStorage;
};

function loadModule(overrides: {
  Notification?: unknown;
  document?: { visibilityState: string };
} = {}): NotificationsModule {
  const ls = new MockLocalStorage();
  const notifClass = "Notification" in overrides ? overrides.Notification : MockNotification;
  const doc = overrides.document ?? { visibilityState: "hidden" };
  const win = { focus: () => {} };

  // Build a plain-object sandbox. The IIFE receives it as `globalThis`.
  const sandbox: Record<string, unknown> = {
    localStorage: ls,
    Notification: notifClass,
    document: doc,
    window: win,
  };
  // Self-referential: the IIFE does `typeof globalThis !== "undefined" ? globalThis : this`
  sandbox.globalThis = sandbox;

  // Use eval-based isolation: wrap module in a function that shadows globals.
  // We control the source (it's our own file), so this is safe.
  const keys = Object.keys(sandbox);
  const vals = keys.map((k) => sandbox[k]);
  // eslint-disable-next-line no-new-func
  const wrapped = Function(...keys, MODULE_SRC);
  wrapped(...vals);

  return sandbox as unknown as NotificationsModule;
}

// ---- Tests ----

describe("notifications.js", () => {
  beforeEach(() => {
    MockNotification.reset();
  });

  describe("getConfig / saveConfig", () => {
    test("returns defaults when localStorage is empty", () => {
      const mod = loadModule();
      const cfg = mod.SpacedockNotifications.getConfig();
      expect(cfg.enabled).toBe(false);
      expect(cfg.types.gate).toBe(true);
      expect(cfg.types.entity_shipped).toBe(false);
    });

    test("round-trips saved config", () => {
      const mod = loadModule();
      const n = mod.SpacedockNotifications;
      n.saveConfig({
        enabled: true,
        types: { gate: false, permission_request: true, comment: true, channel_response: true, pr_ready: true, pipeline_error: true, entity_shipped: true },
      });
      const cfg = n.getConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.types.gate).toBe(false);
      expect(cfg.types.entity_shipped).toBe(true);
    });

    test("merges partial saved config with defaults", () => {
      const mod = loadModule();
      mod.localStorage.setItem(
        "dashboard.notifications.config",
        JSON.stringify({ enabled: true, types: { gate: false } })
      );
      const cfg = mod.SpacedockNotifications.getConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.types.gate).toBe(false);
      // Defaults fill in missing fields
      expect(cfg.types.permission_request).toBe(true);
      expect(cfg.types.entity_shipped).toBe(false);
    });
  });

  describe("_dedupKey", () => {
    test("produces stable key from type+entity+detail", () => {
      const mod = loadModule();
      const k1 = mod.SpacedockNotifications._dedupKey("gate", "041", "Awaiting approval");
      const k2 = mod.SpacedockNotifications._dedupKey("gate", "041", "Awaiting approval");
      expect(k1).toBe(k2);
    });

    test("truncates detail to 32 chars", () => {
      const mod = loadModule();
      const key = mod.SpacedockNotifications._dedupKey("comment", "foo", "A".repeat(64));
      expect(key).toBe("comment:foo:" + "A".repeat(32));
    });

    test("different types produce different keys", () => {
      const mod = loadModule();
      const k1 = mod.SpacedockNotifications._dedupKey("gate", "foo", "x");
      const k2 = mod.SpacedockNotifications._dedupKey("comment", "foo", "x");
      expect(k1).not.toBe(k2);
    });
  });

  describe("showNotification", () => {
    function enabledConfig() {
      return {
        enabled: true,
        types: {
          gate: true, permission_request: true, comment: true,
          channel_response: true, pr_ready: true, pipeline_error: true, entity_shipped: false,
        },
      };
    }

    test("fires Notification when enabled and permission granted", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "gate", entity: "041", title: "Gate pending", body: "Awaiting approval" });
      expect(MockNotification._instances.length).toBe(1);
      expect(MockNotification._instances[0].title).toBe("Gate pending");
    });

    test("does NOT fire when notifications disabled", () => {
      const mod = loadModule();
      // Default config has enabled=false
      mod.SpacedockNotifications.showNotification({ type: "gate", entity: "041", title: "Gate", body: "x" });
      expect(MockNotification._instances.length).toBe(0);
    });

    test("does NOT fire when permission is denied", () => {
      MockNotification.permission = "denied";
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "gate", entity: "041", title: "Gate", body: "x" });
      expect(MockNotification._instances.length).toBe(0);
    });

    test("does NOT fire when tab is visible", () => {
      const mod = loadModule({ document: { visibilityState: "visible" } });
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "gate", entity: "041", title: "Gate", body: "x" });
      expect(MockNotification._instances.length).toBe(0);
    });

    test("does NOT fire when type is disabled in config", () => {
      const mod = loadModule();
      const cfg = enabledConfig();
      cfg.types.gate = false;
      mod.SpacedockNotifications.saveConfig(cfg);
      mod.SpacedockNotifications.showNotification({ type: "gate", entity: "041", title: "Gate", body: "x" });
      expect(MockNotification._instances.length).toBe(0);
    });

    test("dedup: second call within 30s with same key is suppressed", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "comment", entity: "041", title: "Comment", body: "FO said hello" });
      mod.SpacedockNotifications.showNotification({ type: "comment", entity: "041", title: "Comment", body: "FO said hello" });
      expect(MockNotification._instances.length).toBe(1);
    });

    test("dedup: different entity is not suppressed", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "comment", entity: "041", title: "Comment", body: "x" });
      mod.SpacedockNotifications.showNotification({ type: "comment", entity: "042", title: "Comment", body: "x" });
      expect(MockNotification._instances.length).toBe(2);
    });

    test("entity_shipped is suppressed when disabled in config", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig()); // entity_shipped: false
      mod.SpacedockNotifications.showNotification({ type: "entity_shipped", entity: "041", title: "Shipped!", body: "done" });
      expect(MockNotification._instances.length).toBe(0);
    });

    test("pr_ready fires when enabled", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "pr_ready", entity: "041", title: "PR ready", body: "PR #42 ready" });
      expect(MockNotification._instances.length).toBe(1);
    });

    test("pipeline_error fires when enabled", () => {
      const mod = loadModule();
      mod.SpacedockNotifications.saveConfig(enabledConfig());
      mod.SpacedockNotifications.showNotification({ type: "pipeline_error", entity: "041", title: "Error", body: "execute failed" });
      expect(MockNotification._instances.length).toBe(1);
    });
  });

  describe("getPermissionState", () => {
    test("returns granted when Notification.permission is granted", () => {
      const mod = loadModule();
      expect(mod.SpacedockNotifications.getPermissionState()).toBe("granted");
    });

    test("returns unsupported when Notification is undefined", () => {
      const mod = loadModule({ Notification: undefined });
      expect(mod.SpacedockNotifications.getPermissionState()).toBe("unsupported");
    });
  });
});
