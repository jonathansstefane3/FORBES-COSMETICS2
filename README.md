# Forbes Cosmetics

A complete online cosmetics store. The **frontend** is plain HTML, CSS and JavaScript. The **backend** is a Node.js and Express REST API that stores data in JSON files.

## Features
- Browse 12 sample products, filter by category and search by name
- Product pictures drawn with JavaScript (no image files needed)
- Shopping cart saved in the browser
- Checkout with name, phone and delivery address (pay on delivery)
- Server checks stock and calculates prices, so totals cannot be faked
- Admin API to add or delete products and manage orders
- Works on phones and in light or dark mode

## Project structure
```
forbes-cosmetics/
├── server.js          Express backend and API
├── package.json
├── .env.example       Copy to .env and set your admin token
├── data/
│   └── products.json  Product catalogue (orders.json is created automatically)
└── public/            Frontend served by the backend
    ├── index.html
    ├── style.css
    └── app.js
```

## Run it locally
You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
ADMIN_TOKEN=my-secret npm start
```
Open http://localhost:3000. On Windows PowerShell use `$env:ADMIN_TOKEN="my-secret"; npm start`.

## API
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/products?q=&category=` | Public | List or search products |
| GET | `/api/products/:id` | Public | One product |
| POST | `/api/orders` | Public | Place an order |
| POST | `/api/products` | Admin | Add a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |
| GET | `/api/orders` | Admin | List all orders |
| PATCH | `/api/orders/:ref` | Admin | Set status: new, paid, shipped, delivered, cancelled |

Admin requests need the header `x-admin-token: <your ADMIN_TOKEN>`.

```bash
# View orders
curl -H "x-admin-token: my-secret" http://localhost:3000/api/orders

# Add a product
curl -X POST http://localhost:3000/api/products \
  -H "x-admin-token: my-secret" -H "Content-Type: application/json" \
  -d '{"name":"Rose Blush","category":"Face","price":28000,"stock":20,"type":"jar","color":"#e58aa0","desc":"Soft pink blush."}'
```
Product `type` can be `lip`, `tube`, `bottle`, `jar`, `polish` or `perfume`.

## Deploy
GitHub Pages only hosts static sites, so it cannot run the backend. Deploy this repository to a Node host such as Render or Railway: build command `npm install`, start command `npm start`, and set the `ADMIN_TOKEN` environment variable. Note that free hosts may reset JSON files on restart. For a real shop, replace the JSON files with a database such as PostgreSQL or MongoDB.

## Licence
MIT
