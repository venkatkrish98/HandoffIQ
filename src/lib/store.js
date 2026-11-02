/**
 * Persistence on Forge Key-Value Store (per-installation, so tenant isolated).
 * Handovers are private to the user who created them: each user has their own
 * index, and every read/write checks ownership.
 */
import { kvs } from '@forge/kvs';
import { HandoffError, assertId } from './format.js';

const indexKey = (accountId) => `idx:${accountId}`;
const recKey = (id) => `ho:${id}`;
const anKey = (id) => `an:${id}`;

export const newId = () => `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function listHandovers(accountId) {
  const ids = (await kvs.get(indexKey(accountId))) || [];
  const recs = await Promise.all(ids.map((id) => kvs.get(recKey(id))));
  return recs.filter((r) => r && r.ownerId === accountId);
}

export async function getHandover(accountId, id) {
  assertId(id);
  const rec = await kvs.get(recKey(id));
  if (!rec || rec.ownerId !== accountId) throw new HandoffError('NOT_FOUND', 'Handover not found.', 404);
  const analysis = (await kvs.get(anKey(id))) || null;
  return { rec, analysis };
}

export async function saveHandover(accountId, rec, analysis) {
  if (rec.ownerId !== accountId) throw new HandoffError('PERMISSION', 'Not your handover.', 403);
  rec.updatedAt = new Date().toISOString();
  if (rec.audit && rec.audit.length > 200) rec.audit = rec.audit.slice(-200);
  await kvs.set(recKey(rec.id), rec);
  // Forge KVS rejects null/undefined values, so only persist a real analysis object.
  if (analysis) await kvs.set(anKey(rec.id), analysis);
  const ids = (await kvs.get(indexKey(accountId))) || [];
  if (!ids.includes(rec.id)) await kvs.set(indexKey(accountId), [...ids, rec.id]);
  return rec;
}

export async function deleteHandover(accountId, id) {
  await getHandover(accountId, id); // ownership check
  await kvs.delete(recKey(id));
  await kvs.delete(anKey(id));
  const ids = (await kvs.get(indexKey(accountId))) || [];
  await kvs.set(indexKey(accountId), ids.filter((x) => x !== id));
}

export function audit(rec, actor, action, detail, result = 'ok') {
  rec.audit = rec.audit || [];
  rec.audit.push({ at: new Date().toISOString(), actor, action, detail: String(detail).slice(0, 500), result: String(result).slice(0, 300), analysisVersion: rec.analysisVersion || 0 });
}
