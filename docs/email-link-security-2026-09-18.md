# Email connection warning investigation — 18 September 2026

## Finding

The received 16 September campaign, “What Happens When People Use AI to Solve Real-World Problems?”, contains HTTP links to `url6973.newworld-game.org/ls/click` for its video, site, and unsubscribe buttons. Recipient-specific tracking tokens are intentionally not reproduced here.

A certificate-verifying request to `https://url6973.newworld-game.org/` failed with curl error 60: the endpoint presents a certificate for `*.sendgrid.net`, whose subject alternative names do not cover the branded hostname. No certificate checks were disabled. This is a confirmed tracking-host TLS configuration defect and a strong explanation for the reported Chrome warning; the reporter's exact browser error code/settings were not available.

Chrome can warn when an HTTP destination cannot be upgraded to a secure connection. The website certificate does not also secure an independently hosted email-tracking subdomain.

## Main websites checked

- `https://newworld-game.org/home`
- `https://globalsolutionlab.com/`
- `https://globalsolutionlab.com/nwg-news?v=LtuwKETteayh0E2HM1LC`

All three returned HTTP 200 over verified HTTPS and loaded in the browser without an interstitial. The two main domains' certificate chains validated; the certificate observed was valid 7 August–5 November 2026. HTTP home/root links redirected to HTTPS. Google Safe Browsing's public status reported “No unsafe content found” for the checked sites/page. The news video's HTTPS Firebase Storage source loaded without a media error; no HTTP DOM resources were observed on that page. These are point-in-time checks, not a guarantee about every network, device, or security vendor.

## Code safeguard

Both `sendBulkTestEmail` and `sendBulkHtml` now explicitly disable SendGrid click rewriting for HTML and plain text. Authored HTTPS links remain direct instead of acquiring the broken tracking-host detour. This per-message boundary covers the campaign composer and the activity-report caller without changing their APIs.

Preserved: open tracking, categories, attachments, batching, personalization, unsubscribe substitutions, authentication checks, and error contracts. Trade-off: no SendGrid click analytics for these campaign messages. Open tracking still depends on the provider's separate tracking image; it does not redirect button navigation.

This does not change arbitrary HTTP URLs authored in a template, unwrap tracking URLs pasted into a template, repair previously delivered messages, or change the four unrelated notification senders that explicitly enable tracking. Use original HTTPS destination URLs in drafts, never links copied from a delivered tracked email. Provider TLS repair remains necessary for the account's legacy links and other tracked messages.

Changed files:

- `functions/src/index.ts`: the two campaign send boundaries.
- `functions/package.json`: focused test command.
- `functions/test/bulk-email-links.test.js`: actual callable bodies tested with isolated provider/Firestore stubs and the real SendGrid payload serializer. No real recipients contacted.

## Validation

1. Reproduction: three new regression checks failed before the patch because the real API payload requested click rewriting (`enable: true`, `enable_text: true`). Existing authentication/error control checks passed.
2. Syntax/build: `git diff --check` and `npm --prefix functions run build` passed.
3. Focused security/compatibility: `node --test test/bulk-email-links.test.js` passed all five checks after the patch. Both flags are false in actual serialized payloads for both callable paths and every batch of a 501-recipient send. Extra caller-supplied tracking flags cannot override them. HTTPS paths/query/fragment, plain-text URL content, unsubscribe substitutions, attachments and other tracking settings are preserved.
4. Nearest regression suite: `node --test test/bulk-email-links.test.js test/weekly-brief*.test.js` passed 29 tests, with one existing FFmpeg-dependent thumbnail test skipped.
5. Full Functions tests: `node --test test/*.test.js` passed 58 tests, with that same unrelated FFmpeg integration test skipped.

The insecure rewrite request no longer reproduces at the tested campaign-send boundary. This is not a claim that an old received email or the live tracking certificate has been repaired. A personalized-link redirect request was blocked by the approval safeguard because it transmits a recipient tracking token and can register a click; it was not retried or bypassed. The hostname-only TLS check was sufficient to establish the defect.

## Remaining provider work and acceptance checks

SendGrid sign-in is needed. In Settings → Sender Authentication → Link Branding, inspect the existing `url6973.newworld-game.org` brand. Follow SendGrid's current SSL provisioning/migration flow, preserving the old hostname and link mappings. If the UI requires recreating the brand, confirm legacy-link preservation with SendGrid before doing so. Do not delete its DNS records or redirect `/ls/click` to the homepage: that would break existing destinations/unsubscribe links.

1. Provision a valid certificate for the existing tracking hostname (SendGrid's current flow offers **Auto provision SSL Certificate**, with DNS verification records).
2. Verify HTTPS hostname validation succeeds and HTTP redirects securely, without dropping the original path/query.
3. Send one expressly authorized test email to the owner; inspect its received HTML to confirm campaign buttons use the intended direct HTTPS URLs.
4. Test a non-unsubscribe legacy video link with recipient approval, including Chrome's secure-connections mode; never bypass a browser warning. Confirm the exact video remains selected.

## Deployment status

The Firebase deployment tool reported **success** for job `1789750222766`, targeting only `functions:sendBulkTestEmail,functions:sendBulkHtml` in project `new-worldgame`. A subsequent deployed-function listing confirmed both callable functions in `us-central1`. Website hosting, the game, and other functions were not deployment targets.

Post-deployment smoke checks: both callable HTTPS endpoints returned HTTP 401 with `UNAUTHENTICATED` for an empty, unauthenticated request. Both connections had `ssl_verify_result=0`. The auth guard remained intact and these requests contained no recipients and sent no email.

The provider-side tracking certificate is **not repaired** yet: the available SendGrid browser session is at its sign-in screen. No new test email was sent, so actual received-message verification remains pending. Outcome: campaign code safeguard deployed; overall legacy-link remediation blocked on SendGrid access and final delivery checks. The security-fix workflow kept the patch at the two campaign boundaries and required independent read-only boundary and regression reviews; neither review found a concrete surviving bypass within that scope.

## References

- [Chrome connection-security warnings](https://support.google.com/chrome/answer/95617?hl=en)
- [SendGrid certificate-name mismatch troubleshooting](https://help.twilio.com/articles/47399875696283)
- [SendGrid link branding and automatic SSL provisioning](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-link-branding)
- [SendGrid Mail Send tracking flags](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send)
- [Google Safe Browsing: Global Solutions Lab](https://transparencyreport.google.com/safe-browsing/search?url=globalsolutionlab.com)
- [Google Safe Browsing: New World Game](https://transparencyreport.google.com/safe-browsing/search?url=newworld-game.org)
