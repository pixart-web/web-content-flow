# Analytics Events

## Privacy rules

Use pseudonymous account/project/item IDs, enum values, timestamps/durations, counts, mode, route, status, schema version, and safe error category. Never send email, name, API key, full brief, competitors/references, generated content, edit text, raw prompts/provider payloads, or export file bodies. Free-text search/query tracking is off by default.

| Event | Trigger | Safe properties | Prohibited properties | Validation purpose |
|---|---|---|---|---|
| `account_created` | provider confirms account | auth method=`email`, verification_required | email/password | acquisition |
| `sign_in_completed` | session established | return_route_class, success | credentials | auth reliability |
| `project_creation_started` | wizard opens | source, mode | entered fields | funnel |
| `wizard_step_completed` | valid Continue | step_id, optional_field_count, duration | field values | abandonment |
| `project_created` | durable project created | project_type enum, module_count, mode | names/descriptions | activation |
| `brand_profile_generation_started` | job accepted | job_id, mode, brief_schema_version | brief | generation funnel |
| `brand_profile_generation_completed` | valid version saved | duration, repair_count, profile_schema_version | profile content | reliability |
| `brand_profile_generation_failed` | terminal failure | safe_error_category, stage, duration | provider payload | recovery/quality |
| `module_generation_started` | module job accepted | module, job_id, requested_item_count, mode | generation inputs | module demand |
| `module_generation_completed` | valid items saved | module, item_count, duration, partial=false/true | item bodies | completion |
| `module_generation_failed` | terminal module/scope failure | module, safe_error_category, completed_count | payload/content | reliability |
| `content_item_opened` | canonical item viewed | module, item_type, source_route | title/body | usage |
| `content_item_edited` | new edited version saved | module, field_count_changed, duration | old/new text | usefulness |
| `content_item_copied` | clipboard success | module, scope=field/item | copied content | usage |
| `content_item_regenerated` | new version saved | module, scope, duration, profile_version_relation | instruction/content | control usage |
| `version_restored` | restored snapshot saved current | module, source_version_age_bucket | preview/body | recovery |
| `export_started` | export accepted | scope, format, item_count, mock_included | bodies/filename if sensitive | handoff |
| `export_completed` | file/copy ready | format, item_count, duration | file body | completion |
| `export_failed` | terminal failure | format, safe_error_category | raw exception/content | reliability |
| `mock_mode_used` | first mock job/session | scope/module | fixture content | mock adoption |
| `project_returned_to` | existing project meaningful view | days_since_last_activity_bucket, next_action_type | project name | retention |
| `add_module_selected` | Add module chosen | module, source_route | project context | expansion |

## Event quality

Events fire once on durable outcome, not button click and completion under the same name. Validate enum allowlists and property stripping. Internal/demo accounts are marked by safe account classification outside content. Analytics failures never block product actions.

Related: [Success Metrics](../10-success-metrics.md) and [UX Acceptance](28-ux-acceptance-checklist.md).
