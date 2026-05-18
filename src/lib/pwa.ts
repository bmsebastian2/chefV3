interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let _prompt: BeforeInstallPromptEvent | null =
  typeof window !== "undefined" ? (window as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt ?? null : null;

const _listeners = new Set<() => void>();
let _subscribed = false;

function _notify() {
  _listeners.forEach((l) => l());
}

function _ensureListener() {
  if (_subscribed || typeof window === "undefined") return;
  _subscribed = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    _prompt = e as BeforeInstallPromptEvent;
    _notify();
  });

  // Dispara cuando Chrome instala la PWA por cualquier medio (menú, botón nuestro, etc.)
  window.addEventListener("appinstalled", () => {
    localStorage.setItem("pwa-installed", "1");
    _prompt = null;
    _notify();
  });

  // Chrome no dispara beforeinstallprompt si la app ya está instalada.
  // Si tras 3 s no llegó el evento y no estamos en standalone, preguntamos al browser.
  setTimeout(() => {
    if (_prompt || localStorage.getItem("pwa-installed")) return;
    if ("getInstalledRelatedApps" in navigator) {
      (navigator as { getInstalledRelatedApps: () => Promise<unknown[]> })
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps.length > 0) {
            localStorage.setItem("pwa-installed", "1");
            _notify();
          }
        })
        .catch(() => {});
    }
  }, 3000);
}

// ── Exports usados por useSyncExternalStore ──────────────────────────────────

export function pwaSubscribe(cb: () => void) {
  _ensureListener();
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export type PwaSnap =
  | "hidden"
  | "prompt"
  | "manual-chrome-desktop"
  | "manual-chrome-mobile"
  | "manual-samsung"
  | "ios";

export function pwaSnapshot(): PwaSnap {
  // Abierta como app instalada (standalone) → ocultar sin persistir
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  ) {
    return "hidden";
  }
  // Instalada anteriormente (flag puesto por appinstalled o pwaInstall)
  if (localStorage.getItem("pwa-installed")) return "hidden";
  if (localStorage.getItem("install-dismissed")) return "hidden";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  if (_prompt) return "prompt";
  if (/SamsungBrowser/.test(navigator.userAgent)) return "manual-samsung";
  return _isMobile() ? "manual-chrome-mobile" : "manual-chrome-desktop";
}

export const pwaServerSnapshot = () => "hidden" as const;

// ── Acciones ─────────────────────────────────────────────────────────────────

export async function pwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!_prompt) return "unavailable";
  await _prompt.prompt();
  const { outcome } = await _prompt.userChoice;
  _prompt = null;
  if (outcome === "accepted") localStorage.setItem("pwa-installed", "1");
  _notify();
  return outcome;
}

export function pwaDismiss() {
  localStorage.setItem("install-dismissed", "1");
  _notify();
}
