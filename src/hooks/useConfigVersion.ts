import { useSyncExternalStore } from "react";
import { getConfigVersion, subscribeConfig } from "@/lib/appConfig";

/** Re-renders the calling screen when the routine or schedule changes. */
export function useConfigVersion(): number {
  return useSyncExternalStore(subscribeConfig, getConfigVersion, getConfigVersion);
}
