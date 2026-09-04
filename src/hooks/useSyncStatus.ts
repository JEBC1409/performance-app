import { useSyncExternalStore } from "react";
import { getSyncSnapshot, subscribeSyncStatus } from "@/db/syncStatus";

export function useSyncStatus() {
  return useSyncExternalStore(subscribeSyncStatus, getSyncSnapshot, getSyncSnapshot);
}
