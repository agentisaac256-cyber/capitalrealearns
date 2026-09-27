const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending-deposits.json');

// ========== MarzPay Credentials (server-side only) ==========
const MARZ_API_KEY = process.env.MARZ_API_KEY || 'marz_UFsy6EVzcRmqkDWC';
const MARZ_API_SECRET = process.env.MARZ_API_SECRET || 'ub18BRW8PECvgzinS5CSAncqgLui6XpF';
const MARZ_AUTH = Buffer.from(`${MARZ_API_KEY}:${MARZ_API_SECRET}`).toString('base64');
const MARZ_BASE = 'https://wallet.wearemarz.com/api/v1';

const DEPOSIT_FEE_PERCENT = 5;
const MIN_DEPOSIT = 10000;

// ========== Ensure data directory ==========
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ========== DEFAULT PRODUCTS (seed) ==========
const DEFAULT_PRODUCTS = [
  {
    id: 0,
    name: 'Starter Estate S0',
    price: 15000,
    dailyReturn: 3000,
    days: 70,
    location: 'Kampala, Uganda',
    type: 'Starter Estate',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=500&fit=crop&q=80',
    emoji: '🏠',
    rented: false,
    totalPayout: 210000,
    description: 'Affordable starter residential estate unit perfect for beginners – reliable daily rental returns'
  },
  {
    id: 1,
    name: 'Basic Villa X1',
    price: 25000,
    dailyReturn: 5000,
    days: 70,
    location: 'Entebbe, Uganda',
    type: 'Basic Villa',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop&q=80',
    emoji: '🏡',
    rented: false,
    totalPayout: 350000,
    description: 'Cozy basic villa with modern finishes and steady rental income – 20% daily returns'
  },
  {
    id: 2,
    name: 'Standard Apartment S2',
    price: 50000,
    dailyReturn: 10000,
    days: 70,
    location: 'Nakawa, Kampala',
    type: 'Standard Apartment',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop&q=80',
    emoji: '🏢',
    rented: false,
    totalPayout: 700000,
    description: 'Modern standard apartment block with high occupancy rates and solid returns'
  },
  {
    id: 3,
    name: 'Premium Townhouse A3',
    price: 100000,
    dailyReturn: 20000,
    days: 70,
    location: 'Kololo, Kampala',
    type: 'Premium Townhouse',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop&q=80',
    emoji: '🏘️',
    rented: false,
    totalPayout: 1400000,
    description: 'Premium townhouse in a prime location with excellent rental demand'
  },
  {
    id: 4,
    name: 'Complete Complex C4',
    price: 150000,
    dailyReturn: 30000,
    days: 70,
    location: 'Ntinda, Kampala',
    type: 'Residential Complex',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=500&fit=crop&q=80',
    emoji: '🏗️',
    rented: false,
    totalPayout: 2100000,
    description: 'Full residential complex with multiple units generating consistent daily income'
  },
  {
    id: 5,
    name: 'Scholar Heights P5',
    price: 250000,
    dailyReturn: 50000,
    days: 70,
    location: 'Muyenga, Kampala',
    type: 'Luxury Heights',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=500&fit=crop&q=80',
    emoji: '🌆',
    rented: false,
    totalPayout: 3500000,
    description: 'Luxury residential heights with panoramic views and premium tenant profile'
  },
  {
    id: 6,
    name: 'Elite Mansion L6',
    price: 500000,
    dailyReturn: 100000,
    days: 70,
    location: 'Naguru, Kampala',
    type: 'Elite Mansion',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=500&fit=crop&q=80',
    emoji: '🏰',
    rented: false,
    totalPayout: 7000000,
    description: 'Elite mansion estate with private amenities and high-end rental returns'
  },
  {
    id: 7,
    name: 'Academy Towers T7',
    price: 1000000,
    dailyReturn: 200000,
    days: 70,
    location: 'Bugolobi, Kampala',
    type: 'Commercial Towers',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=500&fit=crop&q=80',
    emoji: '🏙️',
    rented: false,
    totalPayout: 14000000,
    description: 'Iconic commercial towers ideal for institutional and corporate tenants'
  },
  {
    id: 8,
    name: 'Ultimate Estate P8',
    price: 2500000,
    dailyReturn: 500000,
    days: 70,
    location: 'Kololo Heights, Kampala',
    type: 'Ultimate Estate',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=500&fit=crop&q=80',
    emoji: '🏛️',
    rented: false,
    totalPayout: 35000000,
    description: 'Flagship ultimate estate portfolio with premium commercial & residential assets'
  }
];

const DEFAULT_ADMIN = {
  id: 'admin_1',
  phone: '779019391',
  password: 'Ug2530050.011253',
  balance: 0,
  isAdmin: true,
  referralCode: 'ADMIN123',
  referredBy: null,
  totalDeposits: 0,
  totalWithdrawn: 0,
  vipLevel: 10,
  activeRentals: 0,
  registrationDate: new Date().toISOString(),
  suspended: false,
  suspensionReason: ''
};

const COLLECTIONS = [
  'users',
  'transactions',
  'rentals',
  'messages',
  'supportMessages',
  'referrals',
  'pendingWithdrawals',
  'pendingDeposits',
  'depositHistory',
  'withdrawHistory',
  'products',
  'vipCodes',
  'vipRedemptions'
];

// ========== DATABASE LAYER ==========
function emptyDb() {
  const db = {};
  COLLECTIONS.forEach(c => { db[c] = []; });
  return db;
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Ensure all collections exist
      COLLECTIONS.forEach(c => {
        if (!Array.isArray(parsed[c])) parsed[c] = [];
      });
      return parsed;
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
  return emptyDb();
}

function saveDb(db) {
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
    return true;
  } catch (e) {
    console.error('DB save error:', e.message);
    return false;
  }
}

const DEFAULT_VIP_CODES = [
  { id: 'vip_UG112D', code: 'UG112D', amount: 200, label: 'VIP Starter', active: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'vip_VT88W1', code: 'VT88W1', amount: 300, label: 'VIP Bronze', active: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'vip_KW3300', code: 'KW3300', amount: 500, label: 'VIP Silver', active: true, createdAt: new Date().toISOString(), createdBy: 'system' },
  { id: 'vip_BB338W', code: 'BB338W', amount: 900, label: 'VIP Gold', active: true, createdAt: new Date().toISOString(), createdBy: 'system' }
];

function seedDbIfNeeded(db) {
  let changed = false;
  if (!db.products || db.products.length === 0) {
    db.products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    changed = true;
    console.log('🌱 Seeded default products');
  }
  if (!Array.isArray(db.vipCodes)) db.vipCodes = [];
  if (!Array.isArray(db.vipRedemptions)) db.vipRedemptions = [];
  DEFAULT_VIP_CODES.forEach(def => {
    if (!db.vipCodes.some(c => String(c.code).toUpperCase() === def.code)) {
      db.vipCodes.push(JSON.parse(JSON.stringify(def)));
      changed = true;
    }
  });
  if (changed && db.vipCodes.length) console.log('🌱 Seeded VIP codes');
  const hasAdmin = (db.users || []).some(u => u.isAdmin || u.phone === DEFAULT_ADMIN.phone);
  if (!hasAdmin) {
    db.users = db.users || [];
    db.users.push(JSON.parse(JSON.stringify(DEFAULT_ADMIN)));
    changed = true;
    console.log('🌱 Seeded default admin');
  }
  if (changed) saveDb(db);
  return db;
}

let DB = seedDbIfNeeded(loadDb());

// Reload from disk (for multi-process safety light)
function refreshDb() {
  DB = seedDbIfNeeded(loadDb());
  return DB;
}

// ========== Pending Marz deposits (separate file) ==========
function loadPending() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading pending deposits:', e.message);
  }
  return {};
}

function savePending(data) {
  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving pending deposits:', e.message);
  }
}

let pendingDeposits = loadPending();

// ========== Helpers ==========
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Markets supported by MarzPay — Uganda (UGX) only
const MARKETS = {
  UG: {
    code: 'UG', name: 'Uganda', currency: 'UGX', dial: '256',
    flag: '🇺🇬', providers: 'MTN & Airtel',
    minDeposit: 10000,
    toUgx: 1,
    phoneLen: [12] // +256 + 9 digits without leading 0
  }
};

/**
 * Normalize phone for a market. Returns { e164, country, currency } or null.
 * Accepts: 07..., +254..., 2547..., 7XXXXXXXX (with country selected)
 */
function normalizeMarketPhone(phone, countryCode) {
  if (!phone) return null;
  let p = String(phone).replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let country = (countryCode || '').toUpperCase();

  // Platform is Uganda-only (UGX)
  country = 'UG';

  const m = MARKETS[country];
  if (!m) return null;

  // Strip leading 0 and add country dial
  if (p.startsWith('0')) {
    p = m.dial + p.slice(1);
  } else if (!p.startsWith(m.dial)) {
    // Local 9-digit style
    if (p.length === 9 && /^[17]/.test(p)) {
      p = m.dial + p;
    }
  }

  // Must start with dial code and be reasonable length
  if (!p.startsWith(m.dial)) return null;
  if (p.length < 11 || p.length > 13) return null;

  return {
    e164: '+' + p,
    national: p,
    country: m.code,
    currency: m.currency,
    market: m
  };
}


// ========== LIVE CURRENCY RATES (auto) ==========
// Cache: refresh at most every RATE_TTL_MS. Fallback to MARKETS.toUgx if fetch fails.
const RATE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_SOURCES = [
  // open.er-api.com — free, no key; base currency → rates map
  (base) => `https://open.er-api.com/v6/latest/${base}`,
  // frankfurter (ECB) as secondary for major pairs (may lack CDF)
  (base) => `https://api.frankfurter.app/latest?from=${base}&to=UGX`
];

let rateCache = {
  updatedAt: 0,
  source: 'fallback',
  // Platform is UGX-only
  toUgx: {
    UGX: 1
  }
};

function httpsGetJson(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(e);
    }
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'CapitalEarns/1.0' }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          reject(new Error('Invalid JSON from rates API'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Rates request timeout'));
    });
    req.end();
  });
}

/** Cross-rate via USD: UGX per 1 FOREIGN = usdRates.UGX / usdRates.FOREIGN */
async function fetchRatesViaUsd() {
  const res = await httpsGetJson('https://open.er-api.com/v6/latest/USD');
  if (res.status !== 200 || res.data.result !== 'success' || !res.data.rates) {
    throw new Error('USD rates unavailable');
  }
  const r = res.data.rates;
  if (!r.UGX) throw new Error('UGX missing from rates');
  const out = { UGX: 1 };
  for (const cur of ['KES', 'RWF', 'CDF']) {
    if (r[cur] && r[cur] > 0) {
      // 1 FOREIGN = (1/r[cur]) USD; that USD * r.UGX = UGX
      out[cur] = r.UGX / r[cur];
    }
  }
  return {
    toUgx: out,
    source: 'open.er-api.com (USD cross)',
    time: res.data.time_last_update_utc || new Date().toISOString()
  };
}

/** Direct base=FOREIGN for each currency */
async function fetchRatesDirect() {
  const out = { UGX: 1 };
  let source = 'open.er-api.com (direct)';
  let time = null;
  for (const cur of ['KES', 'RWF', 'CDF']) {
    try {
      const res = await httpsGetJson(`https://open.er-api.com/v6/latest/${cur}`);
      if (res.status === 200 && res.data.result === 'success' && res.data.rates && res.data.rates.UGX) {
        out[cur] = res.data.rates.UGX;
        time = res.data.time_last_update_utc || time;
      }
    } catch (e) {
      console.warn('Direct rate fetch failed for', cur, e.message);
    }
  }
  if (!out.KES && !out.RWF && !out.CDF) throw new Error('No direct rates');
  return { toUgx: out, source, time: time || new Date().toISOString() };
}

async function refreshRates(force = false) {
  const age = Date.now() - rateCache.updatedAt;
  if (!force && rateCache.updatedAt && age < RATE_TTL_MS) {
    return rateCache;
  }
  try {
    let result;
    try {
      result = await fetchRatesViaUsd();
    } catch (e1) {
      console.warn('USD cross rates failed:', e1.message);
      result = await fetchRatesDirect();
    }
    // Merge: keep previous/fallback for any missing
    const merged = { UGX: 1 };
    // Sanity bounds (avoid bad API data)
    if (merged.KES && (merged.KES < 1 || merged.KES > 200)) delete merged.KES;
    if (merged.RWF && (merged.RWF < 0.1 || merged.RWF > 50)) delete merged.RWF;
    if (merged.CDF && (merged.CDF < 0.01 || merged.CDF > 50)) delete merged.CDF;
    // UGX-only platform — no foreign currency conversion

    rateCache = {
      updatedAt: Date.now(),
      source: result.source,
      time: result.time,
      toUgx: merged
    };
    // Mirror into MARKETS for deposit conversion
    MARKETS.UG.toUgx = 1;
    MARKETS.KE.toUgx = merged.KES;
    MARKETS.RW.toUgx = merged.RWF;
    MARKETS.CD.toUgx = merged.CDF;
    console.log('💱 Rates updated:', JSON.stringify(merged), 'via', result.source);
    return rateCache;
  } catch (e) {
    console.error('💱 Rate refresh failed, using fallback:', e.message);
    rateCache.updatedAt = Date.now(); // avoid hammering
    rateCache.source = 'fallback';
    return rateCache;
  }
}

function getToUgx(currency) {
  const c = (currency || 'UGX').toUpperCase();
  if (c === 'UGX') return 1;
  return (rateCache.toUgx && rateCache.toUgx[c]) || (MARKETS[c === 'KES' ? 'KE' : c === 'RWF' ? 'RW' : c === 'CDF' ? 'CD' : 'UG'] || {}).toUgx || 1;
}

function ratesPublicPayload() {
  return {
    success: true,
    base: 'UGX',
    source: rateCache.source,
    updatedAt: rateCache.updatedAt ? new Date(rateCache.updatedAt).toISOString() : null,
    providerTime: rateCache.time || null,
    ttlMinutes: Math.round(RATE_TTL_MS / 60000),
    rates: {
      UGX: 1,
      KES: getToUgx('KES'),
      RWF: getToUgx('RWF'),
      CDF: getToUgx('CDF')
    },
    // Convenient per-market view
    markets: Object.values(MARKETS).map(m => ({
      code: m.code,
      name: m.name,
      currency: m.currency,
      minDeposit: m.minDeposit,
      toUgx: getToUgx(m.currency),
      providers: m.providers
    }))
  };
}


// Backward-compatible alias
function normalizeUgPhone(phone) {
  const r = normalizeMarketPhone(phone, 'UG');
  return r ? r.e164 : null;
}

function generateUUID() {
  return crypto.randomUUID();
}

function marzRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(MARZ_BASE + endpoint);
    const options = {
      hostname: fullUrl.hostname,
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        'Authorization': `Basic ${MARZ_AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('MarzPay request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ========== DATABASE API HANDLERS ==========

/** GET /api/db — full dump */
function handleDbGetAll(req, res) {
  refreshDb();
  sendJson(res, 200, { success: true, data: DB });
}

/** GET /api/db/:collection */
function handleDbGetCollection(req, res, collection) {
  if (!COLLECTIONS.includes(collection)) {
    return sendJson(res, 404, { success: false, message: 'Unknown collection' });
  }
  refreshDb();
  sendJson(res, 200, { success: true, data: DB[collection] || [] });
}

/** PUT /api/db — replace entire database (bulk sync from client) */
async function handleDbPutAll(req, res) {
  try {
    const body = await parseBody(req);
    const incoming = body.data || body;
    if (!incoming || typeof incoming !== 'object') {
      return sendJson(res, 400, { success: false, message: 'Invalid body' });
    }
    refreshDb();
    COLLECTIONS.forEach(c => {
      if (Array.isArray(incoming[c])) {
        DB[c] = incoming[c];
      }
    });
    // Always keep at least admin + products
    seedDbIfNeeded(DB);
    saveDb(DB);
    sendJson(res, 200, { success: true, message: 'Database updated', counts: Object.fromEntries(COLLECTIONS.map(c => [c, (DB[c] || []).length])) });
  } catch (e) {
    sendJson(res, 400, { success: false, message: e.message });
  }
}

/** PUT /api/db/:collection — replace whole collection */
async function handleDbPutCollection(req, res, collection) {
  if (!COLLECTIONS.includes(collection)) {
    return sendJson(res, 404, { success: false, message: 'Unknown collection' });
  }
  try {
    const body = await parseBody(req);
    const items = Array.isArray(body) ? body : (body.data || []);
    if (!Array.isArray(items)) {
      return sendJson(res, 400, { success: false, message: 'Expected array' });
    }
    refreshDb();
    DB[collection] = items;
    if (collection === 'products' && DB.products.length === 0) {
      DB.products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (collection === 'users') {
      seedDbIfNeeded(DB);
    }
    saveDb(DB);
    sendJson(res, 200, { success: true, message: `${collection} updated`, count: DB[collection].length });
  } catch (e) {
    sendJson(res, 400, { success: false, message: e.message });
  }
}

/** POST /api/db/:collection — insert item(s) */
async function handleDbPostCollection(req, res, collection) {
  if (!COLLECTIONS.includes(collection)) {
    return sendJson(res, 404, { success: false, message: 'Unknown collection' });
  }
  try {
    const body = await parseBody(req);
    const items = Array.isArray(body) ? body : (body.data ? (Array.isArray(body.data) ? body.data : [body.data]) : [body]);
    refreshDb();
    if (!DB[collection]) DB[collection] = [];
    for (const item of items) {
      if (!item.id) item.id = collection.slice(0, 3) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      // Upsert by id
      const idx = DB[collection].findIndex(x => String(x.id) === String(item.id));
      if (idx >= 0) DB[collection][idx] = item;
      else DB[collection].push(item);
    }
    saveDb(DB);
    sendJson(res, 200, { success: true, message: 'Saved', count: items.length });
  } catch (e) {
    sendJson(res, 400, { success: false, message: e.message });
  }
}

/** DELETE /api/db/:collection/:id */
function handleDbDeleteItem(req, res, collection, id) {
  if (!COLLECTIONS.includes(collection)) {
    return sendJson(res, 404, { success: false, message: 'Unknown collection' });
  }
  refreshDb();
  const before = (DB[collection] || []).length;
  DB[collection] = (DB[collection] || []).filter(x => String(x.id) !== String(id));
  saveDb(DB);
  sendJson(res, 200, { success: true, deleted: before - DB[collection].length });
}

// ========== MarzPay Handlers (kept) ==========


function creditDbUser(user, entry) {
  const net = Number(entry.netCredit) || 0;
  if (!net || net <= 0) return user;
  user.balance = (Number(user.balance) || 0) + net;
  user.totalDeposits = (Number(user.totalDeposits) || 0) + net;
  // Auto deposit history
  DB.depositHistory = DB.depositHistory || [];
  const already = DB.depositHistory.find(h => h.reference && entry.reference && h.reference === entry.reference);
  if (!already) {
    DB.depositHistory.push({
      id: 'dep_' + Date.now(),
      phone: user.phone,
      amount: Number(entry.amount) || net,
      netCredit: net,
      fee: Number(entry.fee) || 0,
      method: entry.network || entry.method || 'Mobile Money',
      reference: entry.reference || null,
      status: 'completed',
      date: new Date().toISOString(),
      approvedDate: new Date().toISOString(),
      auto: true
    });
  }
  return user;
}


async function handleInitiateDeposit(req, res) {
  try {
    const body = await parseBody(req);
    const amount = parseFloat(body.amount);
    const userPhone = String(body.userPhone || '').trim();
    const countryHint = String(body.country || body.countryCode || 'UG').toUpperCase();

    const phoneInfo = normalizeMarketPhone(body.phone || body.payerPhone, countryHint);
    if (!phoneInfo) {
      return sendJson(res, 400, {
        success: false,
        message: 'Valid mobile money number required for Uganda (+256), Kenya (+254), Rwanda (+250), or DRC (+243)'
      });
    }

    const market = phoneInfo.market;
    const minDep = market.minDeposit || MIN_DEPOSIT;

    if (!amount || isNaN(amount) || amount < minDep) {
      return sendJson(res, 400, {
        success: false,
        message: `Minimum deposit is ${minDep.toLocaleString()} ${market.currency} (${market.name})`
      });
    }

    if (!userPhone) {
      return sendJson(res, 400, {
        success: false,
        message: 'User account phone is required'
      });
    }

    // Platform wallet is UGX: convert local currency → UGX credit (live rates)
    await refreshRates(false);
    const rate = getToUgx(market.currency);
    const amountUgx = Math.round(amount * rate);
    const fee = Math.round(amountUgx * (DEPOSIT_FEE_PERCENT / 100));
    const netCredit = amountUgx - fee; // credited to user balance in UGX
    const reference = generateUUID();

    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = (req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https'));
    const callbackUrl = `${protocol}://${host}/api/marz/webhook`;

    // MarzPay multi-market payload
    const payload = {
      amount: amount,
      phone_number: phoneInfo.e164,
      phone: phoneInfo.e164,
      country: phoneInfo.country,
      currency: phoneInfo.currency,
      reference: reference,
      description: `RealEarns-Estates deposit - ${userPhone} (${phoneInfo.country})`,
      callback_url: callbackUrl
    };

    let marzResult;
    try {
      marzResult = await marzRequest('POST', '/collect-money', payload);
    } catch (err) {
      console.error('MarzPay request failed:', err.message);
      return sendJson(res, 502, { success: false, message: 'Payment gateway unavailable. Try again.' });
    }

    pendingDeposits[reference] = {
      reference,
      userPhone,
      payerPhone: phoneInfo.e164,
      country: phoneInfo.country,
      currency: phoneInfo.currency,
      amountLocal: amount,
      amountUgx,
      amount, // keep for status display
      fee,
      netCredit,
      status: 'pending',
      createdAt: new Date().toISOString(),
      marzResponse: marzResult.data
    };
    savePending(pendingDeposits);

    if (marzResult.statusCode >= 200 && marzResult.statusCode < 300) {
      return sendJson(res, 200, {
        success: true,
        message: `Payment prompt sent to ${phoneInfo.e164}. Approve on your phone (${market.providers}).`,
        reference,
        amount,
        amountLocal: amount,
        currency: phoneInfo.currency,
        country: phoneInfo.country,
        amountUgx,
        fee,
        netCredit,
        phone: phoneInfo.e164,
        data: {
          ...(marzResult.data || {}),
          reference,
          netCredit,
          fee,
          phone: phoneInfo.e164,
          country: phoneInfo.country,
          currency: phoneInfo.currency
        }
      });
    }

    return sendJson(res, 400, {
      success: false,
      message: (marzResult.data && (marzResult.data.message || marzResult.data.error)) || 'Failed to initiate payment',
      data: marzResult.data
    });
  } catch (e) {
    console.error('initiate deposit error:', e);
    return sendJson(res, 500, { success: false, message: e.message || 'Server error' });
  }
}

async function handleDepositStatus(req, res, reference) {
  const entry = pendingDeposits[reference];
  if (!entry) {
    return sendJson(res, 404, { success: false, message: 'Reference not found' });
  }

  // Optionally poll Marz for status
  try {
    const statusRes = await marzRequest('GET', `/collections/${reference}`);
    if (statusRes.data && statusRes.data.status) {
      const st = String(statusRes.data.status).toLowerCase();
      if (st === 'completed' || st === 'successful' || st === 'success') {
        entry.status = 'completed';
        entry.completedAt = new Date().toISOString();
        savePending(pendingDeposits);

        // Credit user in DB
        refreshDb();
        const user = (DB.users || []).find(u => u.phone === entry.userPhone);
        if (user && !entry.credited) {
          creditDbUser(user, entry);
          DB.transactions = DB.transactions || [];
          DB.transactions.push({
            id: 'txn_' + Date.now(),
            phone: user.phone,
            type: 'deposit',
            amount: entry.netCredit,
            description: `Deposit via MarzPay (ref ${reference})`,
            date: new Date().toISOString(),
            status: 'completed'
          });
          entry.credited = true;
          savePending(pendingDeposits);
          saveDb(DB);
        }
      } else if (st === 'failed' || st === 'cancelled') {
        entry.status = st;
        savePending(pendingDeposits);
      }
    }
  } catch (e) {
    // ignore poll errors
  }

  return sendJson(res, 200, {
    success: true,
    reference,
    status: entry.status,
    amount: entry.amount,
    netCredit: entry.netCredit,
    fee: entry.fee,
    userPhone: entry.userPhone
  });
}

async function handleMarzWebhook(req, res) {
  try {
    const body = await parseBody(req);
    console.log('Marz webhook:', JSON.stringify(body).slice(0, 500));
    const reference = body.reference || body.transaction_reference || (body.data && body.data.reference);
    if (!reference || !pendingDeposits[reference]) {
      return sendJson(res, 200, { received: true });
    }
    const entry = pendingDeposits[reference];
    const status = String(body.status || (body.data && body.data.status) || '').toLowerCase();
    if (status === 'completed' || status === 'successful' || status === 'success') {
      entry.status = 'completed';
      entry.completedAt = new Date().toISOString();
      if (!entry.credited) {
        refreshDb();
        const user = (DB.users || []).find(u => u.phone === entry.userPhone);
        if (user) {
          creditDbUser(user, entry);
          DB.transactions = DB.transactions || [];
          DB.transactions.push({
            id: 'txn_' + Date.now(),
            phone: user.phone,
            type: 'deposit',
            amount: entry.netCredit,
            description: `Deposit via MarzPay (ref ${reference})`,
            date: new Date().toISOString(),
            status: 'completed'
          });
          entry.credited = true;
          saveDb(DB);
        }
      }
      savePending(pendingDeposits);
    } else if (status === 'failed' || status === 'cancelled') {
      entry.status = status;
      savePending(pendingDeposits);
    }
    return sendJson(res, 200, { received: true });
  } catch (e) {
    console.error('webhook error:', e);
    return sendJson(res, 200, { received: true });
  }
}



// ========== WITHDRAWAL API ==========
async function handleWithdrawRequest(req, res) {
  try {
    const body = await parseBody(req);
    const phone = String(body.phone || '').trim();
    const amount = parseFloat(body.amount);
    const withdrawPhone = String(body.withdrawPhone || '').trim();
    const network = body.network === 'mtn' ? 'mtn' : 'airtel';
    const networkName = network === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money';

    if (!phone || !amount || amount < 10000 || amount > 1000000) {
      return sendJson(res, 400, { success: false, message: 'Invalid phone or amount (10,000 – 1,000,000 UGX)' });
    }
    if (!withdrawPhone || withdrawPhone.length < 9) {
      return sendJson(res, 400, { success: false, message: 'Valid Mobile Money phone required' });
    }

    refreshDb();
    const user = (DB.users || []).find(u => u.phone === phone);
    if (!user) return sendJson(res, 404, { success: false, message: 'User not found' });
    if (user.suspended) return sendJson(res, 403, { success: false, message: 'Account suspended' });

    const hasRental = (DB.rentals || []).some(r => r.phone === phone && r.status === 'active');
    if (!hasRental) {
      return sendJson(res, 400, { success: false, message: 'Active investment required before withdrawal' });
    }

    const pending = (DB.pendingWithdrawals || []).some(w => w.phone === phone && w.status === 'pending');
    if (pending) {
      return sendJson(res, 400, { success: false, message: 'You already have a pending withdrawal' });
    }

    const fee = Math.round(amount * 0.05);
    const total = amount + fee;
    if ((user.balance || 0) < total) {
      return sendJson(res, 400, {
        success: false,
        message: `Insufficient balance. Need UGX ${total.toLocaleString()} (incl. 5% fee)`
      });
    }

    user.balance -= total;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;

    const id = 'wd_' + Date.now();
    const record = {
      id,
      phone: user.phone,
      amount,
      fee,
      feePercentage: 5,
      withdrawPhone,
      withdrawHolder: body.holder || user.phone,
      withdrawMethod: networkName,
      withdrawNetwork: network,
      country: body.country || 'UG',
      countryName: body.countryName || '',
      currency: body.currency || 'UGX',
      dialCode: body.dialCode || '',
      date: new Date().toISOString(),
      status: 'pending'
    };

    DB.pendingWithdrawals = DB.pendingWithdrawals || [];
    DB.pendingWithdrawals.push(record);
    DB.withdrawHistory = DB.withdrawHistory || [];
    DB.withdrawHistory.push({
      ...record,
      requestedDate: record.date,
      approvedDate: null
    });
    DB.transactions = DB.transactions || [];
    DB.transactions.push({
      id: 'txn_' + Date.now(),
      phone: user.phone,
      type: 'withdrawal',
      amount,
      fee,
      description: `Withdrawal request to ${networkName} (${withdrawPhone}) - 5% fee: UGX ${fee.toLocaleString()}`,
      date: new Date().toISOString(),
      status: 'pending'
    });

    saveDb(DB);
    sendJson(res, 200, { success: true, message: 'Withdrawal submitted', id, amount, fee, totalDeducted: total });
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message });
  }
}

async function handleWithdrawAction(req, res) {
  try {
    const body = await parseBody(req);
    const { id, action } = body; // action: approve | reject
    if (!id || !['approve', 'reject'].includes(action)) {
      return sendJson(res, 400, { success: false, message: 'id and action (approve|reject) required' });
    }
    refreshDb();
    const w = (DB.pendingWithdrawals || []).find(x => x.id === id);
    if (!w || w.status !== 'pending') {
      return sendJson(res, 404, { success: false, message: 'Pending withdrawal not found' });
    }

    if (action === 'approve') {
      w.status = 'approved';
      const h = (DB.withdrawHistory || []).find(x => x.id === id);
      if (h) { h.status = 'approved'; h.approvedDate = new Date().toISOString(); }
      const t = (DB.transactions || []).find(x => x.phone === w.phone && x.type === 'withdrawal' && x.amount === w.amount && x.status === 'pending');
      if (t) t.status = 'completed';
    } else {
      w.status = 'rejected';
      const user = (DB.users || []).find(u => u.phone === w.phone);
      if (user) {
        user.balance = (user.balance || 0) + w.amount + (w.fee || 0);
        user.totalWithdrawn = Math.max(0, (user.totalWithdrawn || 0) - w.amount);
      }
      const h = (DB.withdrawHistory || []).find(x => x.id === id);
      if (h) h.status = 'rejected';
      const t = (DB.transactions || []).find(x => x.phone === w.phone && x.type === 'withdrawal' && x.amount === w.amount && x.status === 'pending');
      if (t) t.status = 'rejected';
    }

    saveDb(DB);
    sendJson(res, 200, { success: true, status: w.status });
  } catch (e) {
    sendJson(res, 500, { success: false, message: e.message });
  }
}


// ========== DAILY PROFIT DISTRIBUTION ==========
function distributeProfits() {
  refreshDb();
  const now = Date.now();
  let totalPaid = 0;
  let claims = 0;
  const details = [];

  const rentals = DB.rentals || [];
  for (const rental of rentals) {
    if (rental.status !== 'active') continue;

    // Ensure timers exist
    if (!rental.nextClaimTime) {
      const base = rental.lastClaimDate || rental.startDate || new Date().toISOString();
      rental.nextClaimTime = new Date(new Date(base).getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    if (rental.remainingDays == null) {
      rental.remainingDays = rental.totalDays || rental.days || 70;
    }
    if (rental.dayCounter == null) rental.dayCounter = 0;
    if (rental.totalEarned == null) rental.totalEarned = 0;

    let safety = 0;
    while (rental.status === 'active' && new Date(rental.nextClaimTime).getTime() <= now && safety < 100) {
      safety++;
      const profit = Number(rental.dailyReturn) || 0;
      if (profit <= 0) break;

      const user = (DB.users || []).find(u => u.phone === rental.phone);
      if (!user || user.suspended) break;

      user.balance = (user.balance || 0) + profit;
      rental.totalEarned = (rental.totalEarned || 0) + profit;
      rental.remainingDays = Math.max(0, (rental.remainingDays || 1) - 1);
      rental.dayCounter = (rental.dayCounter || 0) + 1;
      rental.lastClaimDate = new Date().toISOString();
      rental.nextClaimTime = new Date(new Date(rental.nextClaimTime).getTime() + 24 * 60 * 60 * 1000).toISOString();

      if (rental.remainingDays <= 0) {
        rental.status = 'completed';
        user.activeRentals = Math.max(0, (user.activeRentals || 0) - 1);
      }

      DB.transactions = DB.transactions || [];
      DB.transactions.push({
        id: 'txn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        phone: user.phone,
        type: 'earning',
        amount: profit,
        description: `⚡ Day ${rental.dayCounter} income from ${rental.propertyName}`,
        date: new Date().toISOString(),
        status: 'completed'
      });

      totalPaid += profit;
      claims++;
      details.push({ phone: user.phone, package: rental.propertyName, amount: profit, day: rental.dayCounter });
    }
  }

  if (claims > 0) {
    saveDb(DB);
    console.log(`💰 Profit distribution: ${claims} claims, UGX ${totalPaid.toLocaleString()}`);
  }

  return { claims, totalPaid, details };
}

function handleDistributeProfits(req, res) {
  try {
    const result = distributeProfits();
    sendJson(res, 200, { success: true, ...result });
  } catch (e) {
    console.error('distribute error:', e);
    sendJson(res, 500, { success: false, message: e.message });
  }
}


// ========== Static files ==========
function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (filePath !== indexPath) {
        fs.readFile(indexPath, (err2, indexData) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ========== Server ==========
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let parsedUrl;
  try {
    const u = new URL(req.url, 'http://localhost');
    parsedUrl = { pathname: u.pathname, query: Object.fromEntries(u.searchParams.entries()) };
  } catch (e) {
    parsedUrl = { pathname: req.url.split('?')[0], query: {} };
  }
  let pathname = parsedUrl.pathname || '/';

  // Health
  if (pathname === '/api/health') {
    refreshDb();
    return sendJson(res, 200, {
      status: 'ok',
      message: 'RealEarns-Estates server is running',
      database: 'connected',
      dbFile: DB_FILE,
      counts: Object.fromEntries(COLLECTIONS.map(c => [c, (DB[c] || []).length])),
      marzpay: 'configured',
      markets: Object.keys(MARKETS),
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/markets' && req.method === 'GET') {
    await refreshRates(false);
    return sendJson(res, 200, ratesPublicPayload());
  }

  if (pathname === '/api/rates' && req.method === 'GET') {
    const force = parsedUrl.query && (parsedUrl.query.refresh === '1' || parsedUrl.query.refresh === 'true');
    await refreshRates(!!force);
    return sendJson(res, 200, ratesPublicPayload());
  }

  // ---- Database API ----
  if (pathname === '/api/db') {
    if (req.method === 'GET') return handleDbGetAll(req, res);
    if (req.method === 'PUT' || req.method === 'POST') return handleDbPutAll(req, res);
  }

  if (pathname.startsWith('/api/db/')) {
    const parts = pathname.split('/').filter(Boolean); // ['api','db', collection, id?]
    const collection = parts[2];
    const id = parts[3];

    if (collection && COLLECTIONS.includes(collection)) {
      if (req.method === 'GET' && !id) return handleDbGetCollection(req, res, collection);
      if ((req.method === 'PUT' || req.method === 'POST') && !id) {
        // POST = upsert items, PUT = replace collection
        if (req.method === 'PUT') return handleDbPutCollection(req, res, collection);
        return handleDbPostCollection(req, res, collection);
      }
      if (req.method === 'DELETE' && id) return handleDbDeleteItem(req, res, collection, id);
    }
  }

  // Withdrawals
  if (pathname === '/api/withdraw/request' && req.method === 'POST') {
    return handleWithdrawRequest(req, res);
  }
  if (pathname === '/api/withdraw/action' && req.method === 'POST') {
    return handleWithdrawAction(req, res);
  }

  // Daily profits
  if (pathname === '/api/profits/distribute' && (req.method === 'POST' || req.method === 'GET')) {
    return handleDistributeProfits(req, res);
  }

  // MarzPay
  if (pathname === '/api/deposit/initiate' && req.method === 'POST') {
    return handleInitiateDeposit(req, res);
  }
  if (pathname.startsWith('/api/deposit/status/') && req.method === 'GET') {
    const reference = pathname.replace('/api/deposit/status/', '').trim();
    return handleDepositStatus(req, res, reference);
  }
  if (pathname === '/api/marz/webhook' && req.method === 'POST') {
    return handleMarzWebhook(req, res);
  }

  // Static
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
});

// Run profit distribution every hour
setInterval(() => {
  try { distributeProfits(); } catch (e) { console.error(e); }
}, 60 * 60 * 1000);

server.listen(PORT, () => {
  refreshDb();
  try { distributeProfits(); } catch (e) {}
  refreshRates(true).catch(() => {});
  // Auto-refresh rates every hour
  setInterval(() => { refreshRates(true).catch(() => {}); }, RATE_TTL_MS);
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         RealEarns-Estates Server Started                      ║
╠══════════════════════════════════════════════════════════╣
║  Local:     http://localhost:${PORT}                         ║
║  Database:  ${DB_FILE}
║  Collections: ${COLLECTIONS.join(', ')}
║  MarzPay:   Integrated (Collections)                     ║
║  Fee:       ${DEPOSIT_FEE_PERCENT}% | Min deposit: ${MIN_DEPOSIT.toLocaleString()} UGX              ║
║  API:       GET/PUT /api/db  |  /api/db/:collection      ║
║  Webhook:   /api/marz/webhook                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});
