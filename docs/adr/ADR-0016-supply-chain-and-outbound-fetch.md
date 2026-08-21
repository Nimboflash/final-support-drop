# ADR-0016 — Supply Chain, Mail, Live-AI Topology and Outbound Fetch Policy

**Status:** Accepted
**Date:** 2026-08-21

## Context

Verified findings from the adversarial review of the delivery bundle:

1. **The build/deploy supply chain contradicts the Iranian-first no-bypass rule.** The bundle
   contains no mention of package or image registries, mirrors or vendoring, while (13 §1)
   makes Docker Compose the reference deployment on Iranian infrastructure with an explicit
   no-proxy/VPN/restriction-bypass rule, and (00 §4) forbids any mandatory Western PaaS, remote
   font, CDN or bypass dependency. Docker Hub, npmjs.org and Playwright's browser CDN are
   unreliably available or geo-blocked from Iranian IPs; as written, the reference stack cannot
   be built or pulled at deploy time without violating the pack's own rules.

2. **Invitation and recovery email has no specified mail infrastructure** (11 §8, ticket 0.5);
   the common library defaults are Western SaaS senders.

3. **Live AI from an Iranian deployment origin under the no-bypass rule has no named compliant
   topology** (12 §4, 13 §1) — the pack requires server-side provider calls without saying how
   they can lawfully and reliably originate from the intended deployment.

4. **The server-side research fetcher has no SSRF controls.** Docs (12 §7–§8) mandate
   server-side retrieval of user- and model-supplied URLs and reachability checks "from
   deployment", with no scheme allowlist, private/link-local IP blocking, redirect
   re-validation, or size/time caps — despite (11 §10) treating retrieved content as untrusted
   and (13 §9) calling for restrictive egress.

This ADR records the repair for all four. Governance authority for this amendment follows
ADR-0011.

## Decision (normative)

### D1. Mirror-capable builds

Every build, test and deploy step resolves its distribution endpoints from configuration; no
step may hard-depend on Docker Hub, npmjs.org, Playwright's CDN or any other Western-hosted
registry being reachable at deploy time (00 §4, 13 §1).

- **npm packages:** the pnpm registry endpoint comes from a committed `.npmrc` template with an
  environment-substituted URL. A self-hosted or Iranian-reachable proxy registry
  (Verdaccio-class mirror) is a first-class supported configuration.
- **Container images:** every image reference in the reference compose stack and in Dockerfiles
  takes a configurable registry prefix (for example `${REGISTRY_PREFIX}`). A self-hosted
  registry mirror, or a fully vendored image set (pre-pulled, exported and imported on the
  target host), is a first-class supported configuration.
- **Playwright browsers:** browser binaries are vendorable — fetched once to an internal
  artifact location and installed via Playwright's download-host/browsers-path configuration.
  Neither CI nor deploy requires Playwright's CDN.
- **The reference compose stack must build successfully from a configured mirror.** This is a
  Release 0 audit item (ticket 0.15, 15 §2) and is documented operationally in the doc 13
  supply-chain amendment that accompanies this ADR.
- Mirroring relaxes nothing else: images remain pinned and checksummed (13 §12), fonts and
  critical assets remain locally bundled (13 §9), and no proxy/VPN/bypass is ever assumed.

### D2. Invitation and recovery mail

- Outbound mail uses a **configurable SMTP relay**: host, port, TLS mode, sender identity, and
  credentials supplied through the deployment's approved secret mechanism (13 §9). The
  configuration must be satisfiable by a self-hosted or Iranian-hosted relay; no hard-coded
  Western email SaaS, SDK or API dependency is permitted.
- When SMTP is not configured, invitation/recovery record creation still succeeds and the UI
  surfaces a named `EMAIL_DELIVERY_UNCONFIGURED` degraded state, consistent with the
  fail-closed naming pattern of (11 §7). There is no silent fallback to a third-party sender.

### D3. Live-AI topology — recorded open gate

- The compliant network topology for live AI provider access from an Iranian deployment origin
  under the no-bypass rule is **deferred to a future ADR**, gated on the client's provider
  entity/credentials and data-transmission approval (15 §12, 13 §4).
- Until that ADR is accepted: the mock adapter remains the only default (00 §7), the
  provider-unconfigured path maps to `WAITING_INPUT` with the `PROVIDER_CONFIGURATION_REQUIRED`
  reason code (ADR-0012, 11 §7), and the system continues to assume no proxy, VPN or
  unauthorized bypass (12 §4, 13 §1).
- This is recorded here as an **open gate**, not an omission; it blocks live AI only, never the
  manual-mode product (00 §4).

### D4. Outbound-fetch (SSRF) policy

This policy applies to the research fetcher, source reachability checks (12 §8) and **every**
server-side retrieval of an externally supplied URL (user- or model-supplied):

1. **Scheme allowlist:** `http` and `https` only. Every other scheme is rejected.
2. **Public-IP-only after DNS resolution:** the fetcher resolves DNS itself, rejects any
   resolved address in private, loopback, link-local, unique-local, multicast, CGNAT or other
   non-public ranges (IPv4 and IPv6), and connects only to the validated resolved address — no
   second resolution between validation and connect.
3. **Redirect re-validation:** redirects are bounded (default maximum 5 hops) and **every hop**
   is re-validated against rules 1–2 before it is followed.
4. **Size and time caps:** configurable per-fetch response-size and total-time caps. Exceeding
   either aborts the fetch and records a retrieval failure in the structured reachability
   fields (12 §8) — never a partial silent success.
5. **No ambient credentials:** outbound fetches carry no cookies, no `Authorization` headers
   and no internal service tokens. Where the deployment allows, the fetcher runs under a
   distinct egress identity/policy (13 §9).
6. **Recorded rejections:** a policy rejection is a recorded gap with a failure reason (12 §8);
   the affected evidence slot stays in the coverage denominator (12 §9) and may flow to lawful
   human retrieval (12 §10). Policy is never silently bypassed for a "trusted" source.

### D5. Required negative tests

The following are added to the doc 14 suite — security tests (14 §9) and research tests
(14 §10) — as standing release blockers in the sense of (14 §4):

- URL with a non-allowlisted scheme is rejected.
- Host resolving to a private, loopback or link-local address is rejected.
- Redirect chain leading to a non-public address is rejected at the offending hop.
- Response exceeding the size cap is aborted and recorded as a retrieval failure.
- Fetch exceeding the time cap is aborted and recorded as a retrieval failure.
- Outbound requests are verified to carry no session cookie, authorization header or service
  token.
- A CI job proves the reference compose stack builds with public registries unreachable and
  mirrors configured (D1).

## Consequences

- Deployment requires standing up or subscribing to a mirror layer (npm proxy registry,
  container registry mirror or vendored images, vendored Playwright bundle). This operational
  cost is accepted in exchange for a stack that is actually buildable from the intended
  networks, and is verified as recorded deployment evidence (13 §13), not assumed.
- Tickets 0.2 (compose/config) and 0.15 (release audit sweep) absorb the mirror configuration
  and its verification; ticket 0.5 consumes D2; the Release 2 research fetcher is built against
  D4 from its first line, not retrofitted.
- Strict DNS pinning can break some multi-CDN hosts; those sources surface as recorded
  reachability failures and route to human retrieval (12 §10) rather than becoming policy
  exceptions.
- Live AI remains blocked on the client gate exactly as the pack's fallback posture already
  provides (15 §12, 00 §7); no schedule impact on Release 0.

## Supersedes / Amends

- Amends (13): adds the supply-chain section (registry mirrors, vendored images and browsers,
  SMTP relay) as documented in the doc 13 amendment.
- Amends (11 §10–§11) and (12 §7–§8): binds the outbound-fetch policy to the untrusted-content
  and egress rules.
- Amends (14 §9–§10): adds the negative tests in D5.
- Amends (15 §12): adds the live-AI topology ADR as an explicit client-gate row.
- Changes nothing in the provider-neutral gateway semantics (12 §1–§2). Authority hierarchy per
  ADR-0011.
