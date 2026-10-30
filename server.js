const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';
const file = (name) => path.join(__dirname, 'data', name + '.json');

const read = (name) => {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return []; }
};
const write = (name, data) => fs.writeFileSync(file(name), JSON.stringify(data, null, 2));

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const admin = (req, res, next) =>
  req.get('x-admin-token') === ADMIN_TOKEN ? next() : res.status(401).json({ error: 'Admin token required' });

// ---- Products (public) ----
app.get('/api/products', (req, res) => {
  const { q = '', category = '' } = req.query;
  const term = String(q).toLowerCase();
  const list = read('products').filter(
    (p) => (!category || p.category === category) && (!term || (p.name + ' ' + p.desc).toLowerCase().includes(term))
  );
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const p = read('products').find((x) => x.id === Number(req.params.id));
  p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
});

// ---- Products (admin) ----
app.post('/api/products', admin, (req, res) => {
  const { name, category, price, stock, type = 'bottle', color = '#b3123f', desc = '' } = req.body || {};
  if (!name || !category || !(price > 0)) return res.status(400).json({ error: 'name, category and a positive price are required' });
  const products = read('products');
  const product = { id: Math.max(0, ...products.map((p) => p.id)) + 1, name, category, price: Number(price), stock: Number(stock) || 0, type, color, desc };
  products.push(product);
  write('products', products);
  res.status(201).json(product);
});

app.delete('/api/products/:id', admin, (req, res) => {
  const products = read('products');
  const next = products.filter((p) => p.id !== Number(req.params.id));
  if (next.length === products.length) return res.status(404).json({ error: 'Product not found' });
  write('products', next);
  res.json({ deleted: true });
});

// ---- Orders ----
app.post('/api/orders', (req, res) => {
  const { name, phone, address, items } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  if (String(phone || '').replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'A valid phone number is required' });
  if (!address || !String(address).trim()) return res.status(400).json({ error: 'Delivery address is required' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty' });

  const products = read('products');
  const lines = [];
  for (const it of items) {
    const p = products.find((x) => x.id === Number(it.id));
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty > 0)) return res.status(400).json({ error: 'Invalid item in cart' });
    if (qty > p.stock) return res.status(409).json({ error: `Only ${p.stock} of ${p.name} left in stock` });
    lines.push({ id: p.id, name: p.name, qty, price: p.price });
  }
  // Price is always calculated on the server, never trusted from the browser.
  lines.forEach((l) => { products.find((p) => p.id === l.id).stock -= l.qty; });
  const order = {
    ref: 'FC' + Date.now().toString(36).toUpperCase(),
    name: String(name).trim(), phone: String(phone).trim(), address: String(address).trim(),
    items: lines, total: lines.reduce((a, l) => a + l.price * l.qty, 0),
    status: 'new', createdAt: new Date().toISOString()
  };
  write('products', products);
  write('orders', [...read('orders'), order]);
  res.status(201).json(order);
});

app.get('/api/orders', admin, (req, res) => res.json(read('orders')));

app.patch('/api/orders/:ref', admin, (req, res) => {
  const orders = read('orders');
  const o = orders.find((x) => x.ref === req.params.ref);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (['new', 'paid', 'shipped', 'delivered', 'cancelled'].includes(req.body.status)) o.status = req.body.status;
  write('orders', orders);
  res.json(o);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`Forbes Cosmetics running at http://localhost:${PORT}`));
