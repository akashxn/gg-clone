import { useEffect, useRef } from 'react';

interface Props {
  panoId: string;
  /** Bumped by the parent to snap the view back to where the round started. */
  resetSignal: number;
}

export default function Panorama({ panoId, resetSignal }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    if (!panoRef.current) {
      panoRef.current = new google.maps.StreetViewPanorama(hostRef.current, {
        pano: panoId,
        pov: { heading: 0, pitch: 0 },
        zoom: 0,
        // Everything below would otherwise hand the player the answer.
        addressControl: false,
        showRoadLabels: false,
        linksControl: true,
        panControl: true,
        zoomControl: true,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        enableCloseButton: false,
      });
    } else {
      panoRef.current.setPano(panoId);
      panoRef.current.setPov({ heading: 0, pitch: 0 });
      panoRef.current.setZoom(0);
    }
  }, [panoId]);

  useEffect(() => {
    if (resetSignal === 0 || !panoRef.current) return;
    panoRef.current.setPano(panoId);
    panoRef.current.setPov({ heading: 0, pitch: 0 });
    panoRef.current.setZoom(0);
  }, [resetSignal, panoId]);

  return <div ref={hostRef} className="panorama" />;
}
