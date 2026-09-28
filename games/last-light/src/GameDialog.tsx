import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Native modality keeps focus, Escape and background scrolling consistent. */
export function GameDialog({ title, eyebrow, onClose, children }: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className="completion-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="completion-dialog-content">
        <header>
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          <button className="completion-dialog-close" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>×</button>
        </header>
        {children}
      </div>
    </dialog>, document.body,
  );
}
