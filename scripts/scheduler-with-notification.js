/**
 * Hightower Lead Scraper Scheduler
 * Runs daily at 8 AM Eastern Time + sends Telegram notification
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import fetch from 'node-fetch';

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_IO_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const SCRAPER_DELAY_MS = 2000;
const SCRAPER_TIMEOUT_MS = 15000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// SCRAPER FUNCTIONS (same as scrape-leads.js)
// ============================================

async function scrapeGooglePlaces() {
  console.log('[Google Places API] Starting scrape...');
  const results = [];
  
  if (!GOOGLE_API_KEY) {
    console.log('[Google Places API] No API key, skipping...');
    return results;
  }

  const searchQueries = [
    { query: 'auto repair', category: 'auto_repair' },
    { query: 'nail salon', category: 'nail_salon' },
    { query: 'hair salon', category: 'hair_salon' },
    { query: 'restaurant', category: 'restaurant' },
  ];

  const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ'];

  for (const { query, category } of searchQueries) {
    for (const location of locations) {
      try {
        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + location)}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(textSearchUrl);
        const data = await response.json();
        
        if (data.results) {
          for (const place of data.results.slice(0, 20)) {
            results.push({
              source: 'google_places',
              source_id: place.place_id,
              business_name: place.name,
              address: place.formatted_address,
              phone: place.formatted_phone_number,
              website: place.website,
              category,
              rating: place.rating,
              scraped_at: new Date().toISOString(),
            });
          }
          console.log(`[Google Places] Found ${data.results.length} results for "${query}" in ${location}`);
        }
        await delay(SCRAPER_DELAY_MS);
      } catch (err) {
        console.error(`[Google Places] Error:`, err.message);
      }
    }
  }
  return results;
}

async function scrapeBuiltWith() {
  console.log('[BuiltWith] Starting scrape...');
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const POS_QUERIES = [
    { query: 'toast pos', category: 'pos_toast' },
    { query: 'clover pos', category: 'pos_clover' },
    { query: 'square pos', category: 'pos_square' },
  ];
  const CITIES = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ'];

  for (const { query, category } of POS_QUERIES) {
    for (const city of CITIES) {
      try {
        const searchUrl = `https://builtwith.com/${query.replace(/ /g, '-')}-${city.replace(/ /g, '-').replace(',', '')}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        const listings = await page.evaluate(() => {
          const items = document.querySelectorAll('div.dir-card, div.result-item, table tr, div.company-listing');
          return Array.from(items).slice(0, 10).map(item => {
            const name = item.querySelector('h2, h3, a')?.textContent?.trim();
            const website = item.querySelector('a[href*="://"]')?.href;
            return { name, website };
          }).filter(x => x.name);
        });
        
        for (const listing of listings) {
          if (listing.name && listing.name.length < 100) {
            results.push({
              source: 'builtwith',
              source_id: `bw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              business_name: listing.name,
              website: listing.website,
              category,
              scraped_at: new Date().toISOString(),
            });
          }
        }
        console.log(`[BuiltWith] Found ${listings.length} results for "${query}" in ${city}`);
      } catch (err) {
        console.error(`[BuiltWith] Error:`, err.message.substring(0, 100));
      }
    }
  }
  await browser.close();
  return results;
}

// ============================================
// ENRICHMENT FUNCTIONS
// ============================================

async function enrichLeadsWithHunter() {
  console.log('[Hunter] Starting enrichment...');
  
  if (!HUNTER_API_KEY) {
    console.log('[Hunter] No API key, skipping enrichment...');
    return { enriched: 0, failed: 0 };
  }

  // Get leads that need enrichment (no email)
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, business_name, website')
    .or('email.is.null,email.eq.')
    .limit(100);

  if (error || !leads?.length) {
    console.log('[Hunter] No leads need enrichment');
    return { enriched: 0, failed: 0 };
  }

  let enriched = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const domain = lead.website?.replace(/^https?:\/\//, '').split('/')[0];
      if (!domain) continue;

      const response = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&limit=1`, {
        headers: { 'Authorization': `Bearer ${HUNTER_API_KEY}` }
      });
      const data = await response.json();

      if (data.data?.emails?.[0]) {
        const email = data.data.emails[0].value;
        const owner = data.data.emails[0].first_name + ' ' + data.data.emails[0].last_name;

        await supabase
          .from('leads')
          .update({ email, owner_name: owner, enriched_date: new Date().toISOString() })
          .eq('id', lead.id);

        enriched++;
        console.log(`[Hunter] Enriched: ${lead.business_name} - ${email}`);
      } else {
        failed++;
      }

      await delay(1000); // Rate limiting
    } catch (err) {
      console.error(`[Hunter] Error:`, err.message);
      failed++;
    }
  }

  console.log(`[Hunter] Enriched: ${enriched}, Failed: ${failed}`);
  return { enriched, failed };
}

// ============================================
// TELEGRAM NOTIFICATION
// ============================================

async function sendTelegramNotification(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[Telegram] No bot token or chat ID, skipping notification');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    console.log('[Telegram] Notification sent');
  } catch (err) {
    console.error('[Telegram] Error:', err.message);
  }
}

// ============================================
// MAIN RUN FUNCTION
// ============================================

async function runScraperAndEnrich() {
  console.log('='.repeat(50));
  console.log(`[Scheduler] Starting at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  let totalLeads = 0;
  let enrichedCount = 0;

  try {
    // Run scrapers
    const [googleResults, builtwithResults] = await Promise.allSettled([
      scrapeGooglePlaces(),
      scrapeBuiltWith(),
    ]);

    const allLeads = [];
    if (googleResults.status === 'fulfilled') allLeads.push(...googleResults.value);
    if (builtwithResults.status === 'fulfilled') allLeads.push(...builtwithResults.value);

    // Deduplicate
    const seen = new Set();
    const uniqueLeads = allLeads.filter(lead => {
      if (!lead.website) return true;
      const domain = lead.website.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    });

    console.log(`[Scheduler] Total unique leads: ${uniqueLeads.length}`);

    // Save to Supabase
    if (uniqueLeads.length > 0) {
      const mappedLeads = uniqueLeads.map(lead => ({
        business_name: lead.business_name,
        phone: lead.phone,
        website: lead.website,
        address: lead.address,
        source: lead.source,
        source_id: lead.source_id,
        city: lead.address?.split(',')[0] || null,
        state: lead.address?.split(',')[1]?.trim() || null,
        rating: lead.rating,
        status: 'New',
        scraped_date: lead.scraped_at ? lead.scraped_at.split('T')[0] : new Date().toISOString().split('T')[0],
        category: lead.category,
      }));

      const { error } = await supabase.from('leads').insert(mappedLeads);
      if (error) {
        console.error('[Scheduler] Error inserting leads:', error.message);
      } else {
        totalLeads = mappedLeads.length;
        console.log(`[Scheduler] Saved ${totalLeads} leads`);
      }
    }

    // Enrich leads
    const enrichmentResult = await enrichLeadsWithHunter();
    enrichedCount = enrichmentResult.enriched;

  } catch (err) {
    console.error('[Scheduler] Critical error:', err);
  }

  // Send notification
  const message = `🎯 <b>Daily Lead Scraper Complete</b>

📊 New leads found: ${totalLeads}
✉️ Leads enriched: ${enrichedCount}
⏰ Time: ${new Date().toISOString()}

#Hightower #Leads`;

  await sendTelegramNotification(message);

  console.log('='.repeat(50));
  console.log(`[Scheduler] Completed`);
  console.log('='.repeat(50));
}

// ============================================
// SCHEDULER
// ============================================

function getNextRun() {
  const now = new Date();
  const next = new Date(now);
  
  // 8 AM Eastern
  next.setHours(13, 0, 0, 0); // 8 AM ET = 13:00 UTC
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

async function main() {
  console.log('🚀 Hightower Scheduler Started');
  console.log(`⏰ Running daily at 8 AM Eastern`);

  while (true) {
    const now = new Date();
    let nextRun = getNextRun();
    const msUntilRun = nextRun.getTime() - now.getTime();
    
    console.log(`\n[${now.toISOString()}] Next run: ${nextRun.toISOString()}`);
    console.log(`[${now.toISOString()}] Sleeping ${Math.round(msUntilRun / 1000 / 60)} minutes...`);
    
    await new Promise(resolve => setTimeout(resolve, msUntilRun));
    
    await runScraperAndEnrich();
    
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

main().catch(console.error);
