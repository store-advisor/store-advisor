# Store Advisor — Backend Architecture: Decisions

Running log of non-obvious architecture decisions made while implementing
backend API services and modules. New entries append to the bottom.

---

## 1. Auth stub: presence-check only, no token verification

**Decision:** `AuthStubGuard` checks for `Authorization: Bearer <token>`
header presence only, throwing `UnauthorizedException` if missing or malformed,
without signature verification, claims inspection, or database user lookup.

**Why:** Real auth (JWT/OAuth verification and tenant resolution from claims)
is a dedicated follow-up ticket. A lightweight stub guard establishes the
route protection contract and integration test harness immediately without
blocking early API endpoints on auth infrastructure.
