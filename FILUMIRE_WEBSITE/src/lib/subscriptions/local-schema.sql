-- Apply only to a dedicated, owner-approved FILUMIRE_WEBSITE development database.
-- Never apply this migration to FILUMIRE_CORE, learner, school, or production databases.

CREATE TABLE IF NOT EXISTS filumire_auth_user (
 id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false,
 guardian_attested_at TEXT, image text, "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS filumire_auth_session (
 id text PRIMARY KEY, "expiresAt" TEXT NOT NULL, token text UNIQUE NOT NULL,
 "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES filumire_auth_user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS filumire_session_user ON filumire_auth_session("userId");
CREATE TABLE IF NOT EXISTS filumire_households (
 id text PRIMARY KEY, parent_id text UNIQUE NOT NULL REFERENCES filumire_auth_user(id),
 eligibility_key text UNIQUE, eligibility_requested_at TEXT, eligibility_approved_at TEXT,
 cancelled_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK ((eligibility_key IS NULL) = (eligibility_approved_at IS NULL))
);
-- Eligibility keys are assigned by an authorised reviewer, never accepted from the browser.
-- Retain trial-use keys even if an account is closed, subject to the approved retention policy.
CREATE TABLE IF NOT EXISTS filumire_trial_uses (
 eligibility_key text PRIMARY KEY, household_id text UNIQUE NOT NULL REFERENCES filumire_households(id),
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, learner_limit integer NOT NULL CHECK (learner_limit > 0),
 version integer NOT NULL, CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS filumire_learners (
 id text PRIMARY KEY, household_id text NOT NULL REFERENCES filumire_households(id),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS filumire_learner_household ON filumire_learners(household_id);
CREATE TABLE IF NOT EXISTS filumire_payments (
 reference text PRIMARY KEY, household_id text NOT NULL REFERENCES filumire_households(id),
 parent_email text NOT NULL, plan TEXT NOT NULL, amount integer NOT NULL CHECK (amount > 0), currency text NOT NULL CHECK (currency = 'GHS'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned','initialization_failed','refunded','partially_refunded')),
 provider_id text UNIQUE, channel text, checkout_url text, verified_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), refunded_amount integer NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
);
CREATE INDEX IF NOT EXISTS filumire_payment_household ON filumire_payments(household_id,created_at);
CREATE TABLE IF NOT EXISTS filumire_grants (
 payment_reference text PRIMARY KEY REFERENCES filumire_payments(reference),
 household_id text NOT NULL REFERENCES filumire_households(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 learner_limit integer NOT NULL CHECK (learner_limit > 0), revoked_at TEXT, CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS filumire_grant_household ON filumire_grants(household_id,ends_at);
CREATE TABLE IF NOT EXISTS filumire_webhooks (
 digest text PRIMARY KEY, event_type text NOT NULL, received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), processed_at TEXT
);
CREATE TABLE IF NOT EXISTS filumire_refund_requests (
 id text PRIMARY KEY, payment_reference text UNIQUE NOT NULL REFERENCES filumire_payments(reference),
 household_id text NOT NULL REFERENCES filumire_households(id), reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
 status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','declined','processing','processed','failed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS filumire_refunds (
 provider_id text PRIMARY KEY, payment_reference text NOT NULL REFERENCES filumire_payments(reference),
 amount integer NOT NULL CHECK (amount > 0), status text NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS filumire_billing_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at TEXT NOT NULL);


CREATE TABLE IF NOT EXISTS filumire_login_tokens (digest TEXT PRIMARY KEY, email TEXT NOT NULL, challenge_digest TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, guardian_attested_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS filumire_token_expiry ON filumire_login_tokens(expires_at);

CREATE TABLE IF NOT EXISTS filumire_progress (learner_id text NOT NULL REFERENCES filumire_learners(id), activity_id text NOT NULL, score integer CHECK (score BETWEEN 0 AND 100), completed boolean NOT NULL DEFAULT false, updated_at TEXT NOT NULL, PRIMARY KEY(learner_id,activity_id));
