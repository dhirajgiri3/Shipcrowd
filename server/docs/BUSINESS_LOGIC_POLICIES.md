# Business Logic & Security Policies

## Cascade Delete Policy (Issue #29)

### User Deletion
When a user is deleted:
- **Soft delete** by default (set `isDeleted: true`)
- Sessions are revoked immediately
- Audit logs are **retained** for compliance
- Team invitations sent by user remain valid
- Company ownership must be transferred before deletion

### Company Deletion
When a company is deleted:
- **Requires admin approval**
- All users must be removed or transferred first
- Orders/shipments are **archived**, not deleted
- Financial records (invoices, remittances) are **retained**
- KYC documents are retained for 7 years (compliance)

### Data Retention
- Audit logs: **Permanent**
- Financial records: **7 years**
- User data: **90 days** after soft delete
- Session data: **Auto-cleanup** via TTL index

---

## Multi-Company Access Policy (Issue #30)

### Current Implementation
- Users belong to **ONE company** at a time
- `user.companyId` is the single source of truth
- Cross-company access requires admin role

### Access Control
```typescript
// Middleware enforces company scope
requireAccess({ companyMatch: true })

// Unified access checks company-specific KYC
if (user.companyId !== resource.companyId && user.role !== 'admin') {
  throw AuthorizationError('Company mismatch');
}
```

### Admin Privileges
- Admins can access **any company**
- Used for support and moderation
- All admin actions are **audit logged**

### Future Multi-Company Support
If multi-company is needed:
1. Change `companyId` to `companyIds: ObjectId[]`
2. Add `activeCompanyId` for current context
3. Update all middleware to check array membership
4. Add company switching endpoint

---

## KYC Access Control (Issue #31)

### Company-Specific KYC
- KYC is tied to **both user AND company**
- Schema: `{ userId, companyId, state: 'verified' }`
- Prevents cross-company KYC bypass

### Validation Flow
```typescript
// 1. Check global KYC status
if (!user.kycStatus?.isComplete) {
  return AccessTier.SANDBOX;
}

// 2. Check company-specific KYC (in requireAccess)
const kycRecord = await KYC.findOne({
  userId: user._id,
  companyId: user.companyId,
  state: KYCState.VERIFIED
});

if (!kycRecord && user.role !== 'admin') {
  throw Error('KYC required for current company');
}
```

### Edge Cases
- User switches companies → Must complete KYC again
- Company suspended → All users blocked
- KYC expired → Downgrade to SANDBOX tier

---

## Implementation Status

| Policy | Status | Location |
|--------|--------|----------|
| Cascade Delete | ✅ Documented | This file |
| Multi-Company | ✅ Single company enforced | `unified-access.ts` |
| KYC Access | ✅ Company-specific checks | `unified-access.ts:89-104` |
