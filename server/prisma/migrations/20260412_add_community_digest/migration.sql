-- Register community digest job (runs Mondays at 8am)
INSERT INTO "job_runs" ("id", "job_name", "cron_expression", "enabled", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'send_community_digest', '0 8 * * 1', true, NOW(), NOW())
ON CONFLICT ("job_name") DO NOTHING;
