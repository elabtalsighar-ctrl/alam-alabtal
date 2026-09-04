import { getSettings, dbGet, dbAll, dbRun } from './db.js';

async function getConfig() {
  const s = await getSettings();
  return {
    enabled: s.ecotrack_enabled === '1',
    token: (s.ecotrack_token || '').trim(),
    baseUrl: (s.ecotrack_base_url || 'https://anderson-ecommerce.ecotrack.dz').trim().replace(/\/$/, '')
  };
}

function wilayaCode(wilayaStr) {
  const m = String(wilayaStr || '').match(/\d+/);
  return m ? m[0] : '16';
}

export async function pushOrderToEcotrack(order) {
  const { enabled, token, baseUrl } = await getConfig();
  if (!enabled || !token) return { skipped: true, reason: 'disabled or no token' };

  const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  const itemsDesc = items.map(i => `${i.product_name} x${i.quantity}`).join(', ');

  async function doCreate(communeToUse) {
    const params = new URLSearchParams({
      api_token: token,
      reference: order.order_number,
      nom_client: order.customer_name || '',
      telephone: String(order.phone || '').replace(/[^0-9]/g, '').slice(-10),
      adresse: order.address || '',
      commune: communeToUse,
      code_wilaya: wilayaCode(order.wilaya),
      montant: String(order.total || 0),
      produit: itemsDesc.slice(0, 250),
      type: '1',
      stock: '0',
      stop_desk: String(order.stop_desk || 0)
    });
    const url = `${baseUrl}/api/v1/create/order?${params.toString()}`;
    const r = await fetch(url, { method: 'POST' });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    console.log(`[Ecotrack] POST order -> ${r.status}`);
    return { r, text, json, url };
  }

  try {
  let { r, text, json } = await doCreate(order.commune || '');
  if (json && json.success) {
    const tracking = json.tracking || json.reference || '';
    try {
      await dbRun('UPDATE orders SET ecotrack_id = $1, ecotrack_tracking = $2 WHERE id = $3', [String(tracking || ''), String(tracking || ''), order.id]);
    } catch {}
    return { ok: true, tracking, response: json };
  }
  const isCommuneError = text.includes('Commune') && r.status === 422;
  if (isCommuneError) {
    try {
      const code = wilayaCode(order.wilaya);
      const listUrl = `${baseUrl}/api/v1/get/communes?api_token=${encodeURIComponent(token)}&wilaya_id=${code}`;
      const lr = await fetch(listUrl);
      const lt = await lr.text();
      let list = null;
      try { list = JSON.parse(lt); } catch {}
      if (Array.isArray(list) && list.length) {
        const fallback = list[0].nom;
        console.log(`[Ecotrack] Retrying with fallback commune "${fallback}" for wilaya ${code}`);
        const retry = await doCreate(fallback);
        if (retry.json && retry.json.success) {
          const tracking = retry.json.tracking || retry.json.reference || '';
          try {
            await dbRun('UPDATE orders SET ecotrack_id = $1, ecotrack_tracking = $2, commune = $3 WHERE id = $4', [String(tracking || ''), String(tracking || ''), fallback, order.id]);
          } catch {}
          return { ok: true, tracking, response: retry.json, fallbackCommune: fallback };
        }
        return { ok: false, error: 'Ecotrack commune error' };
      }
    } catch (e) {
      console.error('[Ecotrack] fallback fetch error', e.message);
    }
  }
  if (json && json.success === false) return { ok: false, error: 'Ecotrack rejected the order' };
  if (!r.ok) return { ok: false, error: 'Ecotrack request failed' };
  return { ok: false, error: 'Ecotrack: unexpected response' };
  } catch (e) {
    console.error('[Ecotrack] error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function testEcotrackConnection() {
  const { token, baseUrl } = await getConfig();
  if (!token) return { ok: false, error: 'لم يتم ضبط Token' };
  const url = `${baseUrl}/api/v1/validate/token?api_token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    console.log(`[Ecotrack test] -> ${r.status}`);
    if (json && json.success) return { ok: true };
    return { ok: false, error: 'فشل التحقق من Token' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
