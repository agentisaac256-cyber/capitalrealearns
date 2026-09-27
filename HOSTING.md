# Hosting guide — RealEarns-Estates

## Requirements
- Node.js **18+**

## Quick start
```bash
cd Capital-earns-main
npm start
# → http://localhost:3000
```

## Production (PM2)
```bash
npm install -g pm2
pm2 start server.js --name realearns-estates
pm2 save
pm2 startup
```

## Environment / config
Edit top of `server.js` if needed:
- **MarzPay** API keys / webhook secret
- **PORT** (default `3000`)
- Deposit fee percent


2. Admin panel → **Sync Cloud** after first login

## Admin login
Default admin is seeded in `data/database.json`.
Change the password immediately after first login.

## Features checklist
- [x] User registration with country (UG / KE / RW / CD)
- [x] Multi-currency wallet (UGX, KES, RWF, CDF)
- [x] Live FX rates (auto, cached 1h)
- [x] MarzPay mobile money deposits
- [x] Bike investments + daily profit distribution
- [x] Referral codes (functional)
- [x] Withdrawals (admin approve/reject)
- [x] VIP gift codes (admin manage, one redeem per user)
- [x] Admin user management (full details, search, filters)
- [x] WhatsApp community support

## Reverse proxy (Nginx example)
```nginx
server {
  listen 80;
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Webhook (MarzPay)
Point MarzPay webhook to:
`https://your-domain.com/api/marz/webhook`

## Data
Primary store: `data/database.json` (auto-created).
Back up this file regularly on the server.
