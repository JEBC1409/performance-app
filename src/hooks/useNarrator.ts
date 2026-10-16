import { useCallback, useEffect, useRef, useState } from "react";
import { chooseVoice, loadPrefs, narratorSupported, rankVoices, savePrefs, speakable } from "@/lib/narrator";
import type { NarratorPrefs } from "@/lib/narrator";

export type NarratorStatus = "idle" | "playing" | "paused";

interface Run {
  /** The chapter this belongs to; a different chapter makes it irrelevant. */
  key: string;
  status: NarratorStatus;
  current: number;
}

/** Reads a chapter aloud verse by verse, reporting which verse is being said so
 * the screen can follow along. One utterance per verse (short ones are reliable
 * across browsers, and let you skip, pause and resume at a verse boundary).
 * `resetKey` identifies the chapter: when it changes, whatever was being read
 * stops. `onFinish` fires after the last verse — and only then, not on stop. */
export function useNarrator(verses: string[], resetKey: string, onFinish?: () => void) {
  const supported = narratorSupported();
  const [run, setRun] = useState<Run>({ key: "", status: "idle", current: -1 });
  const [prefs, setPrefsState] = useState<NarratorPrefs>(loadPrefs);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const versesRef = useRef(verses);
  const keyRef = useRef(resetKey);
  const prefsRef = useRef(prefs);
  const voicesRef = useRef(voices);
  const finishRef = useRef(onFinish);
  const token = useRef(0);
  // speakFrom calls itself when a verse ends; through a ref, so it isn't read while still being defined.
  const speakRef = useRef<(i: number) => void>(() => undefined);
  const index = useRef(0);
  useEffect(() => {
    versesRef.current = verses;
    keyRef.current = resetKey;
    prefsRef.current = prefs;
    voicesRef.current = voices;
    finishRef.current = onFinish;
  });

  // Voices arrive asynchronously (and again if the system installs more).
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, [supported]);

  const set = useCallback((status: NarratorStatus, current: number) => setRun({ key: keyRef.current, status, current }), []);

  const speakFrom = useCallback(
    (i: number) => {
      if (!narratorSupported()) return;
      const synth = window.speechSynthesis;
      const mine = ++token.current;
      synth.cancel();
      const list = versesRef.current;
      if (i >= list.length) {
        index.current = 0;
        set("idle", -1);
        finishRef.current?.();
        return;
      }
      index.current = i;
      set("playing", i);
      // Some browsers drop a speak() issued in the same tick as cancel().
      window.setTimeout(() => {
        if (token.current !== mine) return;
        const p = prefsRef.current;
        const voice = chooseVoice(voicesRef.current, p.voiceURI);
        const u = new SpeechSynthesisUtterance(speakable(list[i]));
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? "es-419";
        u.rate = p.rate;
        u.pitch = p.pitch;
        u.onend = () => {
          if (token.current === mine) speakRef.current(i + 1);
        };
        u.onerror = (e) => {
          if (token.current !== mine || e.error === "interrupted" || e.error === "canceled") return;
          set("idle", -1);
        };
        synth.speak(u);
      }, 30);
    },
    [set],
  );

  useEffect(() => {
    speakRef.current = speakFrom;
  }, [speakFrom]);

  const stop = useCallback(() => {
    token.current++;
    if (narratorSupported()) window.speechSynthesis.cancel();
    index.current = 0;
    set("idle", -1);
  }, [set]);

  const pause = useCallback(() => {
    token.current++;
    if (narratorSupported()) window.speechSynthesis.cancel();
    setRun((r) => ({ ...r, status: "paused" }));
  }, []);

  /** Starts at verse `from` (0-based), or resumes where it was paused. */
  const play = useCallback((from?: number) => speakFrom(from ?? index.current), [speakFrom]);
  const next = useCallback(() => speakFrom(index.current + 1), [speakFrom]);
  const prev = useCallback(() => speakFrom(Math.max(0, index.current - 1)), [speakFrom]);

  // Another chapter: silence whatever was being read (this is not "finished").
  // The state needs no reset — a run from another chapter simply doesn't count.
  useEffect(() => {
    token.current++;
    index.current = 0;
    if (narratorSupported()) window.speechSynthesis.cancel();
  }, [resetKey]);
  // Leaving the screen stops the voice.
  useEffect(
    () => () => {
      token.current++;
      if (narratorSupported()) window.speechSynthesis.cancel();
    },
    [],
  );

  const setPrefs = useCallback((patch: Partial<NarratorPrefs>) => {
    setPrefsState((p) => {
      const merged = { ...p, ...patch };
      savePrefs(merged);
      return merged;
    });
  }, []);

  /** Says a short sample with the current settings (to choose a voice by ear). */
  const preview = useCallback(
    (voiceURI: string | null) => {
      if (!narratorSupported()) return;
      const synth = window.speechSynthesis;
      token.current++;
      synth.cancel();
      set("idle", -1);
      const p = prefsRef.current;
      const voice = chooseVoice(voicesRef.current, voiceURI);
      const u = new SpeechSynthesisUtterance("En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.");
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "es-419";
      u.rate = p.rate;
      u.pitch = p.pitch;
      window.setTimeout(() => synth.speak(u), 30);
    },
    [set],
  );

  const mine = run.key === resetKey;
  return {
    supported,
    status: mine ? run.status : ("idle" as NarratorStatus),
    current: mine ? run.current : -1,
    prefs,
    setPrefs,
    voices: rankVoices(voices),
    play,
    pause,
    stop,
    next,
    prev,
    preview,
  };
}
