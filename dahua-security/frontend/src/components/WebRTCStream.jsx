import { useEffect, useRef, useState } from 'react';

/**
 * Reproductor WebRTC nativo para go2rtc.
 * Crea una RTCPeerConnection, envía la oferta SDP al endpoint
 * /stream/api/webrtc (proxy Nginx → go2rtc) y muestra el video recibido.
 */
export default function WebRTCStream({ cameraId }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let mounted = true;
    let retryTimer = null;

    async function start() {
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          if (!mounted || !videoRef.current) return;
          videoRef.current.srcObject = event.streams[0];
        };

        pc.onconnectionstatechange = () => {
          if (!mounted) return;
          const state = pc.connectionState;
          if (state === 'connected') setStatus('live');
          else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setStatus('reconnecting');
            // Reconectar tras 3s
            retryTimer = setTimeout(() => {
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              start();
            }, 3000);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await fetch(`/stream/api/webrtc?src=${cameraId}&mode=webrtc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'offer', sdp: offer.sdp }),
        });

        if (!res.ok) throw new Error(`go2rtc ${res.status}`);
        const answer = await res.json();
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        if (!mounted) return;
        setStatus('error');
        console.error('[WebRTC]', cameraId, e.message);
        // Reintentar tras 5s
        retryTimer = setTimeout(() => {
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          start();
        }, 5000);
      }
    }

    start();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [cameraId]);

  const badge = {
    live: { cls: 'bg-emerald-500/20 text-emerald-400', text: '● EN VIVO' },
    connecting: { cls: 'bg-sky-500/20 text-sky-400', text: 'CONECTANDO' },
    reconnecting: { cls: 'bg-amber-500/20 text-amber-400', text: 'RECONECTANDO' },
    error: { cls: 'bg-red-500/20 text-red-400', text: 'SIN SEÑAL' },
  }[status];

  return (
    <div className="w-full h-full relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium z-10 ${badge.cls}`}>
        {badge.text}
      </span>
    </div>
  );
}