const $ = (s) => document.querySelector(s);
const fmt = (n) => 'UGX ' + n.toLocaleString('en-US');
let products = [], category = 'All', query = '', cart = loadCart();

function loadCart() { try { return JSON.parse(localStorage.getItem('forbes-cart')) || {}; } catch (e) { return {}; } }
function saveCart() { try { localStorage.setItem('forbes-cart', JSON.stringify(cart)); } catch (e) {} }

// Product pictures are drawn with JavaScript, so no image files are needed.
function picture(p) {
  const c = p.color, dark = '#2b2b2b';
  const shapes = {
    lip: `<rect x="72" y="100" width="56" height="80" rx="6" fill="${dark}"/><rect x="80" y="44" width="40" height="60" rx="5" fill="${c}"/>`,
    tube: `<rect x="76" y="50" width="48" height="120" rx="14" fill="${c}"/><rect x="84" y="30" width="32" height="26" rx="5" fill="${dark}"/>`,
    bottle: `<rect x="70" y="80" width="60" height="100" rx="12" fill="${c}"/><rect x="88" y="50" width="24" height="34" rx="4" fill="${dark}"/><rect x="94" y="34" width="12" height="18" rx="3" fill="${dark}"/>`,
    jar: `<rect x="54" y="100" width="92" height="64" rx="12" fill="${c}"/><rect x="50" y="78" width="100" height="28" rx="8" fill="${dark}"/>`,
    polish: `<rect x="70" y="100" width="60" height="70" rx="10" fill="${c}"/><rect x="92" y="50" width="16" height="54" rx="4" fill="${dark}"/>`,
    perfume: `<rect x="62" y="90" width="76" height="84" rx="12" fill="${c}" opacity=".92"/><rect x="88" y="66" width="24" height="26" rx="4" fill="${dark}"/><rect x="82" y="50" width="36" height="18" rx="5" fill="#caa24a"/>`
  };
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${p.name}"><rect width="200" height="200" fill="${c}" opacity=".16"/><ellipse cx="100" cy="182" rx="52" ry="7" fill="#000" opacity=".12"/>${shapes[p.type] || shapes.bottle}<rect x="78" y="112" width="8" height="40" rx="4" fill="#fff" opacity=".35"/></svg>`;
}

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

async function loadProducts() {
  try {
    products = await api('/api/products');
    renderTabs(); renderGrid(); renderCart();
  } catch (e) {
    $('#grid').innerHTML = `<p class="empty">Could not load products. ${e.message}</p>`;
  }
}

function renderTabs() {
  const cats = ['All', ...new Set(products.map((p) => p.category))];
  $('#tabs').innerHTML = cats.map((c) => `<button class="chip" data-c="${c}" aria-pressed="${c === category}">${c}</button>`).join('');
}

function renderGrid() {
  const list = products.filter((p) =>
    (category === 'All' || p.category === category) &&
    (!query || (p.name + ' ' + p.desc).toLowerCase().includes(query)));
  $('#grid').innerHTML = list.length ? list.map((p) => `
    <article class="card">${picture(p)}<div class="b"><h3>${p.name}</h3><p>${p.desc}</p>
    <div class="f"><strong>${fmt(p.price)}</strong>
    <button class="btn" data-add="${p.id}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add'}</button></div></div></article>`).join('')
    : '<p class="empty">No products match your search.</p>';
}

function cartLines() {
  return Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === Number(id)), qty })).filter((l) => l.p);
}

function renderCart() {
  const lines = cartLines();
  $('#count').textContent = lines.reduce((a, l) => a + l.qty, 0);
  $('#lines').innerHTML = lines.length ? lines.map((l) => `
    <div class="ln"><span>${l.p.name}<br><small>${fmt(l.p.price)}</small></span>
    <span class="qty"><button data-dec="${l.p.id}" aria-label="Remove one">−</button>${l.qty}<button data-inc="${l.p.id}" aria-label="Add one">+</button></span></div>`).join('')
    : '<p>Your cart is empty.</p>';
  $('#total').textContent = fmt(lines.reduce((a, l) => a + l.p.price * l.qty, 0));
}

function change(id, delta) {
  const p = products.find((x) => x.id === id);
  const next = (cart[id] || 0) + delta;
  if (next <= 0) delete cart[id]; else cart[id] = Math.min(next, p.stock);
  saveCart(); renderCart();
}

$('#tabs').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { category = b.dataset.c; renderTabs(); renderGrid(); } };
$('#q').oninput = (e) => { query = e.target.value.trim().toLowerCase(); renderGrid(); };
$('#grid').onclick = (e) => { const b = e.target.closest('[data-add]'); if (b) { change(Number(b.dataset.add), 1); $('#cart').showModal(); } };
$('#lines').onclick = (e) => {
  const i = e.target.closest('[data-inc]'), d = e.target.closest('[data-dec]');
  if (i) change(Number(i.dataset.inc), 1); if (d) change(Number(d.dataset.dec), -1);
};
$('#cartBtn').onclick = () => $('#cart').showModal();
$('#closeCart').onclick = () => $('#cart').close();

$('#co').onsubmit = async (e) => {
  e.preventDefault();
  const msg = $('#msg'), items = Object.entries(cart).map(([id, qty]) => ({ id: Number(id), qty }));
  msg.className = 'err';
  if (!items.length) return (msg.textContent = 'Add something to your cart first.');
  try {
    const o = await api('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: $('#name').value, phone: $('#phone').value, address: $('#addr').value, items })
    });
    cart = {}; saveCart(); $('#co').reset();
    msg.className = 'ok'; msg.textContent = `Thank you! Order ${o.ref} placed. Total ${fmt(o.total)}, pay on delivery.`;
    loadProducts();
  } catch (err) { msg.textContent = err.message; }
};

$('#yr').textContent = new Date().getFullYear();
loadProducts();
