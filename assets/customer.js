// Keyboard-friendly dialogs, with focus restored to the control that opened them.
document.addEventListener('DOMContentLoaded', () => {
  const dialogs = [...document.querySelectorAll('.checkout-modal, .customizer-modal')];
  const focusHistory = new WeakMap();
  const focusable = dialog => [...dialog.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
  dialogs.forEach(dialog => {
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const title = dialog.querySelector('h2');
    if (title) { title.id ||= `${dialog.id}-title`; dialog.setAttribute('aria-labelledby', title.id); }
    let wasOpen = dialog.classList.contains('open');
    new MutationObserver(() => {
      const open = dialog.classList.contains('open');
      if (open === wasOpen) return;
      wasOpen = open;
      if (open) {
        focusHistory.set(dialog, document.activeElement);
        (focusable(dialog)[0] || dialog).focus();
      } else {
        const previous = focusHistory.get(dialog);
        if (previous?.isConnected) previous.focus();
      }
      document.body.style.overflow = dialogs.some(d => d.classList.contains('open')) ? 'hidden' : '';
    }).observe(dialog, {attributes:true, attributeFilter:['class']});
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const elements = focusable(dialog), first = elements[0], last = elements.at(-1);
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  document.querySelectorAll('.chip').forEach(chip => {
    chip.setAttribute('aria-pressed', String(chip.classList.contains('active')));
    chip.addEventListener('click', () => chip.parentElement.querySelectorAll('.chip').forEach(item => item.setAttribute('aria-pressed', String(item.classList.contains('active')))));
  });
  document.querySelectorAll('.heart').forEach(heart => {
    heart.setAttribute('aria-pressed', String(heart.classList.contains('active')));
    heart.addEventListener('click', () => heart.setAttribute('aria-pressed', String(heart.classList.contains('active'))));
  });
});
