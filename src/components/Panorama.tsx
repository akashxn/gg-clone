import { useEffect, useRef } from 'react';
import 'pannellum/build/pannellum.css';
import 'pannellum/build/pannellum.js';

/** Minimal surface of the Pannellum viewer; the package ships no types. */
export interface PannellumViewer {
  getYaw(): number;
  setYaw(y: number, animated?: boolean): void;
  setPitch(p: number, animated?: boolean): void;
  setHfov(h: number, animated?: boolean): void;
  destroy(): void;
  on(event: string, handler: () => void): void;
}

declare global {
  interface Window {
    pannellum?: {
      viewer(el: HTMLElement | string, config: Record<string, unknown>): PannellumViewer;
    };
  }
}

interface Props {
  url: string;
  /** Bumped by the parent to snap back to the starting view. */
  resetSignal: number;
  onReady?: (viewer: PannellumViewer) => void;
  onLoad?: () => void;
  onError?: (message: string) => void;
}

const START_VIEW = { yaw: 0, pitch: 0, hfov: 100 };

export default function Panorama({ url, resetSignal, onReady, onLoad, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  // Held in refs so swapping handlers never forces the viewer to rebuild.
  const cbs = useRef({ onReady, onLoad, onError });
  cbs.current = { onReady, onLoad, onError };

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !window.pannellum) return;

    const viewer = window.pannellum.viewer(host, {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      // Panoramax reflects the requesting origin, so the texture stays usable.
      crossOrigin: 'anonymous',
      showZoomCtrl: true,
      showFullscreenCtrl: false,
      autoRotate: 0,
      compass: false,
      // Anything identifying the place would hand the player the answer.
      hotSpots: [],
      ...START_VIEW,
      minHfov: 35,
      maxHfov: 120,
    });

    viewer.on('load', () => cbs.current.onLoad?.());
    viewer.on('error', () => cbs.current.onError?.('This panorama failed to load.'));

    viewerRef.current = viewer;
    cbs.current.onReady?.(viewer);

    return () => {
      viewerRef.current = null;
      try {
        viewer.destroy();
      } catch {
        /* already torn down */
      }
    };
  }, [url]);

  useEffect(() => {
    if (resetSignal === 0) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setYaw(START_VIEW.yaw, true);
    viewer.setPitch(START_VIEW.pitch, true);
    viewer.setHfov(START_VIEW.hfov, true);
  }, [resetSignal]);

  return <div ref={hostRef} className="panorama" />;
}
