import { localData } from "./localData";

// Run right before signing out. Removes the quests kept on this device and the
// offline copy of the page, so the next person on a shared device sees nothing.
export function clearLocalData() {
  localData.clearAll();
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
  } catch {
    // no service worker (dev mode, unsupported browser): nothing to clear
  }
}
