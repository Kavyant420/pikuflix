/**
 * UI utilities: toasts, modal control, and small DOM helpers.
 * Framework-free and dependency-free.
 */

/** Escape untrusted text before injecting into innerHTML. */
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element with attributes/children in one call. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v != null && v !== false) {
      node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/* --------------------------------- Toasts -------------------------------- */
let toastStack = null;

function ensureToastStack() {
  if (!toastStack) {
    toastStack = el('div', {
      class: 'toast-stack',
      role: 'status',
      'aria-live': 'polite',
    });
    document.body.appendChild(toastStack);
  }
  return toastStack;
}

/**
 * Show a transient toast.
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 */
export function toast(message, type = 'info', duration = 4000) {
  const stack = ensureToastStack();
  const node = el('div', { class: `toast toast--${type}`, text: message });
  stack.appendChild(node);
  setTimeout(() => {
    node.classList.add('is-leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  }, duration);
  return node;
}

/* --------------------------------- Modals -------------------------------- */
/**
 * Open a modal by id. Traps focus and restores it on close.
 * @param {string} id
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal._previousFocus = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const focusable = modal.querySelector(
    'input, button, textarea, select, a[href]'
  );
  focusable?.focus();

  modal._onKeydown = (e) => {
    if (e.key === 'Escape') closeModal(id);
  };
  document.addEventListener('keydown', modal._onKeydown);
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (modal._onKeydown) document.removeEventListener('keydown', modal._onKeydown);
  modal._previousFocus?.focus?.();
}

/** Wire every [data-close-modal] element inside a modal to close it. */
export function initModalDismiss() {
  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close-modal]');
    if (closer) {
      const id = closer.getAttribute('data-close-modal');
      closeModal(id);
      return;
    }
    // Click on the backdrop closes the modal.
    if (e.target.classList?.contains('modal')) {
      closeModal(e.target.id);
    }
  });
}

/** Debounce helper. */
export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
