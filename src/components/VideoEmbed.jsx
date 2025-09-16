// src/components/VimeoEmbed.jsx
import { useEffect, useRef, useState } from "react";

export default function VimeoEmbed({
  videoId = 1118917826,
  autoplay = false,
  muted = false,
  byline = false,
  portrait = false,
  title = false,
  responsive = true,
  playsinline = true,
  // "click"  -> fastest: click-to-play facade (no SDK)
  // "inview" -> load SDK when near viewport (default)
  // "eager"  -> create player immediately
  mode = "inview",
  poster,
}) {
  const shellRef = useRef(null);
  const playerRef = useRef(null);
  const [activated, setActivated] = useState(mode === "eager");

  // Effect A: in-view activation (hooks always declared; guarded inside)
  useEffect(() => {
    if (mode !== "inview") return;
    if (activated || !shellRef.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setActivated(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(shellRef.current);
    return () => io.disconnect();
  }, [mode, activated]);

  // Effect B: when activated and not in "click" mode, load SDK and build player
  useEffect(() => {
    if (!activated) return;
    if (mode === "click") return; // facade path uses plain iframe, no SDK

    let destroyed = false;
    let player;

    (async () => {
      const { default: Player } = await import("@vimeo/player");
      if (!shellRef.current || destroyed) return;

      player = new Player(shellRef.current, {
        id: videoId,
        autopause: 0,
        autoplay: autoplay ? 1 : 0,
        muted: muted ? 1 : 0,
        byline: byline ? 1 : 0,
        portrait: portrait ? 1 : 0,
        title: title ? 1 : 0,
        responsive,
        playsinline,
        dnt: 1,
      });

      playerRef.current = player;

      try {
        await player.ready();
        try {
          const qualities = await player.getQualities().catch(() => []);
          const prefs = ["4k", "2k", "1440p", "1080p", "720p"];
          for (const q of prefs) {
            if (qualities?.includes(q)) {
              await player.setQuality(q);
              break;
            }
          }
        } catch {}

        if (autoplay && muted) {
          player.play().catch(() => {});
        }
      } catch {}
    })();

    return () => {
      destroyed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [
    activated,
    mode,
    videoId,
    autoplay,
    muted,
    byline,
    portrait,
    title,
    responsive,
    playsinline,
  ]);

  // ---------- Render (after hooks are declared) ----------
  const onClickFacade = () => setActivated(true);

  // Build inner content per mode/state
  let inner;
  if (mode === "click" && !activated) {
    inner = (
      <button
        type="button"
        onClick={onClickFacade}
        className="group absolute inset-0 w-full h-full"
        aria-label="Play video"
      >

        {poster ? (
          <img
            src={poster}
            alt="Video poster"
            className="flex items-center w-[80%] h-[80%] object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-800" />
        )}
        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full p-4 bg-white/90 group-hover:bg-white transition text-slate-900">
            ▶
          </div>
        </div>
      </button>
    );
  } else if (mode === "click" && activated) {
    const params = new URLSearchParams({
      dnt: "1",
      playsinline: playsinline ? "1" : "0",
      autoplay: "1",
      autopause: "0",
      title: title ? "1" : "0",
      byline: byline ? "1" : "0",
      portrait: portrait ? "1" : "0",
      muted: muted ? "1" : "0",
      transparent: "0",
    }).toString();

    inner = (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?${params}`}
        title="Vimeo video"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  } else {
    // inview/eager: SDK injects iframe into this div
    inner = <div className="absolute inset-0 h-full w-full" />;
  }

  return (
    <div
      ref={shellRef}
      className="relative w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-cyan-400/30"
      style={{ aspectRatio: "16 / 9" }}
    >
      {inner}
    </div>
  );
}
