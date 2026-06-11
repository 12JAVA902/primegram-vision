import { useSyncExternalStore } from "react";

let muted = true;
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => muted;

export const setGlobalMuted = (v: boolean) => {
  if (muted === v) return;
  muted = v;
  listeners.forEach((l) => l());
};

export const useGlobalMute = (): [boolean, (v: boolean) => void] => {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setGlobalMuted];
};
