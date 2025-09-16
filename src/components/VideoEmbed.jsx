// VimeoEmbed.jsx
import { useEffect, useRef } from "react";
import Player from "@vimeo/player";

export default function VimeoEmbed({
  videoId = 1118917826, // <-- pass your ID in props when you use it
  autoplay = false,
  muted = false,
  byline = false,
  portrait = false,
  title = false,
  responsive = true,
  playsinline = true,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const mountedRef = useRef(false); // guard for React StrictMode double effects

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!containerRef.current) return;

    // Let the SDK create the iframe (more reliable)
    const player = new Player(containerRef.current, {
      id: videoId,
      autopause: 0,
      autoplay: autoplay ? 1 : 0,
      muted: muted ? 1 : 0,
      byline: byline ? 1 : 0,
      portrait: portrait ? 1 : 0,
      title: title ? 1 : 0,
      responsive, // creates a responsive iframe
      playsinline, // iOS inline playback
      dnt: 1, // "do not track"
    });

    playerRef.current = player;

    // Use the ready() promise; it's more dependable than just 'loaded'
    player.ready().then(async () => {
      try {
        // Prefer auto; force quality only if the API allows it
        const qualities = await player.getQualities().catch(() => []);
        const prefs = ["4k", "2k", "1440p", "1080p", "720p"];
        for (const q of prefs) {
          if (qualities?.includes(q)) {
            await player.setQuality(q);
            break;
          }
        }
      } catch {
        // Some accounts/plans or embeds don't allow forcing quality—ignore
      }

      // If you want immediate playback and it's muted (browser policy), you can:
      if (autoplay && muted) {
        player.play().catch(() => {});
      }
    });

    return () => {
      player?.destroy();
      playerRef.current = null;
    };
  }, [videoId, autoplay, muted, byline, portrait, title, responsive, playsinline]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-cyan-400/30"
      // 16:9 aspect ratio container for the auto-created iframe
      style={{ paddingTop: "56.25%" }}
    >
      {/* The SDK will inject an iframe into this div */}
      <div className="absolute inset-0 h-full w-full" ref={containerRef} />
    </div>
  );
}