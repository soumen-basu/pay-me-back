# Approach B: Dynamic Tier Overrides & Admin GUI

This document outlines the architecture for introducing gamification, promotional limits, and manual tier modifications by layering dynamic database "Overrides" on top of the static `tiers.json` definitions.

## Goal Description
Transform the tier system from a static configuration into an easily administrable, gamified ecosystem. 
1. Allow admins to inject time-bound or permanent quota bonuses (e.g., +10 expenses) or feature toggles (e.g., enable multi-currency) for specific users without altering their base JSON tier.
2. Build an Admin GUI to visually audit the static tier definitions and manage user-specific overrides.

## Proposed Changes

### 1. Database Layer (Overrides)
We will introduce a new model to house the overrides.

#### [NEW] `app/models/tier_override.py`
A new SQLModel table `TierOverride`:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to `User`)
- `bonus_expenses`: int (default 0)
- `bonus_claims`: int (default 0)
- `force_multi_currency`: bool | None (If True, forces capability ON regardless of base tier. If None, respects base tier.)
- `promo_reference`: str | None (Audit field, e.g., "HOLIDAY_2026")
- `expires_at`: datetime | None (If set, the system ignores this override once it expires)

#### [NEW] Alembic Migration
- Generates the table and relationships.

---

### 2. Service Layer Modification

#### [MODIFY] `app/services/tier_service.py`
Update `get_user_tiers_summary` to merge the DB data with the JSON data:
1. Load Base configuration from `get_tier_config(user.tier)`.
2. Query `db.exec(select(TierOverride).where(user_id == user.id, (expires_at > now) | (expires_at == None)))`.
3. **Quotas Math**: `effective_limit = base_limit + sum(bonus_limits)`
4. **Capabilities Math**: `effective_capability = force_capability IF override_exists ELSE base_capability`
5. Return the newly calculated effective summary. The rest of the app (UI limits, POST route blocks) will automatically respect these new effective limits with **zero additional code changes** needed downstream.

---

### 3. Admin API Layer

#### [NEW] `app/api/v1/endpoints/admin_tiers.py`
Create new admin-restricted endpoints:
- `GET /api/v1/admin/tiers/config`: Returns the raw parsed `tiers.json` for read-only display.
- `GET /api/v1/admin/users/{id}/overrides`: Fetches a user's active table overrides.
- `POST /api/v1/admin/users/{id}/overrides`: Admin grants a bonus package or promo.
- `POST /api/v1/admin/tiers/reload`: (Optional) Forces a hot-reload of the python cache if the JSON file is modified on the server.

---

### 4. Admin Frontend GUI

#### [NEW] `frontend/src/pages/admin/AdminTiersPage.tsx`
- A dashboard specifically for site admins.
- **Tab 1: System Config**: Renders the JSON object into a clear, comparative pricing/features table.
- **Tab 2: Override Manager**: A small widget to lookup a user by email, see their *Effective* limits vs *Base* limits, and submit a form to grant them a new `TierOverride` record.

#### [MODIFY] `frontend/src/App.tsx`
- Register `AdminTiersPage` under the admin routing tree.

## Verification Plan

### Automated Tests
- Create `test_tier_overrides.py` targeting `TierService.get_user_tiers_summary` directly.
- **Test Math**: Verify granting +5 expenses to a typical 50 limit FREE user yields 55 effective expenses.
- **Test Expiration**: Verify that if `expires_at` is set in the past, the override is entirely ignored and base limits instantly restore.

### Expected Behavior
Once applied, granting a user a +5 margin should automatically and immediately unblock their "Add Expense" buttons inside the standard UI without any browser refreshes required, thanks to the React Context state reload.
