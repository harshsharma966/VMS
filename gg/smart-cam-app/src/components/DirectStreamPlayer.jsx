import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle } from 'lucide-react';
import { acquireStream, detachStream, evictStream } from '@/services/streamCache';

/**
 * DirectStreamPlayer — Shinobi HLS player with persistent HLS instances.
 *
 * HLS.js instances are kept alive in the streamCache registry across
 * component mounts/unmounts. Switching cameras and coming back does NOT
 * restart the stream — the existing instance is reattached instantly.
 */
export default function DirectStreamPlayer({ monitorId, className = '' }) {
  const videoRef = useRef(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!monitorId || !videoRef.current) return;

    let mounted = true;
    setState('loading');
    setError(null);

    acquireStream(monitorId)
      .then(({ hls, hlsUrl, fresh }) => {
        if (!mounted || !videoRef.current) return;

        // Safari: native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = hlsUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            if (mounted) {
              setState('playing');
              videoRef.current.play().catch(() => {});
            }
          });
          return;
        }

        if (fresh) {
          // Brand new HLS instance — set up event handlers and load source
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!mounted) return;
            setState('playing');
            hls.startLoad(-1);          // start from live edge
            videoRef.current?.play().catch(() => {});
          });

          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            if (!videoRef.current || !hls.liveSyncPosition) return;
            const lag = hls.liveSyncPosition - videoRef.current.currentTime;
            if (lag > 8) hls.seekToLiveEdge();
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else if (mounted) {
              setState('error');
              setError('Camera stream unavailable. Check camera is online.');
              hls.destroy();
              evictStream(monitorId); // remove dead instance so next click creates a fresh one
            }
          });

          hls.attachMedia(videoRef.current);
          hls.loadSource(hlsUrl);
        } else {
          // Reattaching existing running instance — jump straight to live edge
          hls.attachMedia(videoRef.current);
          setState('playing');
          videoRef.current.play().catch(() => {});
          hls.seekToLiveEdge();
        }
      })
      .catch((err) => {
        if (mounted) {
          setState('error');
          setError(err.message || 'Failed to get stream URL');
        }
      });

    return () => {
      mounted = false;
      // Detach from video element but keep HLS instance alive for reuse
      detachStream(monitorId);
    };
  }, [monitorId]);

  return (
    <div className={`relative bg-neutral-950 flex items-center justify-center ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        controls
        className="w-full h-full object-contain"
      />

      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Loader2 className="w-10 h-10 text-[#F7983A] animate-spin" />
          <span className="text-xs text-white/50 tracking-wide font-medium">Connecting to camera…</span>
          <span className="text-[10px] text-white/25">May take up to 30s on first connect</span>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/80 p-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white mb-1">Stream Unavailable</p>
            <p className="text-xs text-white/60">{error || 'Could not connect to camera'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
