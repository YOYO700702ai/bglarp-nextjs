import { createHash, timingSafeEqual } from 'node:crypto';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase/server';
import {
  SCRIPT_ADMIN_ROLES,
  SCRIPT_ADMIN_USER_TABLE,
} from './constants';
import {
  databaseError,
  forbidden,
  unauthenticated,
  unavailable,
} from './errors';

function constantTimeEqual(left, right) {
  const leftBuffer = createHash('sha256').update(left || '', 'utf8').digest();
  const rightBuffer = createHash('sha256').update(right || '', 'utf8').digest();
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function requireScriptAdmin(allowedRoles = SCRIPT_ADMIN_ROLES) {
  const sessionClient = await createSupabaseServerClient();
  const { data, error: userError } = await sessionClient.auth.getUser();

  if (userError || !data?.user) throw unauthenticated();

  const adminClient = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await adminClient
    .from(SCRIPT_ADMIN_USER_TABLE)
    .select('user_id,role,is_active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (membershipError) {
    throw databaseError('load script admin membership', membershipError);
  }

  if (!membership?.is_active || !allowedRoles.includes(membership.role)) {
    throw forbidden();
  }

  return {
    adminClient,
    sessionClient,
    actor: {
      id: data.user.id,
      type: 'human',
      role: membership.role,
    },
  };
}

export function requireScriptAi(request) {
  const expectedToken = process.env.SCRIPT_ADMIN_AI_TOKEN;
  if (!expectedToken) throw unavailable('人工智慧上架通道尚未完成設定。');

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !constantTimeEqual(match[1], expectedToken)) {
    throw unauthenticated();
  }

  return {
    adminClient: createSupabaseAdminClient(),
    actor: {
      id: null,
      type: 'ai',
      role: 'ai',
    },
  };
}
