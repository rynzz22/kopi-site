import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  value = '';
  style = {};
  children = [];
  handlers = {};
  attributes = {};
  classList = { add() {}, remove() {}, contains() { return false; } };
  addEventListener(name, handler) { this.handlers[name] = handler; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  appendChild(child) { child.parent = this; this.children.push(child); }
  replaceChildren() { this.children = []; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  get firstElementChild() { return this.children[0]; }
}

function harness() {
  const elements = new Map();
  const document = {
    body: new Element(), handlers: {},
    createElement: () => new Element(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    querySelectorAll: () => [],
    addEventListener(name, handler) { this.handlers[name] = handler; },
  };
  const context = vm.createContext({ document, console, URLSearchParams,
    setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {},
    window: { location: { search: '?id=1', pathname: '/order-status.html' }, history: { replaceState() {} } },
  });
  return { document, context, get: id => document.getElementById(id) };
}

const products = await readFile(new URL('../products.js', import.meta.url), 'utf8');
const checkout = harness();
vm.runInContext(products, checkout.context);
vm.runInContext('initCheckoutAndCartSystem()', checkout.context);
const phone = checkout.get('custPhone');
const error = checkout.get('phoneError');
phone.value = '091234567890';
phone.selectionStart = phone.selectionEnd = 12;
let prevented = false;
phone.handlers.beforeinput({ inputType: 'insertText', data: '1', preventDefault() { prevented = true; } });
assert.ok(prevented);
assert.match(error.textContent, /12 digits/);
phone.value = '09abc12.3+4';
phone.handlers.input();
assert.equal(phone.value, '091234');
assert.match(error.textContent, /digits only/);
phone.value = '';
phone.selectionStart = phone.selectionEnd = 0;
phone.handlers.paste({ clipboardData: { getData: () => '0912345678901234' }, preventDefault() {} });
assert.equal(phone.value, '091234567890');
assert.match(error.textContent, /12 digits/);
phone.selectionStart = 0;
phone.selectionEnd = 12;
phone.handlers.paste({ clipboardData: { getData: () => '00123' }, preventDefault() {} });
assert.equal(phone.value, '00123');
assert.equal(error.hidden, true);
phone.value = '';
phone.handlers.input();
assert.equal(phone.value, '');

const tracker = await readFile(new URL('../assets/order-status.js', import.meta.url), 'utf8');
for (const mode of ['unsupported', 'denied', 'granted', 'constructor-fails']) {
  const h = harness();
  const listeners = {};
  const chimes = [];
  let nativeCount = 0;
  let order = { id: 1, status: 'PENDING', created_at: '2026-10-07T00:00:00Z', items: [] };
  let pendingFetch;
  h.context.window.kopiClient = {
    on(name, handler) { listeners[name] = handler; },
    getOrder: async () => pendingFetch || { success: true, data: { ...order } },
    playChime: sound => chimes.push(sound),
  };
  if (mode !== 'unsupported') {
    class Notification {
      static permission = mode === 'denied' ? 'denied' : 'granted';
      constructor() {
        if (mode === 'constructor-fails') throw new Error('Unsupported constructor');
        nativeCount++;
      }
      close() {}
    }
    h.context.Notification = h.context.window.Notification = Notification;
  }
  vm.runInContext(tracker, h.context);
  await h.document.handlers.DOMContentLoaded();
  const region = h.document.body.children[0];
  assert.equal(region.children.length, 0, 'Initial load is silent');
  order.status = 'CONFIRMED';
  await listeners['poll:tick']();
  assert.equal(region.children.length, 1, 'First poll detects changes from initial load');
  listeners['order:status_updated']({ order: { ...order } });
  await listeners['poll:tick']();
  assert.equal(region.children.length, 1, 'Duplicate deliveries are silent');
  listeners['order:status_updated']({ order: { id: 2, status: 'READY' } });
  assert.equal(region.children.length, 1, 'Other orders are ignored');
  let resolveFetch;
  pendingFetch = new Promise(resolve => { resolveFetch = resolve; });
  const poll = listeners['poll:tick']();
  listeners['order:status_updated']({ order: { id: 1, status: 'READY' } });
  resolveFetch({ success: true, data: { ...order } });
  await poll;
  pendingFetch = null;
  assert.equal(region.children.length, 2, 'Old poll cannot undo a realtime update');
  assert.equal(chimes.length, 2);
  assert.equal(nativeCount, mode === 'granted' ? 2 : 0);
  region.children[0].children[2].handlers.click();
  assert.equal(region.children.length, 1, 'Pop-ups can be dismissed');
  order = { ...order, id: 2, status: 'PREPARING' };
  h.get('orderSearchInput').value = '2';
  await h.get('orderLookupForm').handlers.submit({ preventDefault() {} });
  assert.equal(region.children.length, 0, 'Changing orders clears previous alerts');
  order.status = 'CANCELLED';
  await listeners['poll:tick']();
  assert.match(region.children[0].children[0].textContent, /Order #2: Order Cancelled/);
}
console.log('Passed: phone input, status pop-ups, permissions, deduplication, polling races, dismissal, and order switching.');
