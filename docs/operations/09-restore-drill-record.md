# Restore Drill Record

**Status:** NOT EXECUTED — managed staging database and backup do not exist.

| Field | Evidence |
|---|---|
| Provider / backup policy / PITR window | UNVERIFIED |
| Backup reference / latest backup | UNVERIFIED |
| Restore start / completion / duration | NOT EXECUTED |
| Isolated restored database | NOT CREATED |
| Operator / date | |
| `pnpm restore:verify` | local synthetic database passed; staging restore not run |
| Canonical record checks | UNVERIFIED |
| Problems / cleanup | |

The drill must restore to a new database, disable web/worker/email/AI access, run the read-only verifier and relational checks, then delete or retain the isolated database according to the recorded policy.

