// Historial de versiones de cada informe (para ver y restaurar).
import { store } from './_lib.js';

const MAX_VERSIONS = 30, MIN_GAP = 10 * 60 * 1000;
const idxKey = (c, p) => `idx/${c}/${p}`;
const verKey = (c, p, v) => `v/${c}/${p}/${v}`;

/** Guarda una instantánea si hay un evento (enviado, reabierto…) o pasaron 10 min desde la última. */
export async function snapshot(cycleId, plantId, r, event, by) {
  const hs = await store('history');
  const idx = (await hs.get(idxKey(cycleId, plantId), { type: 'json' })) || [];
  const last = idx[idx.length - 1];
  if (!event && last && Date.now() - new Date(last.at).getTime() < MIN_GAP) return;
  if (last && last.version === r.version) return;
  idx.push({ version: r.version, at: r.updatedAt || new Date().toISOString(), by, event: event || 'guardado', slides: r.slides.length });
  await hs.setJSON(verKey(cycleId, plantId, r.version), { slides: r.slides, naSections: r.naSections, kpis: r.kpis });
  while (idx.length > MAX_VERSIONS) { const old = idx.shift(); await hs.delete(verKey(cycleId, plantId, old.version)); }
  await hs.setJSON(idxKey(cycleId, plantId), idx);
}
export async function listVersions(c, p) { return ((await (await store('history')).get(idxKey(c, p), { type: 'json' })) || []).slice().reverse(); }
export async function getVersion(c, p, v) { return (await store('history')).get(verKey(c, p, v), { type: 'json' }); }
export async function deleteHistory(cycleId) {
  const hs = await store('history');
  for (const prefix of [`idx/${cycleId}/`, `v/${cycleId}/`]) for (const b of (await hs.list({ prefix })).blobs) await hs.delete(b.key);
}
