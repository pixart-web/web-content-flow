# Production validation schemas

This directory will contain production Zod schemas introduced by feature phases. The files under `architecture/schemas/` remain reference specifications and are not production imports.

Shared branded IDs and provenance should move into a neutral shared schema module before domain schemas are implemented. Brand Profile must not depend conceptually on Content Item. AI adapter errors will be converted to application `Result` values at the service/job boundary.
