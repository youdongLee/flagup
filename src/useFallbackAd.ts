import { loadFullScreenAd } from '@apps-in-toss/framework';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useFallbackAd(adIds: string[], adSupported: boolean) {
  const [adLoaded, setAdLoaded] = useState(!adSupported);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const unregRef = useRef<(() => void) | null>(null);

  const loadAtIndex = useCallback((idx: number) => {
    if (unregRef.current) {
      try { unregRef.current(); } catch {}
      unregRef.current = null;
    }
    if (idx >= adIds.length) {
      setAdLoaded(false);
      setActiveAdId(null);
      return;
    }
    const id = adIds[idx];
    setActiveAdId(id);
    setAdLoaded(false);
    const unreg = loadFullScreenAd({
      options: { adGroupId: id },
      onEvent: (e) => { if (e.type === 'loaded') setAdLoaded(true); },
      onError: () => loadAtIndex(idx + 1),
    });
    unregRef.current = unreg;
  }, [adIds]);

  useEffect(() => {
    if (!adSupported) return;
    loadAtIndex(0);
    return () => {
      if (unregRef.current) {
        try { unregRef.current(); } catch {}
        unregRef.current = null;
      }
    };
  }, [adSupported, loadAtIndex]);

  const reload = useCallback(() => loadAtIndex(0), [loadAtIndex]);

  return { adLoaded, activeAdId, reload };
}
