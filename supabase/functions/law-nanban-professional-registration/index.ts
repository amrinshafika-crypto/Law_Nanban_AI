const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const INTENT_LIFETIME_US = 30n * 60n * 1_000_000n;
const TOKEN_AUDIENCE = 'law-nanban-professional-registration';
const TOKEN_HEADER = { alg: 'HS256', typ: 'JWT' };

type JsonRecord = Record<string, unknown>;
type AuthenticatedUser = { id: string; createdAtUs: bigint };

function json(status: number, body: JsonRecord) {
  return Response.json(body, { status, headers: corsHeaders });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAllowedProjectKey(request: Request) {
  const supplied = request.headers.get('apikey');
  if (!supplied) return false;
  const candidates = [Deno.env.get('SUPABASE_ANON_KEY'), Deno.env.get('SUPABASE_PUBLISHABLE_KEY')]
    .filter((value): value is string => Boolean(value));
  try {
    const parsed: unknown = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    if (isRecord(parsed)) candidates.push(...Object.values(parsed).filter((value): value is string => typeof value === 'string'));
  } catch { /* Optional key map. */ }
  return candidates.includes(supplied);
}

function encodeBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(serviceKey: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

function parseTimestampMicros(value: string): bigint | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const localMillis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const check = new Date(localMillis);
  if (year < 1000 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute
    || check.getUTCSeconds() !== second) return null;

  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const offsetHours = Number(zone.slice(1, 3));
    const offsetRemainder = Number(zone.slice(4, 6));
    if (offsetHours > 23 || offsetRemainder > 59) return null;
    const sign = zone[0] === '+' ? 1 : -1;
    offsetMinutes = sign * (offsetHours * 60 + offsetRemainder);
  }
  const epochSeconds = BigInt(Math.trunc(localMillis / 1_000) - offsetMinutes * 60);
  const fractionalMicros = BigInt((fraction + '000000').slice(0, 6));
  return epochSeconds * 1_000_000n + fractionalMicros;
}

async function issueRegistrationIntent(serviceKey: string, nowUs: bigint) {
  const expUs = nowUs + INTENT_LIFETIME_US;
  const claims = {
    aud: TOKEN_AUDIENCE,
    role: 'professional',
    iat: Number(nowUs / 1_000_000n),
    exp: Number(expUs / 1_000_000n),
    iat_us: nowUs.toString(),
    exp_us: expUs.toString(),
  };
  const signingInput = `${encodeBase64Url(JSON.stringify(TOKEN_HEADER))}.${encodeBase64Url(JSON.stringify(claims))}`;
  const key = await signingKey(serviceKey, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput)));
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

async function verifyRegistrationIntent(token: unknown, serviceKey: string, userCreatedAtUs: bigint, nowUs: bigint) {
  if (typeof token !== 'string' || token.length > 2_048) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const header: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const claims: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    if (!isRecord(header) || header.alg !== 'HS256' || header.typ !== 'JWT'
      || !isRecord(claims) || claims.aud !== TOKEN_AUDIENCE || claims.role !== 'professional'
      || typeof claims.iat !== 'number' || !Number.isSafeInteger(claims.iat)
      || typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp)
      || typeof claims.iat_us !== 'string' || !/^\d{1,20}$/.test(claims.iat_us)
      || typeof claims.exp_us !== 'string' || !/^\d{1,20}$/.test(claims.exp_us)) return false;
    const issuedAtUs = BigInt(claims.iat_us);
    const expiresAtUs = BigInt(claims.exp_us);
    if (issuedAtUs / 1_000_000n !== BigInt(claims.iat)
      || expiresAtUs / 1_000_000n !== BigInt(claims.exp)
      || expiresAtUs - issuedAtUs !== INTENT_LIFETIME_US) return false;
    const key = await signingKey(serviceKey, ['verify']);
    const signatureValid = await crypto.subtle.verify(
      'HMAC', key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return signatureValid
      && issuedAtUs <= nowUs
      && expiresAtUs > nowUs
      && userCreatedAtUs > issuedAtUs;
  } catch {
    return false;
  }
}

async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!token || !projectUrl || !publicKey) return null;
  try {
    const response = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const user: unknown = await response.json();
    if (!isRecord(user) || typeof user.id !== 'string' || typeof user.created_at !== 'string') return null;
    const createdAtUs = parseTimestampMicros(user.created_at);
    return createdAtUs !== null ? { id: user.id, createdAtUs } : null;
  } catch {
    return null;
  }
}

function serviceHeaders(serviceKey: string) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
}

async function serviceRequest(path: string, serviceKey: string, init: RequestInit = {}) {
  const projectUrl = Deno.env.get('SUPABASE_URL');
  if (!projectUrl) throw new Error('SUPABASE_URL is not configured.');
  return fetch(`${projectUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(serviceKey), ...init.headers },
    signal: init.signal || AbortSignal.timeout(8_000),
  });
}

async function getDatabaseTimestamp(serviceKey: string) {
  const response = await serviceRequest('rpc/law_nanban_registration_timestamp', serviceKey, { method: 'POST', body: '{}' });
  if (!response.ok) throw new Error('Registration timestamp is unavailable.');
  const timestamp: unknown = await response.json();
  if (typeof timestamp !== 'string' || parseTimestampMicros(timestamp) === null) {
    throw new Error('Registration timestamp is invalid.');
  }
  return parseTimestampMicros(timestamp)!;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isAllowedProjectKey(request)) return json(401, { error: { code: 'PROJECT_KEY_INVALID', message: 'This request is not authorized for the Law Nanban project.' } });

  let body: unknown;
  try { body = await request.json(); } catch {
    return json(400, { error: { code: 'INVALID_REQUEST', message: 'A valid registration request is required.' } });
  }
  if (!isRecord(body)) return json(400, { error: { code: 'INVALID_REQUEST', message: 'A valid registration request is required.' } });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    console.error('Professional registration configuration is incomplete.');
    return json(503, { error: { code: 'REGISTRATION_NOT_CONFIGURED', message: 'Professional registration is not configured. Contact the administrator.' } });
  }

  if (body.action === 'prepare') {
    try {
      const databaseNow = await getDatabaseTimestamp(serviceKey);
      return json(200, { registrationIntent: await issueRegistrationIntent(serviceKey, databaseNow) });
    } catch (error) {
      console.error('Professional registration intent could not be created.', { errorName: error instanceof Error ? error.name : 'UnknownError' });
      return json(503, { error: { code: 'REGISTRATION_UNAVAILABLE', message: 'Professional registration could not be started. Please try again.' } });
    }
  }
  if (body.action !== 'finalize') return json(400, { error: { code: 'INVALID_ACTION', message: 'Unsupported registration action.' } });

  const auth = await getAuthenticatedUser(request);
  if (!auth) return json(401, { error: { code: 'AUTH_REQUIRED', message: 'Sign in before completing Professional registration.' } });

  try {
    const profileResponse = await serviceRequest(`profiles?select=id,role&id=eq.${encodeURIComponent(auth.id)}`, serviceKey);
    if (!profileResponse.ok) return json(503, { error: { code: 'PROFILE_LOOKUP_FAILED', message: 'Account access could not be verified. Please try again.' } });
    const profiles: unknown = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!isRecord(profile) || profile.id !== auth.id || !['citizen', 'professional', 'admin'].includes(String(profile.role))) {
      return json(403, { error: { code: 'PROFILE_REQUIRED', message: 'A valid account profile is required.' } });
    }
    if (profile.role === 'professional' || profile.role === 'admin') return json(200, { role: profile.role });
    const databaseNow = await getDatabaseTimestamp(serviceKey);
    if (!(await verifyRegistrationIntent(body.registrationIntent, serviceKey, auth.createdAtUs, databaseNow))) {
      return json(200, { role: 'citizen' });
    }

    const updateResponse = await serviceRequest(`profiles?id=eq.${encodeURIComponent(auth.id)}&role=eq.citizen`, serviceKey, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ role: 'professional' }),
    });
    if (!updateResponse.ok) {
      console.error('Professional role assignment failed.', { status: updateResponse.status });
      return json(503, { error: { code: 'ROLE_UPDATE_FAILED', message: 'Professional registration could not be completed. Please try again.' } });
    }
    const updated: unknown = await updateResponse.json();
    if (!Array.isArray(updated) || !updated.some((row) => isRecord(row) && row.id === auth.id && row.role === 'professional')) {
      const latestResponse = await serviceRequest(`profiles?select=id,role&id=eq.${encodeURIComponent(auth.id)}`, serviceKey);
      if (latestResponse.ok) {
        const latestRows: unknown = await latestResponse.json();
        const latestProfile = Array.isArray(latestRows) ? latestRows[0] : null;
        if (isRecord(latestProfile) && latestProfile.id === auth.id
          && (latestProfile.role === 'professional' || latestProfile.role === 'admin')) {
          return json(200, { role: latestProfile.role });
        }
      }
      return json(409, { error: { code: 'ROLE_CHANGED', message: 'The account role changed during registration. Refresh your session and try again.' } });
    }
    return json(200, { role: 'professional' });
  } catch (error) {
    console.error('Professional registration request failed.', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return json(503, { error: { code: 'REGISTRATION_UNAVAILABLE', message: 'Professional registration could not be completed right now. Please try again.' } });
  }
});
