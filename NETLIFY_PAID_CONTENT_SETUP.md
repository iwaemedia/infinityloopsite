# NETLIFY PAID CONTENT SETUP

This package protects Chapters 3–11 using Netlify Identity + role-based redirects.

## Required Netlify setup

1. Deploy this complete package through the connected GitHub repository.
2. In Netlify, open **Project configuration > Identity** and select **Enable Identity**.
3. Under **Identity > Registration**, set registration to **Invite only**.
4. For every purchaser who should have full access:
   - Open **Identity > Users**.
   - Invite the purchaser's email address.
   - Open that user's settings and assign the role: `paid`
5. The customer follows the Identity invitation email, creates a password, and then uses **Sign In** in the reader.
6. After login, Chapters 3–11 load normally.
7. Test protection in an InPrivate/Incognito window by directly opening:
   `/protected/CHAPTER_3_clean_stitched_formatted.htm`
   Without a paid Identity session it must not display Chapter 3.

## Security change

The previous client-side `INF-...` license acceptance and embedded master/test license keys have been removed.
Paid access is now decided by Netlify's signed Identity JWT and the `paid` role at the CDN edge.

## Trial behavior

Front matter and Chapters 1–2 remain public/trial content.
Chapters 3–11 are protected.
Back matter remains public in this package because the requested protection scope was Chapters 3–11.

## PayPal + Make.com automation

The reader is now PayPal-only. The Stripe checkout button and Stripe checkout URL have been removed.

Your existing PayPal purchase and Make.com trigger can remain in place, but the final provisioning step must grant Netlify Identity access:

1. PayPal reports a successfully completed payment to Make.com.
2. Make verifies the completed payment and captures the purchaser email.
3. The purchaser must exist as a Netlify Identity user or be invited/created.
4. A secure server-side process assigns that Identity user the role `paid`.
5. The purchaser signs in again or refreshes the Identity session.
6. Netlify then allows `/protected/*` because the signed JWT contains the `paid` role.

An old `INF-...` license key by itself no longer grants protected access.
