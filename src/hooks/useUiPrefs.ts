import { useSyncExternalStore } from "react";
import { getUiPrefs, subscribeUiPrefs } from "@/lib/uiPrefs";

export function useUiPrefs() {
  return useSyncExternalStore(subscribeUiPrefs, getUiPrefs, getUiPrefs);
}
