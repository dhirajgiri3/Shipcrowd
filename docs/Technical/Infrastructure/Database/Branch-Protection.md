Branch Protection & Merge Policy
Project: MongoDB Schema Standardization
Applies to: main, refactor/mongodb-schema-standardization, phase-*, task/*

Branch Protection Rules
main Branch
Purpose: Production-ready code, always deployable

Protection Rules:

✅ Require pull request before merging
✅ Require 2 approving reviews
✅ Dismiss stale pull request approvals when new commits are pushed
✅ Require review from Code Owners
✅ Require status checks to pass before merging:
lint-and-typecheck
unit-tests
schema-validation
backward-compatibility
✅ Require branches to be up to date before merging
✅ Require conversation resolution before merging
❌ Do not allow bypassing the above settings
❌ Do not allow force pushes
❌ Do not allow deletions
Code Owners:

# CODEOWNERS file
*.model.ts @backend-lead @database-expert
*migration* @backend-lead @database-expert @devops-lead
refactor/mongodb-schema-standardization Branch
Purpose: Integration branch for all schema refactor work

Protection Rules:

✅ Require pull request before merging
✅ Require 1 approving review
✅ Require status checks to pass:
lint-and-typecheck
unit-tests
schema-validation
migration-dry-run
⚠️ Allow force pushes (for rebasing phase branches if needed)
❌ Do not allow deletions
phase-* Branches
Purpose: Phase-level execution branches

Protection Rules:

✅ Require pull request before merging to refactor branch
✅ Require 1 approving review
✅ Require status checks to pass
✅ Allow force pushes (for task branch rebasing)
✅ Allow deletions (after merge)
task/* Branches
Purpose: Task-level implementation branches

Protection Rules:

⚠️ No protection (developer freedom)
✅ Require CI to pass before merge to phase branch
✅ Allow force pushes
✅ Allow deletions (after merge)
Merge Approval Criteria
Merging to refactor/mongodb-schema-standardization
Required Approvals: 1 from backend team

Checklist:

 All tasks in phase complete
 All tests passing
 No TypeScript errors
 No linting errors
 Migration scripts tested (if applicable)
 Rollback scripts prepared
 Documentation updated
Approval Template:

✅ Approved for merge to refactor branch
Phase: [Phase Number]
Tasks completed: [X/Y]
Tests: ✅ Passing
Migration: ✅ Tested / ⚠️ Not applicable
Rollback: ✅ Prepared
Ready to proceed.
Merging to main
Required Approvals: 2 from [backend-lead, database-expert, devops-lead]

Checklist:

 Backward compatible OR feature-flagged
 All tests passing
 Staging deployment successful
 Migration tested on staging (if applicable)
 Performance benchmarks acceptable
 No destructive changes (or properly gated)
 Rollback plan documented
 Monitoring dashboards configured
Approval Template:

✅ Approved for merge to main
Phase: [Phase Number]
Backward Compatible: ✅ Yes / ⚠️ Feature-flagged
Staging Verification: ✅ Passed
Migration: ✅ Tested / ⚠️ Not applicable
Performance: ✅ Acceptable (baseline: X, current: Y)
Rollback: ✅ Documented
Safe to deploy to production.
Merge Timing & Coordination
Progressive Merge Schedule
Week	Phase	Merge to Refactor	Merge to Main	Deployment
0	Phase 0	End of week	Immediately	Staging → Prod
1-2	Phase 1	End of week 2	After staging verification	Staging → Prod
3	Phase 2 (Part 1)	End of week 3	With flag OFF	Staging only
4	Phase 2 (Part 2)	End of week 4	Hold	Staging only
5	Phase 3 (Part 1)	End of week 5	With flag OFF	Staging → Prod
6	Phase 3 (Part 2)	End of week 6	After encryption test	Staging only
7	Phase 4	End of week 7	Immediately	Staging → Prod
7	Phase 5 (Part 1)	End of week 7	Hold	Staging only
8	Phase 5 (Part 2)	End of week 8	With flag ON	Staging → Prod
8	Phase 6 (Part 1)	End of week 8	With flag OFF	Staging → Prod
8+	Phase 6 (Part 2)	Week 10	After 2-week soak	Staging → Prod
Deployment Gates
Gate 1: Pre-Merge to Refactor Branch
✅ All phase tasks complete
✅ CI passing
✅ Code review approved
Gate 2: Pre-Merge to Main
✅ Staging deployment successful
✅ Migration tested (if applicable)
✅ Backward compatibility verified
✅ 2 approvals from senior engineers
Gate 3: Pre-Production Deployment
✅ Merged to main
✅ Feature flags configured
✅ Rollback plan ready
✅ On-call rotation confirmed
✅ Monitoring dashboards ready
Gate 4: Feature Flag Enablement
✅ Deployed to production
✅ Migration completed (if applicable)
✅ No errors in logs (24h)
✅ Performance metrics stable
Emergency Procedures
Fast-Track Merge (Hotfix)
When: Critical bug in refactor branch blocking progress

Process:

Create hotfix/[description] branch from affected branch
Fix issue
Get 1 approval (waive 2-approval requirement)
Merge immediately
Post-merge review within 24h
Emergency Rollback
When: Production incident caused by schema change

Process:

Immediate: Disable feature flag
kubectl set env deployment/Shipcrowd-api FEATURE_[NAME]=false
Within 15 min: Verify incident resolved
Within 1 hour: Revert merge commit if flag disable insufficient
git revert -m 1 <merge-commit-hash>
git push
Within 4 hours: Restore from backup if data corruption
mongorestore --uri="$MONGODB_URI" --dir="/backup/[timestamp]"
Within 24 hours: Root cause analysis and fix
Conflict Resolution
Merge Conflicts with main
Scenario: Feature work on main conflicts with refactor branch

Resolution:

Pause refactor branch merges
Merge main into refactor/mongodb-schema-standardization
Resolve conflicts
Re-run full test suite
Get re-approval if significant changes
Resume normal merge schedule
Conflicting Phase Branches
Scenario: Two phase branches modify the same model

Resolution:

Merge earlier phase first
Rebase later phase on refactor branch
Resolve conflicts
Re-test later phase
Proceed with merge
Review Responsibilities
Role	Responsibilities	Required for Merge to Main
Backend Lead	Code quality, architecture, backward compatibility	✅ Required
Database Expert	Schema design, migration safety, performance	✅ Required
DevOps Lead	Deployment strategy, rollback procedures	⚠️ Recommended
QA Lead	Test coverage, staging verification	⚠️ Recommended
Metrics & Monitoring
Required Metrics Before Merge to Main
 Test coverage ≥ 80% for modified files
 No increase in error rate on staging
 Query performance within 10% of baseline
 Memory usage stable
 No new security vulnerabilities
Post-Merge Monitoring (48 hours)
 Error rate < 0.1%
 P95 latency < baseline + 20%
 No database deadlocks
 No data integrity issues
 Feature flag toggle working
Documentation Requirements
Before Merge to Main
 Migration guide updated
 API documentation updated (if applicable)
 Environment variables documented in 
.env.example
 Rollback procedures documented
 Known issues documented
Last Updated: 2026-01-16
Next Review: After Phase 1 completion