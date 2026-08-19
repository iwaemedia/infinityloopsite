# Make.com → 160years.com access granting

This connects a Make.com scenario to the reader so that a completed purchase automatically
grants the buyer the `paid` Identity role, which is what unlocks `/protected/*` (Chapters 3–11)
at Netlify's CDN edge.

---

## 1. The webhook

**URL**

```
https://160years.com/api/make/grant-access
```

**Method:** `POST`
**Implemented by:** `netlify/functions/make-grant-access.mts`

This is an *inbound* webhook — Make.com calls it. It is not a Make.com hook URL and not a
Netlify build hook.

---

## 2. The secret (do this before the first run)

The endpoint refuses every request until a shared secret exists, so it can never sit open.

1. Generate a random value locally:
   ```bash
   openssl rand -base64 32
   ```
2. In Netlify: **Project configuration → Environment variables → Add a variable**
   - Key: `MAKE_WEBHOOK_SECRET`
   - Value: the generated string
   - Scope: Functions (all deploy contexts)
3. Redeploy so the function picks it up.
4. Paste the same string into the Make.com request header below.

Until this variable is set the endpoint answers `503`. If the header does not match, it answers `401`.

---

## 3. Make.com module setup

Add an **HTTP → Make a request** module as the last step of your PayPal scenario.

| Field | Value |
|---|---|
| URL | `https://160years.com/api/make/grant-access` |
| Method | `POST` |
| Body type | Raw |
| Content type | `application/json` |
| Parse response | Yes |

**Headers**

| Name | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer YOUR_MAKE_WEBHOOK_SECRET` |

(`X-Make-Secret: YOUR_MAKE_WEBHOOK_SECRET` works too if a bare header is easier to map.)

**Request JSON**

```json
{
  "email": "{{payer_email}}",
  "name": "{{payer_name}}",
  "orderId": "{{paypal_order_id}}",
  "role": "paid"
}
```

Only `email` is required. `role` defaults to `paid` if omitted. `name` and `orderId` are stored on
the user record for your own reconciliation.

Minimum viable body:

```json
{ "email": "buyer@example.com" }
```

---

## 4. Response JSON

**Existing user, role added — `200`**

```json
{
  "ok": true,
  "action": "granted",
  "userId": "a1b2c3d4-0000-0000-0000-000000000000",
  "email": "buyer@example.com",
  "roles": ["paid"],
  "orderId": "5XY12345AB678901C"
}
```

**Buyer had no account — `201`**

The account is created already confirmed and already paid, then a password-setup email is sent so
the buyer chooses their own password.

```json
{
  "ok": true,
  "action": "created",
  "userId": "a1b2c3d4-0000-0000-0000-000000000000",
  "email": "buyer@example.com",
  "roles": ["paid"],
  "passwordEmailSent": true,
  "orderId": "5XY12345AB678901C"
}
```

**Already had access — `200`** (safe to replay; Make retries will not duplicate anything)

```json
{
  "ok": true,
  "action": "already_granted",
  "userId": "a1b2c3d4-0000-0000-0000-000000000000",
  "email": "buyer@example.com",
  "roles": ["paid"],
  "orderId": "5XY12345AB678901C"
}
```

**Errors**

```json
{ "ok": false, "error": "Unauthorized." }
```

| Status | Meaning |
|---|---|
| `400` | Body was not JSON, or `email` missing/malformed |
| `401` | Secret missing or wrong |
| `500` | Unexpected failure |
| `503` | `MAKE_WEBHOOK_SECRET` unset, or Identity not enabled |

Treat any `ok: false` as a failed provisioning step in Make and alert on it.

---

## 5. Testing

```bash
curl -i -X POST https://160years.com/api/make/grant-access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MAKE_WEBHOOK_SECRET" \
  -d '{"email":"you@example.com"}'
```

Then check **Identity → Users** — the address should show the `paid` role. Sign in as that user and
open a protected chapter directly to confirm the edge lets it through:

```
https://160years.com/protected/CHAPTER_3_clean_stitched_formatted.htm
```

A buyer who was already signed in must sign out and back in once. The `paid` role is baked into the
Identity JWT at login, and the CDN reads that token — an older session simply does not carry the role yet.

---

## 6. The Personal Access Token

**A PAT could not be created for you.** Netlify only issues them through an interactive browser
authorization, and there is no API or CLI path to mint one non-interactively. You create it yourself:

1. Go to **https://app.netlify.com/user/applications#personal-access-tokens**
2. **New access token** → describe it (e.g. `make.com`) → **Generate token**
3. Copy it immediately; Netlify shows it exactly once.
4. Store it in Make.com under **Connections / Keychain**, never in a scenario field or a repo file.

### You probably do not need it for this integration

A Netlify PAT carries **full control of your entire team** — every site, deploy, domain, DNS record,
env var, and user. Handing that to a third-party automation platform to accomplish "add a role to one
user" is far more authority than the job requires.

The webhook above is scoped to exactly one action on one site, is guarded by its own rotatable secret,
and grants Make.com nothing else. If the secret leaks, you rotate one environment variable. If a PAT
leaks, someone can delete your sites.

Use the PAT only if you additionally want Make.com to do genuine account-level work — triggering
deploys, reading deploy status, managing DNS. It authenticates as:

```
Authorization: Bearer YOUR_NETLIFY_PAT
```

against `https://api.netlify.com/api/v1/`. For example, listing this site:

```
GET https://api.netlify.com/api/v1/sites/397753cf-5c44-4b0c-9331-20e2095d3806
```

Rotate or revoke it from the same Netlify page at any time.

> Note: Netlify's public API has no supported endpoint for editing an Identity user's roles, which is
> the specific thing you need. That is why this webhook exists — it does the role assignment through
> the Identity admin API from inside your own site, where the credential never leaves Netlify.
