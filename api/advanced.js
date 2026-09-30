// api/advanced.js - Vercel Serverless Function

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

async function fetchWithTimeout(url, opts = {}, timeout = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
        const r = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        return r;
    } catch(e) { clearTimeout(t); throw e; }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const act = req.query.act || '';
    const body = req.method === 'POST' ? (req.body || {}) : {};
    const in_ = typeof body === 'string' ? JSON.parse(body) : body;

    try {
        switch (act) {

            case 'cek_provider': {
                const out = {};
                const promises = PROVIDERS.map(async (u, i) => {
                    const t0 = Date.now();
                    try {
                        const r = await fetchWithTimeout(u, { method: 'HEAD' }, 5000);
                        out[i+1] = { url: u, code: r.status, status: r.status === 200 ? 'ONLINE' : 'DOWN', ms: Date.now() - t0 };
                    } catch(e) {
                        out[i+1] = { url: u, code: 0, status: 'DOWN', ms: Date.now() - t0, err: e.message };
                    }
                });
                await Promise.all(promises);
                return res.json(out);
            }

            case 'fastest': {
                let best = 1, bestTime = Infinity;
                await Promise.all(PROVIDERS.map(async (u, i) => {
                    const t0 = Date.now();
                    try { await fetchWithTimeout(u, {method:'HEAD'}, 5000); } catch(e) {}
                    const t = Date.now() - t0;
                    if (t < bestTime) { bestTime = t; best = i+1; }
                }));
                return res.json({ number: best, url: PROVIDERS[best-1], time: bestTime + 'ms' });
            }

            case 'benchmark': {
                const out = {};
                await Promise.all(PROVIDERS.map(async (u, i) => {
                    const t0 = Date.now();
                    let code = 0;
                    try { const r = await fetchWithTimeout(u, {method:'HEAD'}, 5000); code = r.status; } catch(e) {}
                    out[i+1] = { time: (Date.now()-t0) + 'ms', code };
                }));
                return res.json(out);
            }

            case 'reverse_dns': {
                try {
                    const r = await fetch(`https://dns.google/resolve?name=${in_.ip}&type=PTR`);
                    const d = await r.json();
                    return res.json({ ip: in_.ip, hostname: d.Answer?.[0]?.data || 'Not found' });
                } catch(e) { return res.json({ error: e.message }); }
            }

            case 'subdomain': {
                const d = in_.domain;
                const subs = ['www','api','mail','ssh','vps','admin','cpanel','ftp','dev','test'];
                const out = {};
                await Promise.all(subs.map(async (s) => {
                    try {
                        const r = await fetch(`https://dns.google/resolve?name=${s}.${d}&type=A`);
                        const j = await r.json();
                        if (j.Answer?.[0]?.data) out[`${s}.${d}`] = j.Answer[0].data;
                    } catch(e) {}
                }));
                return res.json({ domain: d, found: out });
            }

            case 'port_check': {
                return res.json({ 
                    host: in_.host, 
                    port: in_.port, 
                    note: 'Vercel tidak support raw socket. Pakai VPS kalau butuh port check real.',
                    status: 'N/A'
                });
            }

            case 'ip_public': {
                try {
                    const ip = (await fetch('https://ifconfig.me').then(r=>r.text())).trim();
                    return res.json({ ip });
                } catch(e) { return res.json({ error: e.message }); }
            }

            case 'ip_leak': {
                try {
                    const r = await fetch('https://ipinfo.io/json');
                    return res.json(await r.json());
                } catch(e) { return res.json({ error: e.message }); }
            }

            case 'geo_ip': {
                try {
                    const r = await fetch(`http://ip-api.com/json/${in_.ip}`);
                    return res.json(await r.json());
                } catch(e) { return res.json({ error: e.message }); }
            }

            case 'gen_pass': {
                const len = Math.max(4, Math.min(parseInt(in_.len) || 16, 128));
                const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
                let p = '';
                for (let i = 0; i < len; i++) p += c[Math.floor(Math.random() * c.length)];
                return res.json({ password: p, length: len });
            }

            case 'gen_uuid': {
                const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
                return res.json({ uuid });
            }

            case 'hash_md5': {
                const crypto = await import('crypto');
                return res.json({ md5: crypto.createHash('md5').update(in_.text || '').digest('hex') });
            }

            case 'hash_sha256': {
                const crypto = await import('crypto');
                return res.json({ sha256: crypto.createHash('sha256').update(in_.text || '').digest('hex') });
            }

            case 'b64_enc': {
                return res.json({ output: Buffer.from(in_.text || '').toString('base64') });
            }

            case 'b64_dec': {
                try { return res.json({ output: Buffer.from(in_.text || '', 'base64').toString('utf-8') }); }
                catch(e) { return res.json({ error: 'Invalid base64' }); }
            }

            case 'health': {
                return res.json({
                    status: 'ok',
                    checks: {
                        runtime: 'Vercel Serverless (Node ' + process.version + ')',
                        region: process.env.VERCEL_REGION || 'unknown',
                        env: process.env.VERCEL_ENV || 'unknown',
                        time: new Date().toISOString()
                    }
                });
            }

            case 'sysinfo': {
                return res.json({
                    hostname: 'vercel-serverless',
                    os: process.platform,
                    node: process.version,
                    region: process.env.VERCEL_REGION || 'unknown',
                    env: process.env.VERCEL_ENV || 'unknown',
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
                });
            }

            default:
                return res.status(400).json({ error: 'Unknown action: ' + act });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
    }
