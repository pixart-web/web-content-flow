# Beta Conversion Plan

## Conversion

Primary CTA is “Join the private beta”; secondary is “See how it works”. The CTA leads to a validated interest form, not public registration.

The form records name, work email, company/project, role, primary challenge, current tools, expected usage and explicit consent. It requests no generated content, credentials or confidential material.

## Safety

Server-side Zod validation, bounded fields, a honeypot, database-backed rate limiting and neutral results protect the endpoint. Duplicate emails update the existing interest record. No outbound automation or analytics provider is activated.

## Event contract

Future events: `marketing_cta_clicked`, `hero_demo_started`, `product_module_viewed`, `solution_viewed`, `beta_form_started`, `beta_form_submitted`, `contact_started`, `pricing_interest_clicked`.

Only route, CTA location, module/solution key and success state are allowed. Never send form values, email, free text, session identifiers, generated content or authentication data. Analytics remains disabled until configured with consent requirements.
