# RealEarns-Estates

A modern web application for smart earnings, real estate estate packages, and investments.

## Features

- User registration & login (phone + password)
- Estate investment packages with daily rental returns
- **New starter estate package at 15,000 UGX**
- Users can view all purchased estates under **My Estates**
- **Automatic deposits via MarzPay (MTN & Airtel Mobile Money)**
- Deposit fee: **5%** · Minimum deposit: **10,000 UGX**
- Withdrawal system
- Referral system (15% commission)
- **Professional Admin Panel**:
  - View & search all registered users
  - Manage balances, suspend/unsuspend, reset passwords, delete users
  - Impersonate users, reply to messages
  - Approve withdrawals & recharges
  - View all estate investments / purchases
  - **Edit / Add / Delete estate products**
  - Platform stats & danger-zone tools
- LocalStorage fallback for offline use











## Automatic currency rates

KES, RWF, and CDF are converted to **UGX** using live market rates:

- Source: open.er-api.com (USD cross-rates), with fallbacks
- Cached for **1 hour** on the server (auto-refresh)
- GET /api/rates — current rates
- GET /api/rates?refresh=1 — force refresh
- Deposit page loads rates automatically and shows conversion
- If the rates API is down, last known / configured fallback rates are used


## Multi-country MarzPay (UG, KE, RW, CD)

Deposits work via **MarzPay** in:

| Country | Code | Currency | Providers | Min deposit |
|---------|------|----------|-----------|-------------|
| Uganda | UG | UGX | MTN & Airtel | 10,000 |
| Kenya | KE | KES | M-Pesa | 100 |
| Rwanda | RW | RWF | MTN & Airtel | 500 |
| DRC Congo | CD | CDF | Vodacom, Airtel, Orange | 5,000 |

- Select country on the **Invest Funds** page
- Enter local mobile money number (+256 / +254 / +250 / +243)
- Wallet balance is credited in **UGX** (converted with configurable rates)
- Platform fee: **5%** of the UGX credit amount

API: `POST /api/deposit/initiate` with `{ amount, phone, userPhone, country }`  
Markets list: `GET /api/markets`


## Withdrawal System

Users can request Mobile Money withdrawals (MTN / Airtel).

| Rule | Value |
|------|--------|
| Minimum | **10,000 UGX** |
| Maximum | **1,000,000 UGX** |
| Fee | **5%** (deducted from balance on request) |
| Requirement | At least one **active** investment |
| Limit | One **pending** withdrawal at a time |

### Flow
1. User opens **Withdraw**, enters amount + MM number, chooses MTN/Airtel.
2. Balance is reduced by amount + 5% fee; request goes to **pending**.
3. Admin opens **Withdrawals** tab → **Approve** or **Reject**.
4. Reject **refunds** amount + fee to the user.

### API
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/withdraw/request` | Create withdrawal (`phone`, `amount`, `withdrawPhone`, `network`) |
| POST | `/api/withdraw/action` | `{ id, action: "approve" \| "reject" }` |


## Database Integration

The app uses a **server-side JSON database** (zero external dependencies):

| Path | Description |
|------|-------------|
| `data/database.json` | Main database (users, products, rentals, transactions, …) |
| `data/pending-deposits.json` | MarzPay pending collections |

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db` | Full database dump |
| PUT | `/api/db` | Replace / sync full database |
| GET | `/api/db/:collection` | Get one collection |
| PUT | `/api/db/:collection` | Replace collection |
| POST | `/api/db/:collection` | Upsert item(s) |
| DELETE | `/api/db/:collection/:id` | Delete item |
| GET | `/api/health` | Health + collection counts |

Collections: `users`, `products`, `rentals`, `transactions`, `messages`, `supportMessages`, `referrals`, `pendingWithdrawals`, `pendingDeposits`, `depositHistory`, `withdrawHistory`.

On first start the server seeds:
- Default admin account
- All package products (including **15,000 UGX** starter bike)


Every `saveData()` writes to localStorage **and** the server database so all browsers sharing the same server see the same users, balances, and purchases.


## Requirements

- Node.js 18 or higher (no extra packages needed)

## Installation

```bash
cd realearns-estates
```

No `npm install` required – the server uses only built-in Node.js modules.

## Running the App

```bash
npm start
# or simply:
node server.js
```

Then open your browser at: **http://localhost:3000**

## MarzPay Integration

Payments are fully automatic:

1. User enters amount (≥ 10,000 UGX) and Mobile Money number.
2. Server calls MarzPay `/collect-money` → customer receives USSD/prompt.
3. After approval, webhook (or status polling) marks the deposit completed.
4. **Net amount (after 5% fee) is credited to the user’s balance automatically.**

### API Endpoints (server)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/deposit/initiate` | Start a collection |
| GET | `/api/deposit/status/:reference` | Poll status |
| POST | `/api/marz/webhook` | MarzPay callback |

Credentials are stored server-side only (never exposed to the browser).

For production webhooks, expose the server publicly (or use a tunnel such as ngrok) so MarzPay can reach `/api/marz/webhook`.

## Default Admin Account

- **Phone:** `779019391`
- **Password:** `Ug2530050.011253`

## Project Structure

```
realearns-estates/
├── package.json
├── server.js          # Native Node.js HTTP server + MarzPay
├── data/              # Pending deposits store (created at runtime)
├── public/
│   └── index.html     # Full frontend application (SPA)
└── README.md
```

## Notes

- The app primarily uses **localStorage** for data persistence.
- All bike images and styles are loaded from external CDNs.
- Zero external npm dependencies – pure Node.js.

## Scripts

| Command       | Description                |
|---------------|----------------------------|
| `npm start`   | Start the server           |
| `node server.js` | Same as above           |

## License

MIT
