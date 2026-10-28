import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react';

export interface ExitProtection {
  busy?: boolean;
  dirty?: boolean;
  photos?: boolean;
  pending?: boolean;
  keep?: () => Promise<void>;
  discard?: () => Promise<void>;
  preservePending?: () => Promise<void>;
  prepareClose?: () => void;
  resume?: () => void;
}
export interface ScreenExit {
  leaving: boolean;
  register: (read: () => ExitProtection) => () => void;
  request: (action: () => void, destination?: string, stayOnRoute?: boolean) => Promise<void>;
  home: () => void;
  tasks: () => void;
  back: () => void;
  capture: () => () => boolean;
  setSubtitle: (value: string | undefined) => void;
}
export const ScreenExitContext = createContext<ScreenExit | null>(null);
export function useScreenExit() { return useContext(ScreenExitContext); }
export function useScreenSubtitle(value: string | undefined) {
  const setSubtitle = useScreenExit()?.setSubtitle;
  useLayoutEffect(() => { setSubtitle?.(value); return () => setSubtitle?.(undefined); }, [setSubtitle, value]);
}
/** The callback only dismisses UI; another dirty check would reuse stale render state. */
export function useModalExit(close: () => void) {
  const exit = useScreenExit();
  return useCallback(() => { if (exit) void exit.request(close, 'quay lại', true); else close(); }, [exit, close]);
}

/** Protections belong to this route only, including its native Modal children. */
export function useExitProtection(read: () => ExitProtection) {
  const exit = useScreenExit();
  const latest = useRef(read);
  const register = exit?.register;
  useLayoutEffect(() => { latest.current = read; });
  useLayoutEffect(() => register?.(() => latest.current()), [register]);
}
