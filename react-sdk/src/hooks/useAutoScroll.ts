import { useEffect, useRef } from "react";

export function useAutoScroll<T extends HTMLElement>(shouldScroll: boolean = true) {
  const ref = useRef<T | null>(null);
  const shouldScrollRef = useRef(shouldScroll);

  // Update the ref when shouldScroll changes
  useEffect(() => {
    shouldScrollRef.current = shouldScroll;
  }, [shouldScroll]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      // Only scroll if shouldScroll is true
      if (shouldScrollRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    observer.observe(el, { childList: true, subtree: true });
    
    // Initial scroll only if shouldScroll is true
    if (shouldScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}
