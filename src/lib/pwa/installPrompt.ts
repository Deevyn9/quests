// Holds the browser's deferred "install" event so a button can fire it later.
// A tiny external store, shaped for useSyncExternalStore.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canInstall() {
  return deferred !== null;
}

export function captureInstallPrompt(event: Event) {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  emit();
}

export function clearInstallPrompt() {
  deferred = null;
  emit();
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  // The event can only be used once.
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

let attached = false;
export function listenForInstall() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("beforeinstallprompt", captureInstallPrompt);
  window.addEventListener("appinstalled", clearInstallPrompt);
}