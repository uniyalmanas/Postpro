# Implementation Roadmap

**Based on: writing-block.md master engineering prompt**
**Codebase: postmill-app v1.2.0**
**Roadmap Date:** October 21, 2026

## Overview

This roadmap translates the 22 product modules from `writing-block.md` into a phased implementation plan for postmill-app. It distinguishes between what's already implemented (from the audit) and what remains.

**Core philosophy:** Build a working, secure, commercially testable MVP — not maximum feature count, unnecessary architecture, or impressive-looking mockups.

---

## PHASE 1 — AUDIT (✅ COMPLETE)

**Status:** Done — PRODUCT_AUDIT.md generated.

**Activities:**
- ✅ Inspected entire repository structure
- ✅ Documented architecture and key findings (ARCHITECTURE.md)
- ✅ Verified current behavior against writing-block modules
- ✅ Established working baseline (v1.2.0 codebase)
- ✅ Created documentation foundation

**Deliverables:**
- `docs/PRODUCT_AUDIT.md` — Module-by-module audit status
- `docs/ARCHITECTURE.md` — System architecture reference
- Audit findings summary (see audit statistics: 55% fully implemented, 27% partially, 9% mixed, 5% missing)

---

## PHASE 2 — MVP HARDENING

**Priority:** Fix broken existing functionality, critical security issues, and primary content-management workflow.

### 2.1 Critical Issues to Address

| Issue | Status | Action |
|-------|--------|--------|
| Plan limit enforcement | ⚠️ Partial | Implement comprehensive server-side enforcement across all resources (channels, posts, AI usage, team members, storage, etc.) |
| Authentication edge cases | ⚠️ Needs audit | Review OAuth flow, session management, super-admin RBAC bypasses |
| File upload validation | ⚠️ Needs review | Verify MIME type, size, and content-type checks across all upload endpoints |
| Empty states consistency | 📐 UI | Standardize empty states across all resource types (posts, campaigns, brands, integrations) |

### 2.2 Security Hardening

- [ ] Audit all controller pipes for `forbidNonWhitelisted` correctness
- [ ] Verify tenant isolation on every query (no cross-org data leaks)
- [ ] Audit Sentry integration for secret/PII leakage
- [ ] Review webhook signature validation for all providers
- [ ] Test CSRF on all cookie-authenticated mutating routes

### 2.3 Primary Content-Management Workflow

- [ ] Ensure Draft → AI review → Internal review → Client approval → Scheduled → Published lifecycle works end-to-end
- [ ] Verify approval permission gating blocks unauthorized users
- [ ] Confirm unapproved posts cannot be published when approval is required
- [ ] Test retry mechanisms do not publish duplicates
- [ ] Validate failed publishing preserves draft state

### 2.4 Deliverables

- Comprehensive test coverage for plan limit enforcement
- Security audit report with fixes
- Content workflow end-to-end tests
- Fixed pipe/guard configurations

---

## PHASE 3 — AGENCY WORKFLOW

**Priority:** Complete client profiles, brand context, content assignment, approval, and revisions using existing capabilities wherever possible.

### 3.1 Already Implemented (from audit)

✅ Agency workspace with tenant isolation  
✅ User roles & permissions (18 resources × 5 actions = 90)  
✅ Brand profiles (AIBrandProfile with all required fields)  
✅ Connected social accounts with OAuth flows  
✅ Approval workflow with status tracking  
✅ Content calendars and reporting  

### 3.2 Gaps to Fill

| Gap | Priority | Action |
|-----|----------|--------|
| "Add a client" UX clarity | 📐 Medium | Clarify that Organization = client in this architecture; improve UI labeling |
| Client-specific content calendars | 📐 Medium | Enhance calendar view to filter by client/organization with proper separation |
| Agency team collaboration features | 📐 Medium | Improve team member management within agencies (role-based post access, delegation) |
| Client reporting with proper separation | 📐 Medium | Ensure reports only show client data, not agency-wide data |

### 3.3 Deliverables

- Improved "add client" onboarding flow with clear UI labeling
- Client-filtered calendar and report views
- Team collaboration UI improvements within agencies
- Documentation of organization-as-client architecture

---

## PHASE 4 — AI DIFFERENTIATION

**Priority:** Build the campaign-planning workflow and weekly content-preparation workflow.

### 4.1 Campaign Planning Agent (from audit: ⚠️ Partially Implemented)

**Writing-block requirements:**
- Transform campaign brief into proposed content plan ✅ (framework needs building)
- Collect missing critical information ⚠️ (not automated)
- Read client's brand profile ✅ (AIBrandProfile accessible)
- Generate campaign objectives and content themes ⚠️ (AI can generate, but not workflow-baked)
- Propose a posting calendar ⚠️ (calendar view exists, not auto-generated from brief)
- Generate draft content for individual posts ✅ (AI content agent)
- Identify required creative assets ⚠️ (not automated)
- Flag posts requiring factual verification ✅ (guardrails + human review)
- Present proposed plan for human review ⚠️ (UI workflow needed)
- Save approved drafts into existing content workflow ✅ (Posts saved as drafts)

**Implementation plan:**
1. Build `POST /campaigns/plan` endpoint that orchestrates the full sequence
2. Collect brief data via DTO, validate critical fields
3. Fetch org's AIBrandProfile and AIOrgProviderConfig
4. Generate campaign objectives via AI provider kernel
5. Propose posting calendar (7-30 days) with platform distribution
6. Generate draft posts for each calendar day (platform-specific variations)
7. Identify missing assets via media library query
8. Flag posts with unsupported claims via guardrail checks
9. Present plan in readable format for human review
10. On approval, save drafts to Post model with campaignId reference

**Dependencies:**
- Provider kernel AI generation (already exists)
- Brand profile model (already exists)
- Post draft creation (already exists)
- Approval workflow (already exists)

### 4.2 Weekly Content Preparation Workflow (from audit: ⚠️ Partially Implemented)

**Writing-block requirements:**
- Identify upcoming content needs ⚠️ (no automated "identify")
- Generate proposed weekly content plan ⚠️ (not automated weekly workflow)
- Draft posts using approved brand information ✅ (AI content agent)
- Identify missing assets ⚠️ (media library exists, not automated workflow)
- Submit drafts for approval ✅ (approval workflow)
- Notify responsible users of pending work ✅ (NotificationPreference categories)

**Implementation plan:**
1. Create Inngest function: `weekly_content_prep` (scheduled daily)
2. Query upcoming posts (none with publishDate in next 7 days)
3. Check brand profiles for active orgs
4. Generate proposed weekly plan via AI (objectives, themes, distribution)
5. Draft posts for each day (platform-specific, brand-aware)
6. Identify missing assets (images, videos, links) via media library
7. Submit drafts for approval (automatic or manual)
8. Notify responsible users via NotificationPreference categories

**Dependencies:**
- Inngest scheduled functions (framework exists)
- AI content agent (already functional)
- Media library asset tracking (partially exists)
- Notification system (already functional)

### 4.3 Automation Workflows (from audit: ⚠️ Partially Implemented)

**Four workflows from writing-block:**

**WORKFLOW A — WEEKLY CONTENT PREPARATION** ⚠️ (see §4.2)
**WORKFLOW B — CAMPAIGN LAUNCH** ⚠️ (see §4.1)
**WORKFLOW C — MONTHLY REPORT** ⚠️ (see §4.4)
**WORKFLOW D — FAILED PUBLISHING RECOVERY** ⚠️ (see §4.5)

### 4.4 Monthly Report Workflow (from audit: ⚠️ Partially Implemented)

**Writing-block requirements:**
- Retrieve available analytics ✅ (AnalyticsSnapshot queries)
- Calculate relevant comparisons ✅ (AnalyticsAnomaly with baseline)
- Generate plain-language report ⚠️ (dashboard exists, not automated workflow)
- Identify limitations in underlying data ✅ (AnalyticsAnomaly.direction + ruleId)
- Propose experiments for next month ⚠️ (not automated)

**Implementation plan:**
1. Create Inngest function: `monthly_report` (scheduled on 1st of month)
2. Query AnalyticsSnapshot for past period (previous month)
3. Calculate comparisons vs. previous period
4. Identify content patterns (top-performing posts, types, campaigns)
5. Generate plain-language summary via AI or rules-based
6. Identify data limitations (missing metrics, platforms without analytics)
7. Propose experiments (new content types, posting times, target audiences)
8. Save report as draft or notification for user review

### 4.5 Failed Publishing Recovery (from audit: ⚠️ Partially Implemented)

**Writing-block requirements:**
- Detect failed publishing job ✅ (Post.error + state = ERROR)
- Classify the error ⚠️ (error string stored, not formally classified)
- Retry only when appropriate ✅ (manual or Inngest retry with backoff)
- Notify user when intervention needed ✅ (NotificationPreference categories)
- Preserve idempotency ✅ (Inngest event uniqueness)

**Implementation plan:**
1. Formalize error classification system (enum: NETWORK_ERROR, AUTH_ERROR, RATE_LIMIT, CONTENT_REJECTED, PLATFORM_DOWN, etc.)
2. Create error classification Inngest activity
3. Implement smart retry logic: only retry on transient errors (NETWORK, PLATFORM), not on auth/content errors
4. Add retry counter on Post model to prevent infinite retries
5. Notify user via NotificationPreference when intervention needed
6. Provide UI button for "Retry publishing" or "Mark as manual"

---

## PHASE 5 — RELIABLE EXECUTION

**Priority:** Verify scheduling, publishing integrations, retries, audit logs, and provider error handling.

### 5.1 Scheduling & Publishing Verification

- [ ] Verify scheduled posts remain scheduled until execution
- [ ] Test all 45+ channel integrations for publish flow
- [ ] Verify token expiry handling (refreshNeeded flag → reconnection UI)
- [ ] Test rate-limit handling across providers
- [ ] Verify idempotency on all publishing retries
- [ ] Test failed publishing → recovery flow end-to-end

### 5.2 Provider Error Handling

- [ ] Audit all provider packages for error classification
- [ ] Ensure `safeFetch` SSRF protection works across all platforms
- [ ] Test transient failure retry with exponential backoff
- [ ] Verify rate-limit responses are handled correctly per provider
- [ ] Test OAuth token refresh flows (access token expiry, refresh token rotation)

### 5.3 Audit Logging Verification

- [ ] AuditLog entries created for all credential mutations
- [ ] Verify no access tokens or secrets in audit log details
- [ ] Test audit log queries by organization
- [ ] Verify audit log covers: storage mount/unmount, channel provider create/update/delete

### 5.4 Deliverables

- Comprehensive publishing integration test suite
- Error classification system documentation
- Retry logic documentation
- Audit log verification report

---

## PHASE 6 — REPORTING

**Priority:** Improve analytics summaries, client reports, and evidence-based recommendations.

### 6.1 Analytics Enhancements (from audit: ✅ Fully Implemented)

**Already works:**
- AnalyticsSnapshot metric collection
- PostAnalyticsSnapshot post-level metrics
- AnalyticsAnomaly detection (spikes/drops)
- AnalyticsAlertRule user-defined alerts
- AnalyticsShare public share dashboard

**Enhancements:**
- [ ] Comparative period selectors (week/month/quarter/year)
- [ ] Content type performance breakdown
- [ ] Campaign-level performance comparison
- [ ] Follower growth trend charts
- [ ] Video view analytics (where available)
- [ ] Engagement rate calculations

### 6.2 Client Report Improvements (from audit: ✅ Fully Implemented)

**Already works:**
- AnalyticsShare model with public share tokens
- Report period and data source tracking
- Metric comparison with previous period

**Enhancements:**
- [ ] Export to PDF/CSV for client reports
- [ ] Scheduled report delivery (email + in-app)
- [ ] Custom report period selection
- [ ] Data source attribution on each report
- [ ] Hypothesis labeling (spike/drop with possible explanations)
- [ ] Actionable recommendations generation

### 6.3 Evidence-Based Recommendations

- [ ] AI-generated recommendations based on anomaly patterns
- [ ] Experiment tracking (hypothesis → result → learning)
- [ ] A/B test support for posting times, content types
- [ ] Top-performing content identification per client
- [ ] Performance benchmarks vs. industry averages (where data available)

### 6.4 Deliverables

- Enhanced analytics dashboard with comparative views
- Client report export functionality
- Experiment tracking system
- Recommendation engine (rules-based initial, AI-assisted later)

---

## PHASE 7 — COMMERCIAL PILOT

**Priority:** Prepare onboarding, configurable usage limits, deployment instructions, and a small pilot with real customers.

### 7.1 Onboarding Flow (from audit: ✅ Fully Implemented (skeleton))

**Already works:**
- Account creation (local + OIDC)
- Organization/workspace creation
- Brand profile completion
- Social account connection (or skip)
- First draft generation
- Approval submission
- Scheduling/publishing when integration connected

**Enhancements:**
- [ ] Demo/sample workspace clearly labeled (not confusing with real data)
- [ ] Interactive guided tour on first login
- [ ] Skip integration configuration for product exploration
- [ ] Clear "hello world" first post tutorial

### 7.2 Configurable Usage Limits (from audit: ⚠️ Partial)

**Already works:**
- `Subscription` model with tier (FREE/PRO/AGENCY/CUSTOM)
- Usage caps: extraChannels, extraTeamMembers, extraPosts, extraStorage, extraVideoExports, extraBrandKits, extraWebhooks, extraCompetitors
- `limitOverrides` JSON for custom limits
- `AISpendLog` AI cost tracking
- `AIOrgProviderConfig` budget caps (monthly/daily/alert threshold)

**Enhancements:**
- [ ] Server-side enforcement of ALL plan limits (currently partial)
- [ ] Real-time quota consumption dashboard
- [ ] Hard limits vs. soft limits (warn before hard block)
- [ ] Per-org AI usage caps independent of subscription tier
- [ ] Publishing quota per plan (posts per month)
- [ ] Client-to-workspace ratio limits

### 7.3 Pricing Configuration (from audit: ⚠️ Partial)

**Writing-block suggested prices:**
- SOLO — ₹999/month: One workspace, small number of connected social accounts, AI-assisted content creation, content calendar, basic analytics
- AGENCY — ₹2,999/month: Multiple client profiles, team collaboration, approval workflows, campaign planning, client reporting, higher configurable usage limits
- CUSTOM — Later: Higher limits, advanced permissions, custom workflows, optional branded reporting

**Current state:** Pricing not hardcoded; `SubscriptionTier` enum exists (FREE/PRO/AGENCY/CUSTOM). Need to document commercial hypotheses and tie them to feature limits.

**Enhancements:**
- [ ] Document SOLO/AGENCY/CUSTOM pricing as commercial hypotheses (not hardcoded)
- [ ] Tie each feature to specific plan limits
- [ ] Configure pricing per deployment (env variables or DB config)
- [ ] Create pricing calculator middleware for API responses
- [ ] Add plan display text to frontend

### 7.4 Deployment & Operations

- [ ] Docker production deployment guide
- [ ] Environment variable reference (.env.example)
- [ ] Production readiness checklist
- [ ] Backup and recovery procedures
- [ ] Monitoring and alerting setup (Sentry, OpenTelemetry)

### 7.5 Pilot Customer Onboarding

- [ ] 3-5 pilot customers onboarded
- [ ] Onboarding success tracking
- [ ] Feature usage analytics during pilot
- [ ] Feedback collection mechanism
- [ ] Pilot-to-commercial transition plan

### 7.6 Deliverables

- Production deployment guide
- Environment variable documentation
- Pricing feature-limit matrix
- Pilot customer onboarding package
- Commercial hypotheses documented (not committed code)

---

## PHASE 8 — POST PILOT ITERATION

**Priority:** Based on pilot feedback, iterate on features, limits, and UX. This is an ongoing loop, not a fixed-phase end.

**Success criteria from writing-block:**
- Real customers validating features
- Usage limits working as expected
- AI usage accounting reliable
- Publishing integrations stable across target platforms
- Approval workflows functioning in real agency scenarios
- Reports generating useful insights (not fabricated metrics)

**Iterate based on:**
- Pilot customer feedback
- Usage pattern analysis
- Integration stability metrics
- AI cost vs. value assessment
- Security audit results
- UI/UX improvement priorities

---

## ROADMAP SUMMARY

| Phase | Focus | Key Deliverables | Status |
|-------|-------|------------------|--------|
| 1 — Audit | Understanding codebase | PRODUCT_AUDIT.md, ARCHITECTURE.md | ✅ Complete |
| 2 — MVP Hardening | Fix bugs, security, content workflow | Test suites, security fixes, workflow validation | 📋 Planned |
| 3 — Agency Workflow | Client profiles, brand context, approvals | Improved onboarding, client-filtered views | 📋 Planned |
| 4 — AI Differentiation | Campaign planning, automation workflows | Campaign planning agent, 4 automation workflows | 📋 Planned |
| 5 — Reliable Execution | Publishing, retries, audit logs | Integration tests, error classification | 📋 Planned |
| 6 — Reporting | Analytics, client reports, recommendations | Enhanced dashboards, export functionality | 📋 Planned |
| 7 — Commercial Pilot | Onboarding, limits, pilot customers | Pricing matrix, deployment guide, pilot customers | 📋 Planned |
| 8 — Post-Pilot | Iterate based on feedback | Ongoing feature refinement | 🔄 Continuous |

---

## SUCCESS METRICS

**MVP readiness (end of Phase 7):**
- [ ] 3+ pilot customers onboarded and active
- [ ] All critical content management workflows functional
- [ ] Publishing to 3+ major social platforms (X/Twitter, LinkedIn, Facebook) stable
- [ ] AI content generation producing brand-aware output
- [ ] Approval workflow preventing unapproved publishing
- [ ] Client reports generating without fabricated metrics
- [ ] Server-side plan limit enforcement working
- [ ] No security vulnerabilities found in audit

**Commercial viability signals:**
- [ ] Pilot customers willing to pay configured pricing
- [ ] Feature usage aligns with pricing tier expectations
- [ ] AI usage cost per client is predictable and reasonable
- [ ] Integration stability > 95% success rate across pilot platforms
- [ ] Approval workflow adoption rate > 80% of posts

---

*Roadmap generated by opencode agent. Based on postmill-app v1.2.0 codebase and writing-block.md master engineering prompt. Adjust priorities based on team capacity and customer feedback.*