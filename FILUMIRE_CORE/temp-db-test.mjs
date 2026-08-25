import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  await pool.query(`
    INSERT INTO learning_evidence
    (id, learner_id, competency_id, source, outcome, timestamp,
     assessment_item_id, session_id, content_id, policy_version)
    VALUES
    ('debug-test-001', 'learner-test-001', 'competency-test-001',
     'assessment', 'correct', NOW(),
     'item-number-sequence-diagnostic-001',
     'session-test-001',
     'content-number-sequence-assessment-001',
     'assessment-0.1')
  `);

  console.log("INSERT SUCCESS");
} catch (error) {
  console.error("DATABASE ERROR:");
  console.error(error);
} finally {
  await pool.end();
}
