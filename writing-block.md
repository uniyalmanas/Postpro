# MASTER ENGINEERING PROMPT — BUILD AN AI SOCIAL MEDIA OPERATIONS SAAS

## 1. YOUR ROLE

Act as a senior software architect, full-stack engineer, AI engineer, product designer, security engineer, and pragmatic SaaS founder.

Your task is to inspect, understand, improve, and extend the existing Postmill AI codebase into a commercially viable, AI-powered social media management platform designed initially for small marketing agencies and social media freelancers.

This is an existing codebase. You are NOT being asked to create a separate application from scratch or blindly rewrite the project.

You must work directly in the current repository, understand its architecture, and implement improvements that fit the existing stack.

Work autonomously on implementation where requirements are clear. Ask questions only when a decision is genuinely blocking.

## 2. PRODUCT VISION

Build a platform that helps a small marketing agency manage multiple clients, plan campaigns, generate content, coordinate approvals, schedule posts, monitor available performance data, and prepare client reports from one workspace.

The product should help agencies serve more clients without proportionally increasing repetitive work.

Working product positioning:

"Your AI-powered social media operations team."

Our competitive advantage must NOT be merely generating captions with an LLM.

We want to combine:

- Multi-client agency management.
- Brand-aware AI content generation.
- Campaign and content calendar planning.
- Human approval and revision workflows.
- Reliable publishing through supported social platform integrations.
- Analytics summaries and actionable recommendations.
- Reusable automation workflows.
- Clear reporting of AI usage, publishing status, and business outcomes where measurable.

The initial target customer is an independent social media manager or small agency managing several client accounts.

The initial market is India, with the architecture remaining suitable for international customers.

## 3. FIRST: AUDIT THE EXISTING REPOSITORY

Before modifying code, inspect the entire project structure and understand:

- Frameworks, languages, package managers, and versions.
- Frontend architecture and existing design system.
- Backend APIs and services.
- Database schema, migrations, and data models.
- Authentication, authorization, and tenant isolation.
- Existing AI providers, agents, and prompt-management systems.
- Social media integrations and publishing workflows.
- Scheduling, queues, background jobs, and retries.
- Analytics, media processing, and comment inbox functionality.
- Tests, linting, type checking, and deployment configuration.
- Environment variables and secret-management practices.
- Existing documentation and known limitations.
- Current license and obligations associated with AGPL-3.0.

Read the README, contribution instructions, relevant documentation, and package scripts.

Run the available checks and tests where practical. Identify whether the application currently runs successfully.

Do not assume features exist just because the product description mentions them. Verify the implementation in the actual code.

Create the following documentation files if they do not already exist:

- `docs/PRODUCT_AUDIT.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/LOCAL_DEVELOPMENT.md`

The audit must distinguish between:

1. Fully implemented and tested.
2. Implemented but incomplete or unverified.
3. Partially implemented.
4. Missing.
5. Blocked by external API access, credentials, permissions, or platform limitations.

After the audit, proceed with implementation without unnecessarily waiting for confirmation. If an important technical or commercial blocker exists, document it and select the safest practical alternative.

## 4. NON-NEGOTIABLE ENGINEERING RULES

1. Preserve existing working functionality.
2. Do not replace the current stack without a compelling, documented reason.
3. Do not rebuild existing features that already work.
4. Avoid unnecessary dependencies and infrastructure.
5. Use the existing database and migration conventions.
6. Never commit API keys, credentials, tokens, or secrets.
7. Never hardcode fake success responses for external integrations.
8. Never mark a post as published unless the publishing provider confirms success.
9. Use explicit error handling, validation, logging, and retries.
10. Do not expose internal server errors or secrets to end users.
11. Implement tenant isolation on the server, not merely in the UI.
12. Add tests for important business logic and security boundaries.
13. Use real AI provider integrations already supported by the project where possible.
14. Do not introduce paid third-party dependencies without documenting the cost and alternatives.
15. Keep changes small enough to test and review.
16. Never claim an integration, test, or workflow works unless it has actually been verified.

Maintain backward compatibility with existing data and user workflows wherever possible.

## 5. PRODUCT MODULE A: AGENCY WORKSPACE

Inspect and reuse Postmill's existing workspace, organization, and team functionality.

Provide a coherent agency workflow that supports:

- An agency workspace.
- Multiple client workspaces or client profiles, using the existing data model where appropriate.
- Client-specific brand information.
- Connected social accounts, with appropriate ownership and authorization.
- Team members and role-based permissions.
- Content assigned to specific clients.
- Approval and revision status.
- Client-specific content calendars and reporting.
- Separation of data between agencies and clients.

Potential roles:

- Owner or administrator.
- Agency team member.
- Content editor.
- Read-only client reviewer.

Adapt these roles to the existing permission model instead of creating a parallel authorization system.

A user must never be able to access another tenant's clients, posts, integrations, reports, or credentials by changing a URL or API request.

Add automated tests for tenant boundaries.

## 6. PRODUCT MODULE B: BRAND KNOWLEDGE AND BRAND VOICE

Build a reusable brand profile for each client.

Fields should include, where relevant:

- Business name and description.
- Industry and target audience.
- Products and services.
- Geographic market.
- Preferred language.
- Brand voice and tone.
- Preferred calls to action.
- Approved terminology.
- Prohibited claims and expressions.
- Brand colors and visual guidelines.
- Website and approved source materials.
- Frequently asked questions.
- Competitors or reference brands.
- Campaign objectives.
- Brand-specific instructions.

Allow users to edit, preview, and save this information.

Use the brand profile as structured context for AI generation.

Where the application already has document ingestion or retrieval capabilities, reuse them. Otherwise, implement a simple, reliable retrieval approach only when necessary.

Requirements:

- Keep each client's knowledge isolated.
- Preserve source attribution for retrieved factual information.
- Distinguish approved facts from AI-generated suggestions.
- Avoid claiming that a business offers a product, price, discount, or service unless supported by approved information.
- Do not add a vector database solely for marketing purposes if ordinary structured retrieval is sufficient.

## 7. PRODUCT MODULE C: AI CONTENT AGENT

Implement or improve a brand-aware content generation workflow.

Inputs should include:

- Client and brand.
- Campaign objective.
- Target audience.
- Platform.
- Content format.
- Language.
- Tone.
- Topic or campaign brief.
- Call to action.
- Optional reference materials.
- Desired publishing date.

Expected outputs:

- Post copy.
- Platform-appropriate caption.
- Optional headline.
- Relevant hashtags where useful.
- Call to action.
- Suggested creative direction.
- Image-generation prompt or media brief.
- Alternative versions.
- Sources for factual claims when research was used.
- Warnings for missing information or unsupported claims.

Support common use cases such as:

- Educational posts.
- Product announcements.
- Promotional campaigns.
- Founder-led content.
- Case studies.
- Testimonials supplied by the customer.
- Frequently asked questions.
- Seasonal campaigns.
- Short-form video scripts.
- Multi-post campaigns.

Do not generate fabricated customer testimonials, false statistics, invented reviews, or unsupported product claims.

Generate platform-specific variations rather than copying identical content everywhere.

Use the existing AI provider abstraction and model configuration.

Include:

- Prompt versioning where appropriate.
- Structured output validation.
- Sensible retry behavior.
- AI usage and cost tracking where feasible.
- User-visible errors when a provider fails.
- Model and provider selection according to the existing application design.

AI output must remain editable by the user.

## 8. PRODUCT MODULE D: CAMPAIGN PLANNING AGENT

Build a workflow that transforms a campaign brief into a proposed content plan.

Example user request:

"Create a 30-day Instagram and LinkedIn content plan for a coaching institute in Dehradun. The objective is to generate enquiries for its upcoming batch."

The system should:

1. Collect any missing critical information.
2. Read the client's brand profile.
3. Generate campaign objectives and content themes.
4. Propose a posting calendar.
5. Generate draft content for individual posts.
6. Identify required creative assets.
7. Flag posts requiring factual verification.
8. Present the proposed plan for human review.
9. Save approved drafts into the existing content workflow.

The agent must not publish or schedule external posts merely because it has generated a plan.

Keep campaign planning deterministic enough to inspect and debug. Store the campaign brief and generated plan so the user can revise them.

Avoid implementing a complicated multi-agent framework unless the existing architecture justifies it.

## 9. PRODUCT MODULE E: APPROVAL AND REVISION WORKFLOW

Build on the existing content review functionality.

A typical lifecycle:

Draft → AI review → Internal review → Client approval → Scheduled → Published.

Support rejection, revision, and cancellation.

Requirements:

- Display the current status clearly.
- Track who made each important change.
- Store relevant revision history.
- Allow reviewers to leave comments.
- Prevent publishing unapproved content when approval is required.
- Prevent unauthorized users from approving content.
- Make scheduling and publishing state transitions explicit.
- Handle failed publishing without losing the draft.
- Provide a clear retry mechanism.
- Prevent duplicate publishing when a request is retried.

Approval requirements should be configurable per agency or client where appropriate.

Any AI-generated score must be treated as a suggestion, not as proof that content is accurate or effective.

## 10. PRODUCT MODULE F: PUBLISHING AND SOCIAL INTEGRATIONS

Inspect the existing integrations before adding new ones.

Preserve and improve supported integrations instead of pretending all platforms have equivalent API access.

For every provider, document:

- Supported actions.
- Required permissions and scopes.
- Token lifecycle.
- Publishing limitations.
- Media requirements.
- Analytics availability.
- Comment or inbox capabilities.
- Development-mode and app-review requirements.

Implement a consistent provider abstraction only if the existing project lacks one.

Use official APIs and supported OAuth flows.

Never collect users' social media passwords.

Store access tokens securely and use least-privilege permissions.

Implement or verify:

- Account connection and disconnection.
- Token expiry handling.
- Media validation.
- Platform-specific post validation.
- Publishing jobs.
- Idempotency and duplicate prevention.
- Retry with backoff for transient failures.
- Rate-limit handling.
- Publishing status updates.
- Useful audit logs.
- Reconnection prompts when authorization expires.

A scheduled post must remain scheduled until the publishing system actually executes it.

If credentials are missing, provide a development-safe configuration path and clear setup documentation. Do not simulate a successful live publication.

## 11. PRODUCT MODULE G: ANALYTICS AND REPORTING AGENT

Reuse existing analytics integrations and data models.

Build a reporting workflow that uses only metrics the connected platform actually makes available.

Where available, analyze:

- Reach and impressions.
- Engagement.
- Clicks.
- Follower growth.
- Video views.
- Publishing consistency.
- Top-performing content.
- Performance by content type.
- Campaign-level performance.
- Tracked enquiries or conversions.

The system should generate:

1. A concise performance summary.
2. A comparison with an appropriate previous period.
3. Observed content patterns.
4. Possible explanations, clearly labelled as hypotheses.
5. Actionable recommendations.
6. Suggested experiments for the next period.

Do not fabricate metrics or fill missing values with invented numbers.

Do not claim that a post generated revenue unless reliable attribution data supports the claim.

Build a client-report view that can be exported or shared through existing supported functionality.

Where practical, include a report period and the data sources used.

## 12. PRODUCT MODULE H: AUTOMATION WORKFLOWS

Implement a small number of useful, reliable workflows rather than a large generic agent framework.

Initial examples:

WORKFLOW A — WEEKLY CONTENT PREPARATION

- Identify upcoming content needs.
- Generate a proposed weekly content plan.
- Draft posts using approved brand information.
- Identify missing assets.
- Submit drafts for approval.
- Notify responsible users of pending work.

WORKFLOW B — CAMPAIGN LAUNCH

- Collect a campaign brief.
- Generate a campaign proposal.
- Prepare platform-specific drafts.
- Validate required fields.
- Request approval.
- Schedule approved posts.

WORKFLOW C — MONTHLY REPORT

- Retrieve available analytics.
- Calculate relevant comparisons.
- Generate a plain-language report.
- Identify limitations in the underlying data.
- Propose experiments for the next month.

WORKFLOW D — FAILED PUBLISHING RECOVERY

- Detect a failed publishing job.
- Classify the error.
- Retry only when appropriate.
- Notify the user when intervention is needed.
- Preserve idempotency.

Each workflow should expose its status, logs, inputs, outputs, and failure reason.

Use the project's existing job queue or scheduler where possible.

## 13. HUMAN CONTROL AND AI SAFETY

Human approval must be the default for public-facing content and other consequential external actions.

The system must never independently:

- Publish unapproved content.
- Invent discounts, prices, or product claims.
- Send unsolicited bulk messages.
- Purchase advertisements.
- Spend money.
- Change account permissions.
- Delete customer data.
- Connect or disconnect accounts.

Any optional automation that performs external actions must have explicit configuration, appropriate authorization, audit logging, and a clear way to stop it.

Treat imported posts, comments, documents, and external content as untrusted input. They must not override system instructions or cause tools to perform unauthorized actions.

## 14. PRODUCT MODULE I: CUSTOMER ONBOARDING

Create a clear onboarding flow using the existing UI and authentication architecture.

A new customer should be able to:

1. Create an account.
2. Create or join an agency workspace.
3. Add a client.
4. Complete a brand profile.
5. Connect a social account, or skip this step.
6. Generate the first draft.
7. Review and edit the draft.
8. Submit it for approval.
9. Schedule or publish it when a supported integration is connected.

Provide a demo or sample workspace if the project already supports one, or implement a clearly labelled demo mode without confusing sample data with real customer data.

Avoid forcing users to configure every integration before they can experience the product.

## 15. PRODUCT MODULE J: SAAS READINESS

Prepare the architecture for commercial use without prematurely building an enormous billing system.

Inspect existing billing functionality first.

If billing is absent, document a minimal subscription design that can later support:

- Free trial or limited demo.
- Solo plan.
- Agency plan.
- Usage limits.
- AI usage accounting.
- Client and workspace limits.
- Publishing limits where applicable.
- Subscription state and cancellation.
- Payment webhooks.
- Enforcement of plan limits on the server.

Do not implement live payments without the required provider credentials and configuration.

Do not expose premium features solely through frontend checks.

Keep pricing configurable rather than scattering fixed prices throughout the codebase.

## 16. INITIAL PRODUCT PRICING TO TEST

Use these as commercial hypotheses, not hardcoded commitments:

SOLO — ₹999/month
- One workspace.
- A small number of connected social accounts.
- AI-assisted content creation.
- Content calendar.
- Basic analytics where available.

AGENCY — ₹2,999/month
- Multiple client profiles.
- Team collaboration.
- Approval workflows.
- Campaign planning.
- Client reporting.
- Higher configurable usage limits.

CUSTOM — Later
- Higher limits.
- Advanced permissions.
- Custom workflows.
- Optional branded reporting.

The exact features and limits must be based on what the application can reliably support and what customers validate.

Do not promise unlimited AI usage.

## 17. UI/UX EXPECTATIONS

Retain the existing visual identity and design system unless the audit identifies substantial usability problems.

The application should feel like a professional SaaS product, not a collection of disconnected AI demos.

Priorities:

- Clear navigation.
- Responsive desktop and mobile layouts.
- Consistent spacing, typography, and components.
- Useful empty states.
- Loading, success, and error states.
- Accessible forms and controls.
- Clear content status labels.
- Visible approval actions.
- Calendar and list views.
- Useful filters and search.
- No fake metrics or placeholder buttons presented as working features.
- No unnecessary animations or decorative complexity.

Make the main workflow discoverable:

Dashboard → Client → Campaign → Drafts → Approval → Calendar → Analytics.

Reuse existing components wherever possible.

## 18. SECURITY, PRIVACY, AND RELIABILITY

Audit and address:

- Authentication and authorization.
- Tenant isolation.
- Input validation.
- SQL injection risks.
- Cross-site scripting.
- Cross-site request forgery where relevant.
- OAuth state validation.
- Secure token storage.
- Rate limiting.
- Webhook verification.
- File upload validation.
- Secret leakage.
- Personal data handling.
- Audit logging.
- Backup and recovery considerations.

Never log access tokens, secrets, or sensitive customer content unnecessarily.

Do not make broad security claims without tests or evidence.

Document any high-risk issues that cannot be resolved within the current implementation.

## 19. TESTING AND ACCEPTANCE CRITERIA

Write or update automated tests using the existing testing stack.

At minimum, test the following critical workflows:

1. A user can create and access an authorized client workspace.
2. A user cannot access another tenant's data.
3. Brand information is used in AI generation.
4. Invalid AI output is handled safely.
5. A draft can be edited and submitted for approval.
6. An unauthorized user cannot approve a post.
7. An unapproved post cannot be published when approval is required.
8. A scheduled post is processed by the job system.
9. A failed provider request does not create a false published state.
10. Retries do not unintentionally publish duplicate posts.
11. Missing analytics are represented honestly.
12. API credentials are not exposed to the frontend or logs.
13. Plan limits, if implemented, are enforced server-side.
14. Existing functionality remains operational.

Run available tests, linting, formatting, and type checks.

Fix regressions introduced by your changes.

If an external integration cannot be tested without credentials, state that explicitly and test the relevant logic using appropriate mocks or sandbox facilities.

## 20. IMPLEMENTATION PRIORITY

Do not attempt to implement every module simultaneously.

Use this order:

PHASE 1 — AUDIT
Understand the codebase, document the architecture, verify current behavior, and establish a working baseline.

PHASE 2 — MVP HARDENING
Fix broken existing functionality, critical security issues, and the primary content-management workflow.

PHASE 3 — AGENCY WORKFLOW
Complete client profiles, brand context, content assignment, approval, and revisions using existing capabilities wherever possible.

PHASE 4 — AI DIFFERENTIATION
Build the campaign-planning workflow and weekly content-preparation workflow.

PHASE 5 — RELIABLE EXECUTION
Verify scheduling, publishing integrations, retries, audit logs, and provider error handling.

PHASE 6 — REPORTING
Improve analytics summaries, client reports, and evidence-based recommendations.

PHASE 7 — COMMERCIAL PILOT
Prepare onboarding, configurable usage limits, deployment instructions, and a small pilot with real customers.

After every phase, run relevant tests and update the documentation.

## 21. WORKING METHOD

Follow this process:

1. Inspect the repository.
2. Summarize the existing architecture and the most important findings.
3. Identify the highest-priority issues.
4. Create a phased task list.
5. Implement the highest-value safe changes.
6. Run relevant tests after each logical change.
7. Inspect the final diff for regressions, secrets, accidental destructive changes, and unfinished work.
8. Update documentation.
9. Report exactly what changed and what remains.

Do not stop after generating a roadmap. Continue with implementation.

Do not make large, destructive changes without a clear technical reason.

Do not silently skip a failed test. Explain the failure and investigate it.

If a task is too large for one execution, complete the highest-value vertical slice and leave a precise, actionable list of remaining work.

## 22. REQUIRED FINAL REPORT

When finished, provide:

- Summary of the existing architecture.
- Existing features reused.
- Files and modules modified.
- Features implemented.
- Database migrations added, if any.
- Environment variables required.
- Commands to install, run, and test the application.
- Test results, including failures.
- External API credentials or approvals still needed.
- Known limitations.
- Security concerns requiring attention.
- Remaining implementation tasks.
- Recommended next steps for launching a paid pilot.

Separate verified functionality from unverified functionality.

Never state that the product is production-ready unless the relevant security, reliability, deployment, and integration requirements have actually been verified.

## FINAL OBJECTIVE

Turn the existing Postmill AI project into a reliable, differentiated, AI-assisted social media operations product for small agencies.

Optimise for a working, secure, commercially testable MVP—not maximum feature count, unnecessary architecture, or impressive-looking mockups.

Begin by auditing the current repository, documenting your findings, and then proceed with the highest-priority implementation work.