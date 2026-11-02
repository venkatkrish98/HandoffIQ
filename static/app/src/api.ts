export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface Envelope<T> { ok: boolean; data?: T; error?: { code: string; message: string } }

/** True only in the `--mode mock` preview build used for visual QA. Never true in the Forge bundle. */
export const PREVIEW = import.meta.env.MODE === 'mock';

// Backend asUser() calls need the user's OAuth token. The bridge's first requestJira/requestConfluence
// triggers Atlassian's consent flow, so we run it once up front; resolver calls wait for it.
let access: Promise<void> | null = null;
function ensureAccess(): Promise<void> {
  if (!access) {
    access = (async () => {
      const { requestJira, requestConfluence } = await import('@forge/bridge');
      const note = (k: string, v: unknown) => { (window as unknown as { __access?: Record<string, unknown> }).__access = { ...((window as unknown as { __access?: Record<string, unknown> }).__access || {}), [k]: v }; };
      await requestJira('/rest/api/3/myself').then((r) => note('jira', r.status), (e) => note('jira', String(e?.message || e)));
      await requestConfluence('/wiki/api/v2/spaces?limit=1').then((r) => note('confluence', r.status), (e) => note('confluence', String(e?.message || e)));
    })().catch(() => undefined);
  }
  return access;
}

/** Call a Forge resolver. All resolvers return { ok, data } or { ok:false, error }. */
export async function call<T>(name: string, payload?: Record<string, unknown>): Promise<T> {
  let res: Envelope<T>;
  if (PREVIEW) {
    const { mockInvoke } = await import('./mock');
    res = (await mockInvoke(name, payload || {})) as Envelope<T>;
  } else {
    try {
      await ensureAccess();
      const { invoke } = await import('@forge/bridge');
      res = (await invoke(name, payload)) as Envelope<T>;
    } catch (e) {
      // Platform-level failures (function crash, timeout, missing install/scope) never reach our error envelope.
      const m = e instanceof Error ? e.message : String(e);
      throw new ApiError('PLATFORM', `The app backend could not be reached (${m.slice(0, 160)}).`);
    }
  }
  if (!res || !res.ok) throw new ApiError(res?.error?.code || 'INTERNAL', res?.error?.message || 'Unexpected response');
  return res.data as T;
}
