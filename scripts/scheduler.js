/**
 * Hightower Lead Scheduler
 * Runs the scraper daily at 8 AM Eastern Time
 * 
 * Usage: node scripts/scheduler.js
 * 
 * For production, use PM2 or systemd to keep it running:
 * pm2 start scripts/scheduler.js --name hightower-scheduler
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SCRAPER_HOUR = 8; // 8 AM
const SCRAPER_MINUTE = 0;
const TIMEZONE = 'America/New_York'; // Eastern Time

console.log('='.repeat(50));
console.log('[Scheduler] Hightower Lead Scraper Scheduler');
console.log(`[Scheduler] Running daily at ${SCRAPER_HOUR}:${String(SCRAPER_MINUTE).padStart(2, '0')} ${TIMEZONE}`);
console.log('='.repeat(50));

/**
 * Get next run time
 */
function getNextRun() {
  const now = new Date();
  const next = new Date(now);
  
  next.setHours(SCRAPER_HOUR, SCRAPER_MINUTE, 0, 0);
  
  // If we've passed today's time, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Format time until next run
 */
function formatTimeUntil(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * Run the scraper
 */
async function runScraper() {
  console.log(`\n[${new Date().toISOString()}] Starting scraper...`);
  
  return new Promise((resolve, reject) => {
    const scraper = spawn('node', ['scripts/scrape-leads.js'], {
      cwd: join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit'
    });

    scraper.on('close', (code) => {
      if (code === 0) {
        console.log(`[${new Date().toISOString()}] Scraper completed successfully`);
        resolve();
      } else {
        console.error(`[${new Date().toISOString()}] Scraper exited with code ${code}`);
        resolve(); // Don't reject - we want to keep running
      }
    });

    scraper.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Scraper error:`, err);
      resolve(); // Keep scheduler running
    });
  });
}

/**
 * Main scheduler loop
 */
async function main() {
  while (true) {
    const now = new Date();
    let nextRun = getNextRun();
    
    const msUntilRun = nextRun.getTime() - now.getTime();
    
    console.log(`\n[${now.toISOString()}] Next run: ${nextRun.toISOString()}`);
    console.log(`[${now.toISOString()}] Time until next run: ${formatTimeUntil(msUntilRun)}`);
    
    // Wait until next run time
    await new Promise(resolve => setTimeout(resolve, msUntilRun));
    
    // Run the scraper
    await runScraper();
    
    // Small delay to prevent immediate re-run
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Scheduler] Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Scheduler] Received SIGINT, shutting down...');
  process.exit(0);
});

// Start the scheduler
main().catch(err => {
  console.error('[Scheduler] Fatal error:', err);
  process.exit(1);
});
