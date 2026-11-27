import { useEffect, useState } from 'react';

export type ViewportFormat =
  | 'mobile'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop';

export type ViewportOrientation = 'portrait' | 'landscape';

export interface ViewportInfo {
  format: ViewportFormat;
  orientation: ViewportOrientation;
  width: number;
  height: number;
}

function detectViewportInfo(): ViewportInfo {
  if (typeof window === 'undefined') {
    return {
      format: 'mobile',
      orientation: 'portrait',
      width: 390,
      height: 844,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation: ViewportOrientation =
    width > height ? 'landscape' : 'portrait';

  const hasCoarseOnlyPointer =
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches;

  // Celular em retrato (< 768px) ou celular rotacionado na horizontal (tela baixa com toque)
  if (width < 768 || (hasCoarseOnlyPointer && height < 520)) {
    return {
      format: 'mobile',
      orientation,
      width,
      height,
    };
  }

  // Desktop: telas largas (>= 1200px) ou notebooks/monitores com ponteiro fino >= 1024px
  if (width >= 1200 || (!hasCoarseOnlyPointer && width >= 1024)) {
    return {
      format: 'desktop',
      orientation,
      width,
      height,
    };
  }

  // Tablet em orientação horizontal vs vertical
  if (orientation === 'landscape') {
    return {
      format: 'tablet-landscape',
      orientation,
      width,
      height,
    };
  }

  return {
    format: 'tablet-portrait',
    orientation,
    width,
    height,
  };
}

export function useViewportFormat(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() =>
    detectViewportInfo()
  );

  useEffect(() => {
    const update = () => {
      const next = detectViewportInfo();
      setViewport((prev) =>
        prev.format === next.format &&
        prev.orientation === next.orientation &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next
      );
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const coarseQuery = window.matchMedia('(pointer: coarse)');
    if (typeof coarseQuery.addEventListener === 'function') {
      coarseQuery.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (typeof coarseQuery.removeEventListener === 'function') {
        coarseQuery.removeEventListener('change', update);
      }
    };
  }, []);

  return viewport;
}
