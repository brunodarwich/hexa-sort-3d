// Shared focus management for all dialogs, including dialogs opened by the game.
export function setupDialogs(onClose) {
  let active = null;
  let returnFocus = null;
  const dialogs = [...document.querySelectorAll('.modal-overlay')];
  const focusable = dialog => [...dialog.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
    .filter(element => !element.disabled && element.getClientRects().length > 0);
  const sync = () => {
    const visible = dialogs.filter(dialog => !dialog.classList.contains('hidden'));
    const next = visible.at(-1) || null;
    for (const dialog of dialogs) {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.inert = Boolean(next && dialog !== next);
      const title = dialog.querySelector('h2[id], h3[id]');
      if (title) { dialog.setAttribute('aria-labelledby', title.id); dialog.removeAttribute('aria-label'); }
      if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
        dialog.setAttribute('aria-label', dialog.querySelector('h2, h3')?.textContent?.trim() || 'Opções do jogo');
      }
      dialog.querySelectorAll('.modal-close').forEach(button => button.setAttribute('aria-label', 'Fechar'));
    }
    document.querySelectorAll('.screen-view, #bottom-nav').forEach(element => { element.inert = Boolean(next) || (element.classList.contains('screen-view') && !element.classList.contains('active')); });
    if (next === active) return;
    if (!active && next) returnFocus = document.activeElement;
    active = next;
    if (active) { active.tabIndex = -1; (focusable(active)[0] || active).focus(); }
    else if (returnFocus?.isConnected) { returnFocus.focus(); returnFocus = null; }
  };
  dialogs.forEach(dialog => new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['class'] }));
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape' && active.id !== 'modal-gameover') {
      const id = active.id;
      active.classList.add('hidden');
      onClose?.(id);
      event.preventDefault();
    } else if (event.key === 'Tab') {
      const items = focusable(active);
      const first = items[0] || active;
      const last = items.at(-1) || active;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === active)) {
        last.focus(); event.preventDefault();
      } else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) {
        first.focus(); event.preventDefault();
      }
    }
  });
  sync();
}
