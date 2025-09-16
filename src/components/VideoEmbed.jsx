
import { useEffect, useRef, useState, useMemo } from "react";
import Player from "@vimeo/player";

export default function VimeoEmbed({ src, poster }) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Never call hooks conditionally — compute flags via useMemo/state instead
  const hasSrc = useMemo(() => Boolean(src), [src]);

  useEffect(() => {
    // Guard: don't run on SSR or before ref exists
    if (!iframeRef.current || !hasSrc) return;

    let player;
    try {
      player = new Player(iframeRef.current);

      const onLoaded = async () => {
        setReady(true);
        try {
          const qualities = await player.getQualities().catch(() => []);
          const prefs = ["4k", "2k", "1440p", "1080p", "720p"];
          for (const q of prefs) {
            if (qualities?.includes(q)) {
              await player.setQuality(q);
              break;
            }
          }
        } catch {
          /* quality forcing not supported; ignore */
        }
      };

      player.on("loaded", onLoaded);
    } catch {
      // fail closed, don’t crash the tree
    }
    return () => {
      if (player) player.destroy();
    };
  }, [hasSrc]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-lg" style={{ paddingTop: "56.25%" }}>
      {/* Poster (safe 90% centered) */}
      {poster && !ready && (
        <img
          src={poster}
          alt="Video poster"
          className="absolute top-1/2 left-1/2 w-[90%] h-[90%] object-cover -translate-x-1/2 -translate-y-1/2"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Iframe is always mounted (no conditional hooks), visibility toggles via CSS */}
      <iframe
        ref={iframeRef}
        src={hasSrc ? src : undefined}
        title="Vimeo player"
        className={`absolute inset-0 w-full h-full ${ready ? "opacity-100" : "opacity-0"}`}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        allowFullScreen
      />
    </div>
  );
}