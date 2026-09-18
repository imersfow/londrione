# LondriOne Blueprint Status

## Stage 0 - Infrastructure & Core
- [x] GitHub + Vercel + Supabase production deployment
- [x] Core multi-tenant schema reused internally as Business/Workspace
- [x] Branch, customer, service, order, payment, expense foundation
- [x] Notification engine foundation
- [x] Gmail provider database support
- [x] Edge notification worker foundation
- [x] Multi-channel OTP database foundation

## Stage 1 - Single Business Install + Internal Accounts
- [x] One installation = one laundry business flow
- [x] Fresh install `/setup` for first Owner + business + main branch
- [x] Public `/register` disabled in application flow
- [x] Existing installation locks initial setup after Owner exists
- [x] Staff & Akses module
- [x] Staff roles: Admin / Manager / Cashier / Production / Courier
- [x] Per-branch staff access
- [x] Staff search + filters + pagination + page size
- [x] Role-aware sidebar/menu
- [x] Role guards for operational pages
- [x] No-access state for authenticated account without membership
- [x] Forgot/reset password preserved
- [x] Optional login OTP preserved
- [ ] End-to-end role test after deployment
- [ ] Disable public Supabase Auth sign-up in production settings

## Stage 2 - Next
- [ ] Full white-label settings
- [ ] Dynamic logo/favicon/PWA icon
- [ ] Theme/gradient/font/login branding
- [ ] Optional homepage ON/OFF
- [ ] Dynamic homepage builder
- [ ] Custom HTML homepage mode
- [ ] Per-branch public visibility
- [ ] Per-branch price/ETA visibility
- [ ] Per-branch WA/order CTA
