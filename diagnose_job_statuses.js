// diagnose_job_statuses.js
// Finds all invalid/unexpected/garbage status values in the jobs table

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oqwvbwaqcdbggcqvzswv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
);

// These are the VALID statuses in our system
const VALID_STATUSES = new Set([
  'booking_request',
  'assigned',
  'in-progress',
  'quotation-sent',
  'spare-part-needed',
  'spare-part-ordered',
  'completed',
  'cancelled',
  'rejected',
  'closed',
  'enquiry',       // legacy, may exist
  'pending',       // legacy, may exist
  'open',          // legacy, may exist
]);

async function diagnose() {
  console.log('='.repeat(60));
  console.log('  JOB STATUS DIAGNOSTIC REPORT');
  console.log('='.repeat(60));

  // 1. Fetch ALL jobs (just id, status, job_number, customer_name, created_at)
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, status, customer_name, created_at, source, technician_name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch jobs:', error.message);
    process.exit(1);
  }

  console.log(`\n📦 Total jobs in database: ${jobs.length}\n`);

  // 2. Count each status value
  const statusCounts = {};
  const garbageJobs = [];
  const nullStatusJobs = [];
  const legacyJobs = [];

  const KNOWN_VALID = ['booking_request', 'assigned', 'in-progress', 'quotation-sent', 'completed', 'cancelled'];
  const KNOWN_LEGACY = ['pending', 'open', 'enquiry', 'spare-part-needed', 'spare-part-ordered', 'rejected', 'closed'];

  // UUID pattern
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const job of jobs) {
    const s = job.status;

    // Count
    statusCounts[s || 'NULL'] = (statusCounts[s || 'NULL'] || 0) + 1;

    // Classify
    if (!s || s.trim() === '') {
      nullStatusJobs.push(job);
    } else if (UUID_RE.test(s)) {
      // Status was set to a UUID (the drag-and-drop bug)
      garbageJobs.push({ ...job, reason: 'Status is a UUID (drag-and-drop bug)' });
    } else if (!KNOWN_VALID.includes(s) && !KNOWN_LEGACY.includes(s)) {
      // Unknown string entirely
      garbageJobs.push({ ...job, reason: `Unknown status value: "${s}"` });
    } else if (KNOWN_LEGACY.includes(s)) {
      legacyJobs.push(job);
    }
  }

  // 3. Print status distribution
  console.log('─'.repeat(60));
  console.log('STATUS DISTRIBUTION (all jobs):');
  console.log('─'.repeat(60));

  const sorted = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  for (const [status, count] of sorted) {
    const isValid = KNOWN_VALID.includes(status);
    const isLegacy = KNOWN_LEGACY.includes(status);
    const isGarbage = !isValid && !isLegacy && status !== 'NULL';
    const isNull = status === 'NULL';

    const tag = isValid ? '✅' : isLegacy ? '⚠️ ' : isNull ? '🔴' : '❌';
    const label = isValid ? '(valid)' : isLegacy ? '(legacy)' : isNull ? '(NULL!)' : '(GARBAGE!)';

    console.log(`  ${tag} ${String(status).padEnd(30)} ${String(count).padStart(4)} jobs  ${label}`);
  }

  // 4. Print garbage jobs detail
  if (garbageJobs.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log(`❌ GARBAGE STATUS JOBS (${garbageJobs.length} found):`);
    console.log('─'.repeat(60));
    for (const job of garbageJobs) {
      console.log(`\n  Job ID:       ${job.id}`);
      console.log(`  Job Number:   ${job.job_number || 'N/A'}`);
      console.log(`  Customer:     ${job.customer_name || 'Unknown'}`);
      console.log(`  Status:       "${job.status}"`);
      console.log(`  Reason:       ${job.reason}`);
      console.log(`  Created:      ${job.created_at}`);
      console.log(`  Source:       ${job.source || 'N/A'}`);
    }
  } else {
    console.log('\n✅ No garbage status values found.');
  }

  // 5. Print NULL status jobs
  if (nullStatusJobs.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log(`🔴 NULL STATUS JOBS (${nullStatusJobs.length} found):`);
    console.log('─'.repeat(60));
    for (const job of nullStatusJobs) {
      console.log(`\n  Job ID:      ${job.id}`);
      console.log(`  Job Number:  ${job.job_number || 'N/A'}`);
      console.log(`  Customer:    ${job.customer_name || 'Unknown'}`);
      console.log(`  Created:     ${job.created_at}`);
    }
  } else {
    console.log('\n✅ No NULL status jobs found.');
  }

  // 6. Print legacy jobs
  if (legacyJobs.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log(`⚠️  LEGACY STATUS JOBS (${legacyJobs.length} found — need migration):`);
    console.log('─'.repeat(60));
    for (const job of legacyJobs) {
      console.log(`  ⚠️  [${(job.status || '').padEnd(20)}]  #${(job.job_number || 'N/A').padEnd(12)}  ${job.customer_name || 'Unknown'}`);
    }
  } else {
    console.log('\n✅ No legacy status jobs found.');
  }

  // 7. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log(`  Total jobs:      ${jobs.length}`);
  console.log(`  ✅ Valid:         ${jobs.filter(j => KNOWN_VALID.includes(j.status)).length}`);
  console.log(`  ⚠️  Legacy:        ${legacyJobs.length}`);
  console.log(`  ❌ Garbage:       ${garbageJobs.length}`);
  console.log(`  🔴 NULL status:   ${nullStatusJobs.length}`);
  console.log(`  🛠️  Need fix:      ${legacyJobs.length + garbageJobs.length + nullStatusJobs.length}`);
  console.log('='.repeat(60));
}

diagnose().catch(console.error);
