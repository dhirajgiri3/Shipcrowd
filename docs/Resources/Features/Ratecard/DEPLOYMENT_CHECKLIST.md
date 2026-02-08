# 🚀 RateCard Refactor Deployment Checklist

> Note (2026-02-08): Legacy pricing fields (baseRates, weightRules, zoneRules, zoneMultipliers) and migration scripts have been removed. Zone Pricing is now the only supported model.

## Pre-Deployment (Development)

### ✅ Code Review
- [x] All 5 critical fixes implemented
- [x] New zonePricing model added
- [x] Backward compatibility maintained
- [x] Seeder refactored
- [ ] Peer review completed
- [ ] Code merged to development branch

### ✅ Testing
- [ ] Run refactored seeder
  ```bash
  cd server
  npm run seed:23
  ```
- [ ] Verify rate cards created with zonePricing
- [ ] Test pricing calculation with new model
- [ ] Test pricing calculation with old model (backward compat)
- [ ] Test COD charges with various order values
- [ ] Test minimum fare (freight vs freight_overhead)
- [ ] Test zone B with both 'state' and 'distance' types
- [ ] Test rate card selection filters

### ✅ Data Validation
- [ ] Verify all rate cards have required fields
- [ ] Check version field: 'v2' for new, 'v1' for old
- [ ] Confirm codPercentage and codMinimumCharge exist
- [ ] Validate zonePricing structure
- [ ] Ensure old fields (baseRates, weightRules) are empty for new cards

---

## Staging Deployment

### Step 1: Database Backup
```bash
# Backup existing rate cards
mongodump --uri="$STAGING_MONGO_URI" --db=shipcrowd --collection=ratecards --out=./backup-$(date +%Y%m%d)

# Backup zones
mongodump --uri="$STAGING_MONGO_URI" --db=shipcrowd --collection=zones --out=./backup-$(date +%Y%m%d)
```

### Step 2: Deploy Code
```bash
# Pull latest code
git checkout staging
git pull origin staging

# Install dependencies
cd server && npm install
cd ../client && npm install

# Build
npm run build
```

### Step 3: Run Seeder
```bash
cd server
npm run seed:23

# Expected output:
# ✓ Cleared existing zones and rate cards
# ✓ Created 5 zones and 10 rate cards for [Company Name]
# ✅ Seeding completed successfully with NEW zone pricing model!
```

### Step 4: Smoke Tests
```bash
# Test 1: Verify new rate cards
mongo $STAGING_MONGO_URI
> db.ratecards.findOne({ version: 'v2' })
# Should have zonePricing field

# Test 2: API health check
curl https://staging.shipcrowd.com/api/v1/ratecards/health

# Test 3: Calculate pricing
curl -X POST https://staging.shipcrowd.com/api/v1/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "...",
    "fromPincode": "110001",
    "toPincode": "400001",
    "weight": 2.5,
    "paymentMode": "cod",
    "orderValue": 1500
  }'
# Should return pricing breakdown
```

### Step 5: Migration (If Migrating Old Cards)
```bash
# Run migration script
ts-node src/infrastructure/database/migrations/convert-ratecards-to-zone pricing-model.ts

# Expected output:
# [Migration] Found X rate cards to migrate
# [Migration] ✅ Migrated card_id_1
# [Migration] ✅ Migrated card_id_2
# [Migration] Complete! Success: X, Failed: 0, Skipped: 0
```

### Step 6: Validation
- [ ] All rate cards have zonePricing OR old model fields
- [ ] Pricing calculations return same results as before migration
- [ ] No 500 errors in application logs
- [ ] Performance metrics within acceptable range (<100ms for pricing)

---

## Production Deployment

### Pre-Production Checklist
- [ ] Staging tests passed for 48+ hours
- [ ] No critical bugs reported
- [ ] Performance benchmarks acceptable
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

### Step 1: Production Backup
```bash
# CRITICAL: Full database backup
mongodump --uri="$PROD_MONGO_URI" --db=shipcrowd --out=./prod-backup-$(date +%Y%m%d-%H%M)

# Verify backup
ls -lh prod-backup-*/

# Upload to S3/backup storage
aws s3 cp prod-backup-* s3://shipcrowd-backups/ratecard-refactor-$(date +%Y%m%d)/
```

### Step 2: Deployment Window
- [ ] Schedule maintenance window (optional, not required)
- [ ] Notify users if downtime expected
- [ ] Prepare rollback plan

### Step 3: Deploy Code
```bash
# Production deployment
git checkout production
git pull origin production

# Build
npm run build:production

# Deploy (adjust based on your deployment method)
pm2 restart shipcrowd-api
# OR
docker-compose up -d --build
# OR
kubectl rollout restart deployment/shipcrowd-api
```

### Step 4: Run Seeder (New Companies Only)
⚠️ **IMPORTANT:** Only run seeder for NEW companies, not existing ones!

```bash
# Option 1: Skip seeder if all companies already have rate cards
# Option 2: Modify seeder to only seed specific companies
cd server
npm run seed:23 -- --company-ids="new_company_id_1,new_company_id_2"
```

### Step 5: Migration (Existing Cards)
⚠️ **CRITICAL:** Test migration on subset first!

```bash
# Dry run first (doesn't actually update)
ts-node src/infrastructure/database/migrations/convert-ratecards-to-zone pricing-model.ts --dry-run

# Review output, then run for real
ts-node src/infrastructure/database/migrations/convert-ratecards-to-zone pricing-model.ts

# Monitor logs for errors
tail -f logs/migration.log
```

### Step 6: Monitoring
Monitor these metrics for 1 hour:

- [ ] Error rate < 0.1%
- [ ] Pricing calculation latency < 100ms (p95)
- [ ] No 500 errors related to rate cards
- [ ] Cache hit rate > 90%
- [ ] Database query time < 50ms

### Step 7: Validation
```bash
# Test pricing API
curl -X POST https://api.shipcrowd.com/api/v1/pricing/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check rate card health
curl https://api.shipcrowd.com/api/v1/admin/ratecards/stats

# Verify migration success
mongo $PROD_MONGO_URI
> db.ratecards.count({ zonePricing: { $exists: true } })
> db.ratecards.count({ version: 'v2' })
```

---

## Rollback Plan

### If Issues Found

#### Quick Rollback (Code Only)
```bash
# Revert to previous version
git checkout production
git reset --hard HEAD~1
git push -f origin production

# Redeploy
pm2 restart shipcrowd-api
```

#### Full Rollback (Code + Data)
```bash
# 1. Stop application
pm2 stop shipcrowd-api

# 2. Restore database backup
mongorestore --uri="$PROD_MONGO_URI" --db=shipcrowd --drop ./prod-backup-YYYYMMDD-HHMM/

# 3. Revert code
git checkout production
git reset --hard [PREVIOUS_COMMIT_SHA]
git push -f origin production

# 4. Restart application
pm2 start shipcrowd-api

# 5. Verify
curl https://api.shipcrowd.com/health
```

---

## Post-Deployment

### Day 1
- [ ] Monitor error logs every 2 hours
- [ ] Check pricing accuracy (compare sample calculations)
- [ ] Verify no performance degradation
- [ ] Collect user feedback (admins creating rate cards)

### Week 1
- [ ] Review all error logs
- [ ] Analyze performance metrics
- [ ] Check cache hit rates
- [ ] Gather feedback from users

### Week 2
- [ ] Document any issues found
- [ ] Plan UI updates for zonePricing
- [ ] Schedule migration of remaining old cards
- [ ] Update documentation

---

## Success Criteria

### Technical
✅ All rate cards working correctly
✅ Pricing calculations accurate (±1% of previous)
✅ Performance improved or maintained
✅ No critical bugs in 48 hours
✅ Error rate < 0.1%

### Business
✅ Admins can create rate cards successfully
✅ Pricing matches expectations
✅ No customer complaints about charges
✅ Migration completed without data loss

---

## Rollback Triggers

Immediately rollback if:
- ❌ Error rate > 5%
- ❌ Pricing calculation failures > 1%
- ❌ Database corruption detected
- ❌ Critical functionality broken
- ❌ Data loss detected

Consider rollback if:
- ⚠️ Performance degraded > 50%
- ⚠️ Cache hit rate dropped significantly
- ⚠️ Multiple customer complaints

---

## Team Contacts

### On-Call Rotation
- **Primary:** [Backend Lead]
- **Secondary:** [DevOps Lead]
- **Escalation:** [CTO]

### Communication Channels
- **Slack:** #deployments, #ratecard-refactor
- **Email:** engineering@shipcrowd.com
- **Phone:** Emergency hotline

---

## Documentation Updates

After successful deployment:
- [ ] Update API documentation
- [ ] Update admin user guide
- [ ] Update developer onboarding docs
- [ ] Mark old pricing logic as deprecated
- [ ] Schedule removal of old code (6 months)

---

## Notes

### Migration Statistics
Record these for future reference:
- Total rate cards migrated: ___
- Migration duration: ___
- Success rate: ___
- Issues encountered: ___

### Performance Baseline
Before refactor:
- Avg pricing calc time: ~150ms
- Error rate: ~0.5%
- Cache hit rate: ~75%

After refactor (target):
- Avg pricing calc time: <100ms
- Error rate: <0.1%
- Cache hit rate: >90%

---

**Prepared By:** Engineering Team
**Date:** 2026-02-08
**Version:** 1.0
**Status:** Ready for Staging Deployment
