import { admin } from "@netlify/identity";

const PAID_ROLE = "paid";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function getRoles(user) {
  if (Array.isArray(user?.roles)) return user.roles;
  if (Array.isArray(user?.appMetadata?.roles)) return user.appMetadata.roles;
  if (Array.isArray(user?.app_metadata?.roles)) return user.app_metadata.roles;
  return [];
}

async function findUserByEmail(email) {
  const users = await admin.listUsers();
  return users.find((u) => normalizeEmail(u.email) === email) || null;
}

export default async function grantPaidAccess(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "METHOD_NOT_ALLOWED", message: "Use POST." });
  }

  const secret = process.env.MAKE_PROVISION_SECRET;
  if (!secret) return jsonResponse(500, { ok: false, error: "SERVER_NOT_CONFIGURED" });
  if (getBearerToken(request) !== secret) return jsonResponse(401, { ok: false, error: "UNAUTHORIZED" });

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "INVALID_JSON" });
  }

  if (body?.paymentVerified !== true) {
    return jsonResponse(400, { ok: false, error: "PAYMENT_NOT_VERIFIED" });
  }

  const email = normalizeEmail(body?.email);
  if (!email) return jsonResponse(400, { ok: false, error: "INVALID_EMAIL" });

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return jsonResponse(404, {
        ok: false,
        error: "IDENTITY_USER_NOT_FOUND",
        message: "Create or invite this email in Netlify Identity first, then run the payment provisioning again."
      });
    }

    const currentRoles = getRoles(user);
    const roles = Array.from(new Set([...currentRoles, PAID_ROLE]));

    await admin.updateUser(
      { id: user.id },
      { app_metadata: { roles } }
    );

    const verified = await findUserByEmail(email);
    const verifiedRoles = getRoles(verified);

    if (!verifiedRoles.includes(PAID_ROLE)) {
      return jsonResponse(500, {
        ok: false,
        error: "ROLE_NOT_PERSISTED",
        roles: verifiedRoles
      });
    }

    return jsonResponse(200, {
      ok: true,
      action: currentRoles.includes(PAID_ROLE) ? "already_paid" : "paid_role_added",
      email,
      roles: verifiedRoles,
      verifiedPaidRole: true,
      message: "Paid role verified. Sign out and back in to refresh access."
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      ok: false,
      error: "PROVISIONING_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
