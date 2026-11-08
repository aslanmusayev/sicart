"use client";
// Which cart and session this phone is connected to. Lives in localStorage (memory fallback) and is read with
// useSyncExternalStore so server and first client render agree (undefined = not loaded yet).
import { useSyncExternalStore } from "react";
import type { PersonaKey } from "../data/personas";

export interface PhoneIdentity {
  cartId: number;
  sessionId: string;
  name: string;
  persona: PersonaKey | null;
}

const KEY = "sicart.phone.identity";
let memory: string | null = null;
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

let cachedRaw: string | null | undefined;
let cachedValue: PhoneIdentity | null = null;

/** Returns the same object while the stored string is unchanged (useSyncExternalStore needs a stable snapshot). */
function snapshot(): PhoneIdentity | null {
  const raw = read();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as PhoneIdentity) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

export function setIdentity(identity: PhoneIdentity | null) {
  const raw = identity ? JSON.stringify(identity) : null;
  memory = raw;
  try {
    if (raw) localStorage.setItem(KEY, raw);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** undefined = not loaded yet (server render), null = not connected. */
export function useIdentity(): PhoneIdentity | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
