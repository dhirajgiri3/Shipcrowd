const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

async function checkFailedJobs() {
  const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });

  const queue = new Queue('shopify-webhook-processor', { connection });

  console.log('🔍 Checking failed jobs...\n');

  const failed = await queue.getFailed(0, 10);

  console.log(`Found ${failed.length} failed jobs\n`);

  for (const job of failed) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Job ID:', job.id);
    console.log('Job Name:', job.name);
    console.log('Data:', JSON.stringify(job.data, null, 2));
    console.log('Failed Reason:', job.failedReason);
    console.log('Stack Trace:', job.stacktrace ? job.stacktrace.join('\n') : 'N/A');
    console.log('');
  }

  await connection.quit();
  process.exit(0);
}

checkFailedJobs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
