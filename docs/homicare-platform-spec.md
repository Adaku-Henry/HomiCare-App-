# HomiCare Platform Specification

Status: implementation blueprint for roadmap sections 16-33  
Repository baseline: Vite, React 18, TypeScript, Tailwind CSS, Supabase  
Decision: extend the existing application and database incrementally; do not migrate to Next.js as part of feature delivery.

## 1. Product Definition

HomiCare connects households with service professionals and grows into the professional, learning, business, property, and payment infrastructure around those services. The core loop is:

`Need or goal -> verified evidence -> relevant service/opportunity -> agreed work -> completion -> payment/review -> new evidence`

The platform serves customers, independent providers, service businesses, property managers, learners, mentors, training organizations, marketplace participants, and HomiCare operations staff.

### Product invariants

- A request is not a confirmed booking; a quote is not a payment; a client-side success state is not proof funds moved.
- Skills, credentials, customer experience, platform activity, achievements, and loyalty rewards are distinct records with distinct meanings.
- AI may explain or draft from permitted evidence, but cannot invent facts or independently publish, reject applicants, verify credentials, adjudicate safety cases, or move money.
- Exact addresses, contact details, private conversations, identity documents, and financial records are private by default. Reveal only to authorized booking participants or staff with a recorded reason.
- Every important profile claim displays its evidence origin and status. No unexplained trust or competence score.
- Mobile-money, SMS, USSD, push, native-device, external-calendar, and AI integrations are unavailable until configured, authorized, and tested end to end.
- Sample figures and seeded records must be labeled as demo data, never represented as live production analytics.

## 2. Roles And Permissions

Roles are assignments; permissions are explicit capabilities. A user may hold more than one role. The server/database is authoritative for every permission check.

| Role | Main scope | Example permissions |
| --- | --- | --- |
| Customer / household member | Own household, requests, bookings, reviews | `booking.create`, `booking.read_own`, `booking.cancel_own`, `payment.read_own` |
| Provider / freelancer | Own profile, services, availability, assigned bookings | `provider.profile.edit_own`, `booking.read_assigned`, `quote.create_assigned`, `job.update_assigned` |
| Business owner | One or more authorized organizations | `business.manage_own`, `team.manage_own`, `opportunity.publish_own` |
| Business employee | Organization resources granted by owner | Fine-grained, organization-scoped permissions; no default finance access |
| Property manager | Explicitly assigned properties and units | `property.read_assigned`, `maintenance.create_assigned`, `booking.approve_assigned` |
| Learner / mentor / instructor | Own learning and mentorship records | `learning.manage_own`, `mentor.session.manage_assigned` |
| Marketplace seller | Own catalog, orders, and payouts | `marketplace.catalog.manage_own`, `order.read_own` |
| Support agent | Assigned support cases, minimum necessary data | `case.read_assigned`, `case.note`, no credential or payout mutation |
| Verification officer | Assigned verification submissions | `verification.review`, no payment administration |
| Moderator / safety officer | Assigned reports and safety cases | `moderation.review`, `safety.case.manage_assigned` |
| Finance officer | Financial operations | `payment.reconcile`, `refund.approve`, `payout.review` |
| Analytics administrator | Aggregated platform reporting | `analytics.read_aggregated`, export only with audited permission |
| Super administrator | Platform configuration and role grants | High-risk actions require step-up authentication and audit reason |

Suggested role/permission tables: `organizations`, `organization_memberships`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`. Avoid a client-controlled `is_admin` flag. Require MFA/step-up checks for role grants, refunds, payout changes, data exports, and account restrictions.

## 3. Application Areas And Navigation

### Customer and household

Home, Find services, Provider profile, Request/booking detail, Messages, My home/properties, Maintenance, Wallet/transactions, Reviews, Notifications, Safety Center, Privacy/settings.

### Provider and professional

Provider dashboard, Service catalog, Availability, Requests and bookings, Quotes, Job history, Earnings, Skills and evidence, Trust profile, Achievement Passport, Portfolio, Learning, Mentorship, Opportunities/applications, CV and documents, Analytics, Messages, Notifications, Settings.

### Business and property management

Organization dashboard, Team and permissions, Services, Leads/requests, Applicants/opportunities, Dispatch and bookings, Properties/units, Quotes/contracts/invoices, Finance, Marketing, Business Copilot, Analytics, Cases, Audit activity.

### Learning and community

Academy, courses/paths, lessons, assessments, certificates, mentors/sessions, communities, events, competitions, attendance and participation records.

### Administration

Command Center, people/providers/businesses, service catalog, bookings/opportunities, marketplace, academy, communities/content, verification, cases/moderation/safety, finance, subscriptions/advertising, AI operations, analytics, settings/feature flags, notifications, audit log.

The current app has working prototype pages for service discovery, provider profiles, booking form, dashboards, messages, wallet/admin views, and roadmap workspaces. The additional workspaces are previews until their corresponding schema, authorization, and service integrations exist.

## 4. Canonical Workflows

### 4.1 Service request to completed job

`Draft -> Submitted -> Provider viewed -> Quote pending -> Quote sent -> Customer accepted -> Booking confirmed -> Provider en route -> Service started -> Service completed -> Customer confirmed -> Payment settled -> Review submitted`

Alternate terminal/exception states: `Declined`, `Cancelled`, `Expired`, `Disputed`, `Refund pending`, `Refunded`, `No-show`. Store state transitions as append-only booking events with actor, timestamp, and optional reason. Do not treat all of the above as one mutable status field once event history is implemented.

Requirements:

- The service request captures minimum contact and service information; exact location is private and revealed only when required for the request/confirmed service.
- A provider response or quote never silently confirms a price. The customer explicitly accepts the quote.
- A failed insert, upload, or payment must remain visible and retryable; idempotency prevents duplicate requests/charges.
- Success includes a stable booking reference and links to the specific booking, its conversation, and next actions.
- Moving requests support pickup/destination, access/floors, item/room estimate, vehicle requirement, and optional distance calculation. Distance is labeled estimated until route calculation is configured.

### 4.2 Achievement and trust evidence

`Evidence event -> eligibility evaluation -> user review/claim where needed -> verification review -> achievement issued -> Passport visibility choice`

Every award records criteria version, category, points, evidence references, source, verification status, issuer, issue/expiry date when applicable, and appeal/revocation history. Learning, service, projects, mentorship, community, events, competitions, and customer-care milestones are separate categories. Achievement points cannot be converted into currency or treated as skill competence. Loyalty has a separate ledger and rules.

### 4.3 CV and application

`Select opportunity -> extract requirements -> compare only approved profile evidence -> show evidence and gaps -> user selects sections -> edit preview -> export/share -> submit application -> track outcome`

AI must never create employers, clients, credentials, dates, metrics, projects, reviews, or achievements not present in user-approved evidence. Public/private sharing is an explicit per-document choice with revocation and expiry for private links.

### 4.4 Payments

`Quote accepted -> payment intent created server-side -> provider authorization/confirmation -> service completion -> settlement/payout -> reconciliation`

Use integer minor units (or integer local currency units where the payment rail requires), ISO currency code, immutable ledger entries, provider reference, idempotency key, webhook signature validation, reconciliation status, and audit records. Keep platform fee, processor fee, tax, gross, refund, and net payout distinct. Cash is recorded as cash and is not represented as HomiCare-processed funds. Never store card secrets or trust a browser callback as payment proof.

## 5. Domain Data Model

All user-owned records use `auth.users.id` or an internal `profiles.id` with a non-null owner. Prefer `created_at`, `updated_at`, and soft-delete/audit events where legally appropriate. Use foreign keys, uniqueness constraints, check constraints, indexes for owner/status/time, and migrations for all schema changes.

### Existing core tables

`profiles`, `providers`, `service_categories`, `services`, `provider_services`, `bookings`, `reviews`, `messages`, `wallet_transactions`, `portfolio_projects`, `notifications`, `household_properties`, `maintenance_reminders`.

The initial migration currently leaves sensitive records publicly readable and grants broad authenticated writes. Treat those policies as a launch blocker. Do not add more sensitive columns to those publicly readable tables before access policies are corrected.

### New domain groups

- Identity and organizations: `profiles`, `organizations`, `organization_memberships`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `sessions` (only if supported by the auth design).
- Booking operations: `booking_events`, `quotes`, `quote_items`, `booking_private_details`, `booking_attachments`, `service_visits`, `completion_evidence`, `disputes`.
- Trust and evidence: `skills`, `user_skills`, `skill_assessments`, `credentials`, `credential_issuers`, `verification_requests`, `verification_evidence`, `verification_reviews`, `employment_records`, `project_confirmations`.
- Achievements: `achievement_definitions`, `achievement_criteria_versions`, `user_achievements`, `achievement_evidence`, `achievement_points_ledger`, `loyalty_ledger` (separate table and balance rules).
- CV/opportunities: `documents`, `document_versions`, `document_share_links`, `opportunities`, `opportunity_requirements`, `applications`, `application_events`, `goals`, `availability`, `service_areas`, `recommendation_events`, `recommendation_reasons`.
- Learning/community: `courses`, `learning_paths`, `course_modules`, `lessons`, `assessments`, `assessment_attempts`, `course_enrollments`, `certificates`, `mentorship_programs`, `mentor_sessions`, `communities`, `community_memberships`, `community_resources`, `events`, `event_registrations`, `competitions`.
- Communication and notifications: `conversations`, `conversation_members`, `messages`, `message_attachments`, `blocks`, `reports`, `notification_preferences`, `notification_events`, `notification_deliveries`.
- Finance: `wallet_accounts`, `ledger_entries`, `payment_intents`, `payment_events`, `refunds`, `payouts`, `invoices`, `invoice_items`, `subscriptions`, `subscription_events`, `fee_rules`.
- Safety/admin: `cases`, `case_assignments`, `case_evidence`, `case_actions`, `case_appeals`, `audit_logs`, `security_events`, `ai_events`, `ai_reviews`, `system_settings`, `feature_flags`.
- Analytics: event ingestion plus privacy-preserving rollups such as `analytics_daily`; avoid retaining more identifiable event data than necessary.

Do not duplicate provider/customer PII into analytics events. `booking_private_details` and storage objects must have stricter access than a public provider listing. Store credential files in private buckets; public profiles expose verification facts, not source documents.

## 6. Supabase Authorization And Privacy

### Access policy baseline

- Anonymous users: read only published service taxonomy, provider business/profile fields explicitly marked public, and public portfolio entries. No bookings, customer identities, private messages, wallet data, notifications, exact addresses, or verification evidence.
- Customers: read/write their own profile and household data; read bookings where `customer_id = auth.uid()`; create requests only as self; update only allowed customer-controlled fields and transitions.
- Providers: read bookings assigned to their provider identity; update only provider-controlled response fields and permitted state transitions. A provider must not change customer identity, payment state, or customer confirmation.
- Organizations: access only through active membership and the requested permission for that organization.
- Support/verification/finance/admin: narrowly scoped permissions, assigned cases, reason capture, MFA step-up for high risk, and immutable audit entries.
- Service role: Edge Functions/server only; never bundled in Vite or exposed to the browser.

Use RLS on every table. Test policies as anonymous, customer A, customer B, provider A, provider B, organization member, and unauthorized staff. Use database functions for state transitions and ledger writes where direct table mutation could bypass invariants. Storage access must follow the same ownership and booking membership rules, with short-lived signed URLs for private attachments.

### Current launch blocker

The initial schema gives public `SELECT` on bookings, messages, wallet transactions, notifications, household properties, and maintenance reminders; some authenticated policies use `USING (true)` / `WITH CHECK (true)`. The browser currently has no sign-in/onboarding flow. Before real customer data is used: design account identity and guest-request policy, backfill ownership safely, replace those policies in a forward migration, then add sign-in and exercise positive and negative RLS tests. Do not simply tighten RLS without updating the app, because current unauthenticated booking writes will fail.

## 7. API And Server Operations

Simple public catalog reads may use the Supabase client under restrictive RLS. Private operations and privileged transitions use Supabase Edge Functions or equivalent server endpoints. Proposed logical operations:

| Operation | Authorization | Purpose |
| --- | --- | --- |
| `POST /service-requests` | Customer session or approved guest flow, rate limited | Create request and private details atomically; return booking reference |
| `GET /bookings/:id` | Customer/provider participant or authorized staff | Read permitted booking projection and events |
| `POST /bookings/:id/quotes` | Assigned provider | Create versioned quote and items |
| `POST /bookings/:id/transitions` | Participant, role, valid transition | Validate lifecycle transition and append event |
| `POST /bookings/:id/attachments` | Booking participant | Upload metadata and private object with size/type checks |
| `POST /payments/intents` | Customer, accepted quote | Create provider-specific payment intent with idempotency key |
| `POST /payments/webhooks/:provider` | Signed provider webhook | Verify and record authoritative payment event |
| `POST /payouts/:id/review` | Finance role + MFA | Approve/reject payout and audit reason |
| `POST /verification-requests` | Authenticated owner | Submit credential/skill evidence privately |
| `POST /verification-requests/:id/review` | Assigned verification officer | Record decision, evidence basis, expiry, and audit |
| `POST /ai/assist` | User/session + purpose-specific consent | Return grounded draft/recommendation with evidence references and uncertainty |
| `POST /reports` | Authenticated user or rate-limited public intake | Report object and create case without exposing reporter to target |
| `GET /analytics/*` | Owner/org role/admin permission | Return scoped metrics with date range, definitions, and aggregation threshold |

All mutations validate server-side, enforce idempotency where retries can duplicate effects, return stable machine-readable error codes, and write audit events for sensitive actions. AI requests must use only data authorized for that user/organization and log model/version, purpose, data references, output disposition, and human override without storing unnecessary prompt PII.

## 8. AI Components

Build one server-mediated AI layer with separately permissioned use cases, not independent unrestricted agents:

- Personal Career & Service Copilot: goals, learning suggestions, opportunity explanations, interview practice, document coaching, portfolio suggestions.
- Business Copilot: opportunity drafts, applicant evidence summaries, customer reply drafts, quote structure, permitted analytics summaries.
- Opportunity matching: deterministic eligibility filters first; explain matched and missing criteria from authorized profile evidence.
- Communication assistance: draft, shorten, translate, summarize, extract actions. Original message remains accessible; human confirms send.
- Trust/achievement assistant: identify potential eligibility and evidence gaps only; no automatic credential verification.
- Safety moderation: classify and queue; high-impact restrictions get human review, reason, appeal path, and audit.

Every AI response is labeled as a suggestion, includes relevant evidence references and limits, and supports user review/edit. Do not send payment, identity, private address, message, or organization data to an AI provider without explicit purpose, access controls, retention review, and required consent.

## 9. Payments, Plans, And Monetization

Initial payment adapter candidates: MTN Mobile Money and Airtel Money for Uganda, plus cash recorded distinctly. Add bank/card rails only after provider agreements, reconciliation, refunds, and regional compliance are established. Keep provider adapters behind a server-side interface; do not hard-code credentials or promise escrow until legally and operationally supported.

Plan catalog is data-driven: Free, Premium Individual, Professional, Business, Recruiter, Property Manager, Academy, Enterprise. Limits and feature flags are admin-configurable and shown before a user hits a limit. Revenue sources include transaction commission, subscriptions, paid learning/mentorship/events, promoted listings, and qualified leads. Ads are labeled; ranking and applicant/provider relevance must not be secretly purchased. Fee rules are versioned by country, category, and effective date.

## 10. Communication And Notifications

Conversation is attached to the relevant booking, quote, application, mentorship session, or organization context. Access is membership-based; block/report controls and dispute evidence retention have documented legal policy. Attachments use private storage, file scanning, MIME/size limits, and signed access.

Notification pipeline: domain event -> preference and urgency rules -> deduplicate -> quiet-hours evaluation -> channel adapter -> delivery result/retry. Security, imminent service arrival, and urgent safety alerts may override quiet hours according to user-visible rules. Push/SMS/email/WhatsApp delivery must be separately configured and verified. Never claim delivery from queue acceptance alone.

## 11. Low-Connectivity And Africa-First Support

- Responsive web is the first supported client. Add installable PWA and service worker only with cache rules that exclude private data by default.
- Lite mode reduces image sizes, autoplay, map tiles, and nonessential payloads; users control media quality.
- Offline queue only supports retry-safe actions. Each mutation has a client idempotency key and visible `queued / syncing / sent / needs attention` state. Conflict resolution must not overwrite provider/customer status changes silently.
- SMS/USSD are adapters to the same server-side request/booking workflows with authentication, rate limits, consent, short message content, and no sensitive document payloads.
- Store currency as amount plus ISO currency; format per locale. Store timestamps in UTC and render in configured local timezone. UI translations include reviewed safety language; machine translation is never authoritative for hazardous instructions.
- Local discovery uses configured service areas (district/region/country) and approximate public location. Exact job-site coordinates remain private and are shared only at the booking stage.

## 12. Analytics And Admin Operations

Personal/business metrics must show time period, source, and definition (e.g. request vs confirmed booking vs completed job). Separate views, conversions, completed work, training, credentials, revenue, and net earnings. Hide small geographic cohorts and never expose identity of profile viewers by default.

Admin command center prioritizes queues and cases over vanity totals: verification backlog, safety reports, payment reconciliation, moderation, security incidents, and AI review. Every admin action records actor, permission, target, previous/new value, reason, timestamp, request/correlation ID, and appeal outcome. Audit logs are append-only to ordinary admins. Analytics exports are permissioned, logged, scoped, and privacy reviewed.

## 13. Current Repository Boundary

- Keep the Vite/React app and `@/` alias. The current `.bolt/prompt` captures product guardrails; this document is the implementation reference.
- Current Supabase migration covers core service records only. The broad public policies and missing authentication/ownership are not production safe.
- Current frontend's booking form uses the existing booking insert shape. Extra contact/moving details and file upload need a private schema/storage design before they can be considered persisted securely. The current UI intentionally says attachments remain local.
- Current achievement/CV/copilot/workspace screens are not backed by production data, AI, sharing, or generated credential logic.
- Do not add static demo totals to dashboards as though they are live. Existing demo seed content should be labeled or replaced with empty/loading states before production.

## 14. Delivery Phases And Exit Criteria

### Phase 0: Security and data foundation

Deliver account/onboarding decision, ownership backfill, RLS migration, private booking details and attachment storage, role/organization model, audit events, typed DB schema, and CI gates. Exit only after unauthorized reads/writes fail in RLS tests and an authenticated customer can create and retrieve only their own request.

### Phase 1: Reliable service transaction

Deliver service request details, quote revisions/acceptance, booking event history, booking conversation, provider/customer dashboards, cancellations/disputes, and notification events. Exit after lifecycle tests cover valid/invalid transitions, retries, and customer/provider access boundaries.

### Phase 2: Trust and professional identity

Deliver evidence records, verification review and expiry, portfolio confirmation, achievement definitions/ledger, separate loyalty ledger, share controls, and audit/appeal workflows. Exit after every public badge resolves to visible evidence provenance and private source documents stay private.

### Phase 3: Learning, opportunities, and documents

Deliver learning/assessment/credential records, opportunity requirements/applications, explainable matching, user-controlled CV versions, and exports. Exit after generated documents only include approved evidence and application statuses have an auditable history.

### Phase 4: Finance and organizations

Deliver immutable ledger, payment adapter/webhooks/reconciliation, refunds/payouts, business memberships/RBAC, property operations, invoices, subscriptions, and admin finance queues. Exit after sandbox payment tests, duplicate webhook tests, reconciliation, and role isolation pass.

### Phase 5: Communication, AI, and access channels

Deliver private conversation engine, notification preferences/delivery adapters, scoped AI with human review, PWA/offline queue, then SMS/USSD/mobile integrations. Each channel requires end-to-end retry, security, consent, and failure tests before it is advertised as available.

### Phase 6: Analytics and platform operations

Deliver privacy-preserving rollups, admin case management, moderation appeals, forecasting with uncertainty, audit exports, feature/configuration controls, and operational monitoring. Exit after data lineage and least-privilege review.

## 15. Release Checklist

- `typecheck`, lint, production build, and automated tests pass.
- RLS tests cover anonymous, unrelated users, both transaction participants, organization roles, and staff roles.
- Booking, quote, payment, refund, payout, verification, and moderation transitions have server-side tests and idempotency/retry coverage.
- No secret keys in the client; no public read of private or financial tables; no exact home addresses in public profile/analytics.
- Mobile and desktop layouts have accessible labels, keyboard paths, focus states, validation, empty/loading/error/retry states, and no clipped content.
- Demo data is visibly labeled. Unsupported providers/channels/features are marked unavailable rather than simulated as completed.
- Privacy notice, retention schedule, consent, data export/deletion, incident response, and payment-provider/regulatory review are approved before launch.