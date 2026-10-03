import { describe, expect, it } from "vitest";
import { parseYouTubeSource } from "../youtube";

describe("parseYouTubeSource", () => {
  it("reads a YouTube Music playlist link", () => {
    expect(parseYouTubeSource("https://music.youtube.com/playlist?list=PLabc123XYZ")).toEqual({ list: "PLabc123XYZ" });
  });

  it("reads a normal playlist link, with or without the protocol", () => {
    expect(parseYouTubeSource("youtube.com/playlist?list=PLabc123XYZ")).toEqual({ list: "PLabc123XYZ" });
  });

  it("keeps both the video and the playlist when a link has both", () => {
    expect(parseYouTubeSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123XYZ")).toEqual({ list: "PLabc123XYZ", video: "dQw4w9WgXcQ" });
  });

  it("reads a single video from watch, short and music links", () => {
    expect(parseYouTubeSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ video: "dQw4w9WgXcQ" });
    expect(parseYouTubeSource("https://youtu.be/dQw4w9WgXcQ?t=10")).toEqual({ video: "dQw4w9WgXcQ" });
    expect(parseYouTubeSource("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ video: "dQw4w9WgXcQ" });
  });

  it("rejects other sites, junk and empty input", () => {
    expect(parseYouTubeSource("https://open.spotify.com/playlist/37i9dQZF1DX")).toBeNull();
    expect(parseYouTubeSource("hola")).toBeNull();
    expect(parseYouTubeSource("   ")).toBeNull();
    expect(parseYouTubeSource("https://www.youtube.com/")).toBeNull();
  });
});
