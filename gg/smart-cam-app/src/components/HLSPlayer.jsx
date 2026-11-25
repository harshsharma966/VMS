import { useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';

export default function HLSPlayer({ src, poster, className = '', onError }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const mediaErrorCount = useRef(0);
  const lastRecoveryTime = useRef(0);

  const initPlayer = useCallback(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    mediaErrorCount.current = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Target 4s behind live edge (3–5s acceptable range for CCTV)
        // Using explicit duration values — more predictable than count-based
        liveSyncDuration: 4,
        liveMaxLatencyDuration: 15,   // must be much larger than liveSyncDuration to avoid stalls
        maxLiveSyncPlaybackRate: 1.1, // gentle catchup — no jarring speed changes
        liveDurationInfinity: true,   // RTSP streams have no known end
        backBufferLength: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 500,
        highBufferWatchdogPeriod: 3,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay blocked by browser — user needs to click
        });
      });

      // Reset error counter on successful fragment load
      hls.on(Hls.Events.FRAG_LOADED, () => {
        mediaErrorCount.current = 0;
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data.fatal) return; // hls.js handles non-fatal errors internally

        const now = Date.now();

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          // Avoid hammering recovery — enforce 3s cooldown
          if (now - lastRecoveryTime.current < 3000) {
            hls.destroy();
            hlsRef.current = null;
            setTimeout(() => initPlayer(), 2000);
            return;
          }
          lastRecoveryTime.current = now;
          mediaErrorCount.current += 1;

          if (mediaErrorCount.current <= 3) {
            hls.recoverMediaError();
          } else {
            // After 3 attempts swap codec and try once more, then reinit
            hls.swapAudioCodec();
            hls.recoverMediaError();
            if (mediaErrorCount.current > 4) {
              hls.destroy();
              hlsRef.current = null;
              setTimeout(() => initPlayer(), 3000);
            }
          }
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Reload the source after a delay — stream may have restarted
          setTimeout(() => {
            if (hlsRef.current) {
              hls.loadSource(src);
              hls.startLoad();
            }
          }, 3000);
        } else {
          hls.destroy();
          hlsRef.current = null;
          setTimeout(() => initPlayer(), 3000);
          if (onError) onError(data);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
  }, [src, onError]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initPlayer]);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        className="w-full aspect-video"
        playsInline
      />
    </div>
  );
}
