/**
 * Floating AI assistant ("Piku").
 *
 * A small chat widget that talks to `/api/ai/chat`, which proxies
 * text.pollinations.ai. Keeps a short conversation history for context and
 * renders messages safely (textContent, never innerHTML for model output).
 */
import { api } from './api.js';
import { $, el, toast } from './ui.js';

const history = [];
let busy = false;

const GREETING =
  "Hi, I'm Piku 👋 Ask me for movie recommendations, or tell me what you're in the mood for.";

export function initAiWidget() {
  const fab = $('#aiFab');
  const panel = $('#aiPanel');
  const form = $('#aiForm');
  const input = $('#aiInput');
  const log = $('#aiLog');
  const closeBtn = $('#aiClose');

  if (!fab || !panel) return;

  // Seed the greeting.
  addMessage('bot', GREETING);

  const toggle = (open) => {
    panel.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  };

  fab.addEventListener('click', () =>
    toggle(!panel.classList.contains('is-open'))
  );
  closeBtn?.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;

    input.value = '';
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    busy = true;
    const typing = addTyping();

    try {
      const { reply } = await api.chat(text, history.slice(-6));
      typing.remove();
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      typing.remove();
      addMessage('bot', `Sorry — ${err.message}`);
      toast('Assistant unavailable right now.', 'warning');
    } finally {
      busy = false;
      input.focus();
    }
  });
}

function addMessage(role, text) {
  const log = $('#aiLog');
  const node = el('div', {
    class: `ai-msg ai-msg--${role === 'user' ? 'user' : 'bot'}`,
    text, // textContent — safe against injection
  });
  log.appendChild(node);
  log.scrollTop = log.scrollHeight;
  return node;
}

function addTyping() {
  const log = $('#aiLog');
  const node = el('div', {
    class: 'ai-msg ai-msg--bot ai-msg--typing',
    html: '<span></span><span></span><span></span>',
    'aria-label': 'Assistant is typing',
  });
  log.appendChild(node);
  log.scrollTop = log.scrollHeight;
  return node;
}
