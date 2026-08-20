import { admin, requestPasswordRecovery } from "@netlify/identity";
import { randomBytes, timingSafeEqual } from "node:crypto";

const PAID_ROLE = "paid";
const MAX_PAGES = 50;
const USERS_PER_PAGE = 100;

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function findIdentityUserByEmail(email) {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const users = await admin.listUsers({ page, perPage: USERS_PER_PAGE });

    const found = users.find(
      (user) => normalizeEmail(user.email) === email
    );

    if (found) return found;
    if (users.length < USERS_PER_PAGE) return null;
  }

  throw new Error(
    `Identity user search exceeded ${MAX_PAGES * USERS_PER_PAGE} users.`
  );
}

function getRoles(user) {
  if (Array.isArray(user?.roles)) return user.roles;

  const metadataRoles = user?.appMetadata?.roles;
  return Array.isArray(metadataRoles) ? metadataRoles : [];
}

async function grantPaidRole(user) {
  const roles = Array.from(new Set([...getRoles(user), PAID_ROLE]));

  if (getRoles(user).includes(PAID_ROLE)) {
    return { user, roles, changed: false };
  }

  const updated = await admin.updateUser(user.id, {
    app_metadata: {
      ...(user.appMetadata || {}),
      roles,
    },
  });

  return { user: updated, roles, changed: true };
}

async function createPaidIdentityUser(email, name) {
  const temporaryPassword = `${randomBytes(32).toString("base64url")}Aa1!`;

  const userMetadata = {};
  if (name) {
    userMetadata.full_name = String(name).trim();
  }

  const created = await admin.createUser({
    email,
    password: temporaryPassword,
    data: {
      app_metadata: {
        roles: [PAID_ROLE],
      },
      user_metadata: userMetadata,
    },
  });

  await requestPasswordRecovery(email);

  return created;
}

export default async function grantPaidAccess(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST.",
    });
  }

  const expectedSecret = process.env.MAKE_PROVISION_SECRET;

  if (!expectedSecret) {
    console.error("MAKE_PROVISION_SECRET is not configured.");
    return jsonResponse(500, {
      ok: false,
      error: "SERVER_NOT_CONFIGURED",
    });
  }

  const suppliedSecret = getBearerToken(request);

  if (!secureEqual(suppliedSecret, expectedSecret)) {
    return jsonResponse(401, {
      ok: false,
      error: "UNAUTHORIZED",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "INVALID_JSON",
    });
  }

  if (body?.paymentVerified !== true) {
    return jsonResponse(400, {
      ok: false,
      error: "PAYMENT_NOT_VERIFIED",
      message: "paymentVerified must be true.",
    });
  }

  const email = normalizeEmail(body?.email);
  const name = String(body?.name || "").trim();

  if (!isValidEmail(email)) {
    return jsonResponse(400, {
      ok: false,
      error: "INVALID_EMAIL",
    });
  }

  try {
    const existingUser = await findIdentityUserByEmail(email);

    if (existingUser) {
      const result = await grantPaidRole(existingUser);

      return jsonResponse(200, {
        ok: true,
        action: result.changed ? "paid_role_added" : "already_paid",
        email,
        userId: result.user.id,
        roles: result.roles,
        message:
          "Paid access is provisioned. The customer should sign in again or refresh their Identity session.",
      });
    }

    const createdUser = await createPaidIdentityUser(email, name);

    return jsonResponse(201, {
      ok: true,
      action: "identity_user_created",
      email,
      userId: createdUser.id,
      roles: [PAID_ROLE],
      passwordSetupEmailSent: true,
      message:
        "A paid Identity account was created and a password-setup email was requested.",
    });
  } catch (error) {
    console.error("grant-paid-access failed:", error);

    return jsonResponse(500, {
      ok: false,
      error: "PROVISIONING_FAILED",
      message:
        "Netlify could not provision paid access. Check the Function log.",
    });
  }
}
