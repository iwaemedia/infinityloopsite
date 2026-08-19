import { randomBytes, timingSafeEqual } from 'node:crypto'
import { admin, requestPasswordRecovery, AuthError, MissingIdentityError } from '@netlify/identity'
import type { Config } from '@netlify/functions'

const DEFAULT_ROLE = 'paid'
const USERS_PER_PAGE = 200
const MAX_USER_PAGES = 50

/** Constant-time secret comparison that does not leak length via early return. */
function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // Still burn a comparison so timing does not distinguish "wrong length" from "wrong value".
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

/** Pulls the shared secret out of either an Authorization bearer or the X-Make-Secret header. */
function presentedSecret(req: Request): string {
  const authorization = req.headers.get('authorization') ?? ''
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)
  if (bearer) return bearer[1].trim()
  return (req.headers.get('x-make-secret') ?? '').trim()
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Finds an Identity user by email, paging through the directory. */
async function findUserByEmail(email: string) {
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const users = await admin.listUsers({ page, perPage: USERS_PER_PAGE })
    const match = users.find((user) => user.email?.trim().toLowerCase() === email)
    if (match) return match
    if (users.length < USERS_PER_PAGE) return null
  }
  return null
}

export default async (req: Request) => {
  const expected = process.env.MAKE_WEBHOOK_SECRET
  if (!expected) {
    // Fail closed: without a configured secret the endpoint would be open to anyone.
    return json({ ok: false, error: 'MAKE_WEBHOOK_SECRET is not configured on this site.' }, 503)
  }

  if (!secretMatches(presentedSecret(req), expected)) {
    return json({ ok: false, error: 'Unauthorized.' }, 401)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, error: 'Request body must be JSON.' }, 400)
  }

  const email = String(payload.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return json({ ok: false, error: 'A valid "email" is required.' }, 400)
  }

  const role = String(payload.role ?? DEFAULT_ROLE).trim() || DEFAULT_ROLE
  const orderId = payload.orderId ? String(payload.orderId) : undefined

  try {
    const existing = await findUserByEmail(email)

    if (existing) {
      const appMetadata = (existing.appMetadata ?? {}) as Record<string, unknown>
      const currentRoles = Array.isArray(appMetadata.roles) ? (appMetadata.roles as string[]) : []

      if (currentRoles.includes(role)) {
        return json(
          { ok: true, action: 'already_granted', userId: existing.id, email, roles: currentRoles, orderId },
          200,
        )
      }

      const roles = [...currentRoles, role]
      await admin.updateUser(existing.id, { app_metadata: { ...appMetadata, roles } })

      return json({ ok: true, action: 'granted', userId: existing.id, email, roles, orderId }, 200)
    }

    // No account yet: create one that is already confirmed and already paid, then let the
    // purchaser choose their own password through the standard recovery email.
    const created = await admin.createUser({
      email,
      password: randomBytes(32).toString('base64url'),
      data: {
        app_metadata: { roles: [role] },
        user_metadata: {
          full_name: payload.name ? String(payload.name) : undefined,
          purchase_order_id: orderId,
        },
      },
    })

    let passwordEmailSent = true
    try {
      await requestPasswordRecovery(email)
    } catch {
      // The role is already granted; a failed email should not fail the webhook and cause Make to retry.
      passwordEmailSent = false
    }

    return json(
      { ok: true, action: 'created', userId: created.id, email, roles: [role], passwordEmailSent, orderId },
      201,
    )
  } catch (error) {
    if (error instanceof MissingIdentityError) {
      return json({ ok: false, error: 'Netlify Identity is not enabled on this site.' }, 503)
    }
    if (error instanceof AuthError) {
      return json({ ok: false, error: error.message }, error.status ?? 502)
    }
    return json({ ok: false, error: 'Unexpected error granting access.' }, 500)
  }
}

export const config: Config = {
  path: '/api/make/grant-access',
  method: 'POST',
}
