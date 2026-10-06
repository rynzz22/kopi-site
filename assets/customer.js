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

// Keep the coffee tide in view, then dock it in its original footer space.
document.addEventListener('DOMContentLoaded', () => {
  const tide = document.querySelector('.coffee-footer .coffee-tide');
  if (!tide) return;
  const footer = tide.closest('.coffee-footer');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let position = window.scrollY;
  let previousTime = 0;

  function render(time) {
    frame = 0;
    const target = Math.max(0, window.scrollY);
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    position += (target - position) * (1 - Math.exp(-elapsed / 100));
    if (Math.abs(target - position) < 0.1) position = target;

    const height = tide.offsetHeight;
    const scrollRange = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const progress = scrollRange > 0 ? Math.min(1, target / scrollRange) : 1;
    tide.style.setProperty('--tide-opacity', String(0.7 + progress * 0.3));
    const dock = Math.min(0, footer.getBoundingClientRect().top - (window.innerHeight - height));
    const drift = reducedMotion.matches ? 0 : Math.sin(position / 480);
    // Lower the surface slightly on downward scroll and raise it on return.
    const lift = reducedMotion.matches ? 0 : Math.max(-8, Math.min(8, (target - position) * 0.08));
    tide.style.setProperty('--tide-dock', `${dock}px`);
    tide.style.setProperty('--tide-lift', `${Math.max(0, 8 + lift)}px`);
    tide.style.setProperty('--tide-back', `${drift * 12}px`);
    tide.style.setProperty('--tide-mid', `${drift * 24}px`);
    tide.style.setProperty('--tide-front', `${drift * 40}px`);
    if (position !== target && !reducedMotion.matches) schedule();
    else previousTime = 0;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  footer.classList.add('has-scroll-tide');
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', schedule);
  reducedMotion.addEventListener('change', schedule);
  // Re-dock after fonts, images, or menu filtering change the page height.
  new ResizeObserver(schedule).observe(document.body);
  schedule();
});

// A soft liquid follower keeps the native pointer precise and usable.
document.addEventListener('DOMContentLoaded', () => {
  const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const cursor = document.createElement('div');
  cursor.className = 'coffee-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);
  let x = 0, y = 0, targetX = 0, targetY = 0;
  let scale = 1, targetScale = 1, frame = 0, previousTime = 0;
  let visible = false;

  function hide() {
    visible = false;
    cursor.classList.remove('is-visible');
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function render(time) {
    frame = 0;
    if (!visible || !enabled.matches) return;
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    const ease = 1 - Math.exp(-elapsed / 65);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    scale += (targetScale - scale) * ease;
    const dx = targetX - x, dy = targetY - y;
    const distance = Math.hypot(dx, dy);
    const stretch = Math.min(distance / 180, 0.45);
    const angle = Math.atan2(dy, dx);
    cursor.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle}rad) scale(${scale * (1 + stretch)},${scale / (1 + stretch)})`;
    if (distance > 0.1 || Math.abs(targetScale - scale) > 0.01) frame = requestAnimationFrame(render);
    else previousTime = 0;
  }

  document.addEventListener('pointermove', event => {
    if (!enabled.matches || event.pointerType !== 'mouse') { hide(); return; }
    targetX = event.clientX;
    targetY = event.clientY;
    targetScale = event.target.closest('a, button, summary, input, select, textarea, [role="button"]') ? 1.65 : 1;
    if (!visible) {
      x = targetX; y = targetY;
      visible = true;
      cursor.classList.add('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive:true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  enabled.addEventListener('change', hide);
});
