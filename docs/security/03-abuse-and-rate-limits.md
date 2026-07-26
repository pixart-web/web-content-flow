# Abuse and Rate Limits

Rate limits are server-enforced per action and HMAC-hashed subject dimensions. Raw IPs and email addresses are not stored in buckets. Authentication, password recovery, generation, and export have separate bounded policies; plan usage limits remain an additional control.

Responses should be neutral and avoid confirming account or resource existence. Invalid AI inputs are not retried. Paid provider retries are bounded. Public registration and real generation can be disabled independently during abuse.

Monitor rejection rate, distinct hashed subjects, provider quota/rate errors, unusual export volume, and repeated authorization failures without logging content. Distributed attacks may require a managed edge/WAF after a hosting vendor is selected.
