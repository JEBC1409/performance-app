/** Synced ("karaoke") lyrics for the song playing in Focus.
 *
 * YouTube doesn't hand over lyrics, so they come from LRCLIB (lrclib.net), a
 * free community database of time-stamped lyrics. The only thing sent there is
 * the song's title and artist. */

export interface LyricLine {
  /** Seconds into the song when the line starts. */
  t: number;
  /** The line itself; "" marks an instrumental gap. */
  text: string;
}

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Parses an LRC file ("[01:23.45] line") into sorted lines. Metadata tags such
 * as [ar:…] are ignored, a line may carry several timestamps (a repeated
 * chorus), and runs of empty lines collapse into one gap. */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(TIMESTAMP)];
    if (!stamps.length) continue;
    const text = raw.replace(TIMESTAMP, "").trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(`0.${m[3]}`) : 0;
      out.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out.filter((l, i) => !(l.text === "" && (i === 0 || out[i - 1].text === "")));
}

/** Index of the line being sung at `t` seconds, or -1 before the first one. */
export function activeLineIndex(lines: LyricLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

// Words that mark the "(Official Video)" kind of decoration in YouTube titles.
const NOISE = /official|video|audio|lyric|letra|visuali[sz]er|\bhd\b|\b4k\b|\bhq\b|remaster|music video|mv\b|con letra|subtitulad|sub español/i;

function stripNoise(s: string): string {
  return s
    .replace(/[([{][^)\]}]*[)\]}]/g, (m) => (NOISE.test(m) ? "" : m))
    .replace(/\s*[|｜]\s.*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Guesses the song and artist from a YouTube title and channel name:
 * "Artist - Song (Official Video)" on "ArtistVEVO" → { Song, Artist }. */
export function cleanTrack(title: string, author: string): { track: string; artist: string } {
  const channel = author
    .replace(/\s*-\s*topic$/i, "")
    .replace(/\s*vevo$/i, "")
    .replace(/\s*official$/i, "")
    .trim();
  const cleaned = stripNoise(title);
  const dash = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { artist: dash[1].trim(), track: dash[2].replace(/\s+[-–—]\s+.*$/, "").trim() };
  return { artist: channel, track: cleaned };
}

export interface LrclibResult {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  syncedLyrics?: string | null;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Of the search results, the synced one that best matches this song: its
 * length must be within a few seconds of the video's (a remix or live cut has
 * different timings), and a matching title / artist wins ties. */
export function pickBest(results: LrclibResult[], track: string, artist: string, duration: number): LyricLine[] | null {
  const wantTrack = norm(track);
  const wantArtist = norm(artist);
  let best: { score: number; lrc: string } | null = null;
  for (const r of results) {
    if (!r.syncedLyrics || r.instrumental) continue;
    const gap = duration > 0 && r.duration ? Math.abs(r.duration - duration) : 0;
    if (gap > 6) continue;
    const gotTrack = norm(r.trackName ?? "");
    const gotArtist = norm(r.artistName ?? "");
    let score = 10 - gap;
    if (gotTrack && gotTrack === wantTrack) score += 6;
    else if (gotTrack && wantTrack && (gotTrack.includes(wantTrack) || wantTrack.includes(gotTrack))) score += 3;
    if (wantArtist && gotArtist && (gotArtist.includes(wantArtist) || wantArtist.includes(gotArtist))) score += 4;
    if (!best || score > best.score) best = { score, lrc: r.syncedLyrics };
  }
  if (!best) return null;
  const lines = parseLrc(best.lrc);
  return lines.some((l) => l.text) ? lines : null;
}

const cache = new Map<string, LyricLine[] | null>();

async function search(params: Record<string, string>, signal?: AbortSignal): Promise<LrclibResult[]> {
  const res = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, { signal });
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as LrclibResult[]) : [];
}

/** Synced lyrics for a song, or null when there are none. Throws on a network
 * failure (so the caller can tell "no lyrics" from "couldn't check"). */
export async function fetchLyrics(key: string, track: string, artist: string, duration: number, signal?: AbortSignal): Promise<LyricLine[] | null> {
  if (cache.has(key)) return cache.get(key) ?? null;
  if (!track) return null;
  let lines = pickBest(await search(artist ? { track_name: track, artist_name: artist } : { track_name: track }, signal), track, artist, duration);
  // Channel names are often not the artist ("Lofi Girl"): retry with a free-text query.
  if (!lines) lines = pickBest(await search({ q: `${artist} ${track}`.trim() }, signal), track, artist, duration);
  cache.set(key, lines);
  return lines;
}
