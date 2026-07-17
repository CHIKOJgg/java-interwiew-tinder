import { useEffect, useRef } from 'react';

/**
 * Accessibility helper for modal/dialog components.
 * - Closes on Escape
 * - Traps focus inside the dialog (Tab / Shift+Tab cycle)
 * - Sets initial focus to the dialog container
 *
 * @param {() => void} onClose  called when the user presses Escape
 * @returns {React.RefObject}   attach to the dialog root element
 */
export function useModalA11y(onClose) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Initial focus
    node.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap
      const focusable = node.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return ref;
}
