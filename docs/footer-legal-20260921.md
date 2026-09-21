# 2026-09-21 Footer legal identity

- User requested a subtle legal company identity at the very bottom of BGLARP's official website for Meta verification.
- Added visible, readable company name 嘰嘰喳喳企業社 and tax ID 60805054 below the copyright. No other site content or account settings changed.
- Uses the current Cloudflare production source, preserving the unrelated dirty desktop checkout.
- Validation: lint has no errors (six pre-existing warnings); redirect/static-parameter tests and diff check pass. Cloudflare production build and deployment succeeded (code version 12a3e891-f66a-4f2e-ad00-5b322011b0ad; existing protected secrets restored by the established deployment script).
- Public Chrome confirmed the company name and tax ID below the copyright. The live route/136-script/static-asset/redirect checks and read-only AI-auth checks pass.
- QA limit: requested browser viewport override did not take effect (actual layout width 1254px), so desktop appearance is verified but 390px/320px visual QA is not claimed. Legal text uses wrapping flex layout.
- Meta verification remains awaiting a real mailbox with the website domain; no verification email or final submission was sent in this change.
