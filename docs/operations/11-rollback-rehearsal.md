# Rollback Rehearsal

**Status:** NOT EXECUTED

Use two backward-compatible staging artifacts. Rehearse web rollback, worker restart on the compatible artifact, readiness, queue processing, and canonical-data integrity. Do not reverse the additive migration. Record artifact IDs, commands, timestamps, queue state, integrity result, owner and cleanup.

Blocker: no staging artifacts or deployment platform access.

