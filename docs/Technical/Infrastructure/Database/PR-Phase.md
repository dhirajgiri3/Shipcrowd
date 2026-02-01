Phase PR Template
Phase: [Phase Number] - [Phase Name]

Summary
Brief description of what this phase accomplishes.

Changes Made
 Task P[X]-1: Description
 Task P[X]-2: Description
 Task P[X]-3: Description
Backward Compatibility
 All changes are backward compatible
 Feature flags added where needed
 Virtual fields added for renamed fields
 No destructive operations (field removal, hard deletes)
Migration Required
 No migration needed
 Migration script included: migrations/phase-[X]/[script-name].ts
 Migration tested on staging
 Rollback script prepared
Testing
 Unit tests added/updated
 Integration tests pass
 Manual testing completed on staging
 Performance benchmarks recorded
Database Changes
Models Modified:

model-name.model.ts - Added soft delete fields
another-model.model.ts - Added validation
Indexes Added:

ModelName: { field1: 1, field2: -1 }
Indexes Removed:

None (or list)
Feature Flags
 No feature flags needed
 Feature flag added: FEATURE_[FLAG_NAME]
 Flag tested in both ON and OFF states
 Flag documented in 
.env.example
Deployment Plan
Merge to refactor/mongodb-schema-standardization
Deploy to staging with feature flag OFF
Run migration script (if applicable)
Enable feature flag on staging
Verify for 24-48 hours
Merge to main (if backward compatible)
Deploy to production with flag OFF
Run migration on production
Enable flag on production
Monitor for 48 hours
Rollback Plan
If issues detected:

Disable feature flag immediately
Revert merge commit if needed
Restore from backup if data corruption
Rollback Commands:

# Feature flag rollback
kubectl set env deployment/Shipcrowd-api FEATURE_[FLAG_NAME]=false
# Code rollback
git revert -m 1 <merge-commit-hash>
# Data rollback
mongorestore --uri="$MONGODB_URI" --dir="/backup/phase_[X]_[timestamp]"
Verification Checklist
 All tests pass
 No TypeScript errors
 No linting errors
 Migration dry-run successful
 Staging deployment successful
 Production deployment successful
 Monitoring shows no errors
 Performance metrics within acceptable range
Reviewers
@[team-lead] @[database-expert] @[backend-lead]

Related Issues
Fixes #[issue-number] Part of #[epic-number]

Merge to main? [YES / NO / PARTIAL]

If YES: This phase is fully backward compatible and safe to merge.

If NO: This phase requires additional verification before merging to main.

If PARTIAL: Only merge non-destructive changes (specify which tasks).