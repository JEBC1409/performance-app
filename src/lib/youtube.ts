/** What a pasted YouTube / YouTube Music link points at: a playlist to play
 * through, or a single video. A link with both (`watch?v=…&list=…`) plays the
 * playlist, starting from that video. */
export interface YouTubeSource {
  list?: string;
  video?: string;
}

const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);
const ID = /^[A-Za-z0-9_-]{6,64}$/;

export function parseYouTubeSource(input: string): YouTubeSource | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  const list = url.searchParams.get("list") ?? undefined;
  let video = url.searchParams.get("v") ?? undefined;
  if (!video && url.hostname.toLowerCase().endsWith("youtu.be")) video = url.pathname.split("/")[1] || undefined;
  if (!video) {
    const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
    if (m) video = m[1];
  }

  const source: YouTubeSource = {};
  if (list && ID.test(list)) source.list = list;
  if (video && ID.test(video)) source.video = video;
  return source.list || source.video ? source : null;
}
