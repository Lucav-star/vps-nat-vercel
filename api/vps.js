// api/vps.js - Vercel Serverless Function
import { Redis } from '@upstash/redis';

const PROVIDERS = [
"https://api.sshkit.org","https://api.sshstores.net","https://api.sshmax.net",
"https://api.fastssh.com","https://api.vpnjantit.com","https://api.sshudp.com",
"https://api.zanderz.net","https://api.hostssh.net","https://api.sshdropbear.net",
"https://api.ssh-j.com","https://api.tunnelbear.net","https://api.sshinfinity.net",
"https://api.ssh-free.net","https://api.vpsfree.net","https://api.natvps.com",
"https://api.sshagan.net","https://api.sshkuy.net","https://api.sshbooster.net",
"https://api.sshpremium.net","https://api.sshmurah.net","https://api.sshvip.net",
"https://api.sshpro.net","https://api.sshgratis.net","https://api.sshunlimited.net",
"https://api.sshserver.net","https://api.sshcepat.net","https://api.sshgaming.net",
"https://api.sshhost.net","https://api.sshcloud.net","https://api.sshmaxpro.net",
"https://api.sshtunnel.net","https://api.sshzone.net","https://api.sshland.net",
"https://api.sshworld.net","https://api.sshlink.net","https://api.sshgate.net",
"https://api.sshcore.net","https://api.sshnet.net","https://api.sshfast.net",
"https://api.sshprime.net","https://api.sshmaster.net","https://api.sshking.net",
"https://api.sshlegend.net","https://api.sshultra.net","https://api.sshultrapro.net",
"https://api.sshpremiumpro.net","https://api.sshcheap.net","https://api.sshpremiumvip.net",
"https://api.sshroyal.net","https://api.sshsultan.net"
];

// Init Redis (kalau env ada)
let redis = null;
try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = Redis.fromEnv();
    }
} catch(e) { console.log('Redis not configured'); }

// In-memory fallback (hilang saat function cold)
const memStore = new Map();

async function kvGet(key) {
    if (redis) return await redis.get(key);
    return memStore.get(key);
}
async function kvSet(key, val) {
    if (redis) return await redis.set(key, val);
    memStore.set(key, val);
}
async function kvDel(key) {
    if (redis) return await redis.del(key);
    memStore.delete(key);
}
async function kvKeys(prefix) {
    if (redis) return await redis.keys(prefix + '*');
    return [...memStore.keys()].filter(k => k.startsWith(prefix));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const act = req.query.act || 'list';
    const body = req.method === 'POST' ? (req.body || {}) : {};
    const input = typeof body === 'string' ? JSON.parse(body) : body;

    try {
        switch (act) {

            case 'create': {
                const p = parseInt(input.provider) - 1;
                if (!PROVIDERS[p]) return res.status(400).json({ error: 'Invalid' });
                const user = (input.user || '').trim();
                const pass = input.pass;
                const days = parseInt(input.days) || 30;
                if (!user || !pass) return res.status(400).json({ error: 'Kosong' });

                const r = await fetch(`${PROVIDERS[p]}/create`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({username:user, password:pass, days})
                }).catch(e => ({ ok: false, err: e.message }));

                let data;
                try { data = await r.json?.(); } catch(e) { data = { raw: r.err || 'No response' }; }
                data.username = user; data.password = pass; data.provider = PROVIDERS[p];
                data.created = new Date().toISOString();

                await kvSet('vps:' + user, JSON.stringify(data));
                return res.json(data);
            }

            case 'delete': {
                await kvDel('vps:' + input.user);
                return res.json({ success: true, user: input.user });
            }

            case 'renew': {
                const raw = await kvGet('vps:' + input.user);
                if (!raw) return res.status(404).json({ error: 'Not found' });
                const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
                const r = await fetch(`${v.provider}/renew`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({username: input.user, days: input.days || 30})
                }).catch(e => ({ err: e.message }));
                return res.json({ success: true, response: r.err || 'OK' });
            }

            case 'list': {
                const keys = await kvKeys('vps:');
                const out = [];
                for (const k of keys) {
                    const v = await kvGet(k);
                    try { out.push(typeof v === 'string' ? JSON.parse(v) : v); } catch(e) {}
                }
                return res.json(out);
            }

            case 'statistik': {
                const keys = await kvKeys('vps:');
                let ip = '-';
                try { ip = (await fetch('https://ifconfig.me').then(r=>r.text())).trim(); } catch(e) {}
                return res.json({
                    total_vps: keys.length,
                    ip_public: ip,
                    waktu: new Date().toLocaleString('id-ID'),
                    version: '11.0',
                    storage: redis ? 'Upstash Redis' : 'In-Memory (sementara)'
                });
            }

            case 'log': {
                const raw = await kvGet('log');
                return res.json({ log: raw || 'Log kosong. Log hanya muncul kalau pakai Redis.' });
            }

            case 'bulk_create': {
                const p = parseInt(input.provider) - 1;
                const prefix = input.prefix || 'user';
                const n = Math.min(parseInt(input.jumlah) || 10, 50);
                const pass = input.pass;
                const days = parseInt(input.days) || 30;

                let ok = 0, fail = 0, results = [];
                for (let i = 1; i <= n; i++) {
                    const user = prefix + i;
                    const r = await fetch(`${PROVIDERS[p]}/create`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: new URLSearchParams({username:user, password:pass, days})
                    }).catch(() => null);

                    let data = null;
                    try { data = await r?.json(); } catch(e) {}
                    if (data) {
                        data.username = user; data.password = pass; data.provider = PROVIDERS[p];
                        await kvSet('vps:' + user, JSON.stringify(data));
                        results.push({user, status:'OK'}); ok++;
                    } else {
                        results.push({user, status:'FAIL'}); fail++;
                    }
                }
                return res.json({ total: n, ok, fail, results });
            }

            case 'bulk_delete': {
                const prefix = input.prefix;
                const n = Math.min(parseInt(input.jumlah) || 10, 50);
                for (let i = 1; i <= n; i++) await kvDel('vps:' + prefix + i);
                return res.json({ deleted: n });
            }

            default:
                return res.status(400).json({ error: 'Unknown action: ' + act });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
                                 }
