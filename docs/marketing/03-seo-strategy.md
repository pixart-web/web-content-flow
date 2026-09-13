# SEO Strategy

Primary themes are content operations platform, content workflow software, brand-consistent content, marketing content system, AI content workflow, content planning platform and multi-channel content creation.

Every meaningful route has unique metadata and a canonical path. Root metadata provides Open Graph and Twitter cards. The sitemap contains only meaningful public routes and is empty unless `APP_ENV=production` and `MARKETING_INDEXING_ENABLED=true`.

Staging and all non-production environments disallow crawling. Application, API, auth reset and health routes remain excluded. The homepage emits truthful `SoftwareApplication` structured data without price, rating or customer claims.

Before enabling indexing: verify canonical production origin, legal approval, rendered metadata, sitemap response, robots response, 404 behavior and Search Console ownership.
