/**
 * Hightower Lead Scraper
 * Runs daily at 8 AM Eastern to scrape leads from various sources
 * 
 * Sources:
 * - Google Places/Maps (auto repair, nail & hair salons, restaurants)
 * - Yelp (restaurants, nail & hair salons)
 * - BuiltWith (Toast/Clover/Square POS businesses)
 * - FMCSA (trucking & transportation)
 * 
 * Usage: node scripts/scrape-leads.js
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import fetch from 'node:fetch';

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCRAPER_DELAY_MS = process.env.SCRAPER_DELAY_MS || 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// SCRAPER SOURCES
// ============================================

/**
 * Google Maps Scraper
 * Uses Playwright to scrape Google Maps for businesses
 */
async function scrapeGoogleMaps() {
  console.log('[Google Maps] Starting scrape...');
  const results = [];
  
  const searchQueries = [
    { query: 'auto repair near me', category: 'auto_repair' },
    { query: 'nail salon near me', category: 'nail_salon' },
    { query: 'hair salon near me', category: 'hair_salon' },
    { query: 'restaurant near me', category: 'restaurant' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  for (const { query, category } of searchQueries) {
    try {
      console.log(`[Google Maps] Searching: ${query}`);
      
      // Go to Google Maps
      await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle' });
      
      // Search
      await page.fill('input[name="q"]', query);
      await page.press('input[name="q"]', 'Enter');
      await page.waitForTimeout(3000);
      
      // Scroll to load more results
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          const container = document.querySelector('div[role="feed"]');
          if (container) container.scrollBy(0, 1000);
        });
        await page.waitForTimeout(1000);
      }
      
      // Extract results
      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('div[role="feed"] > div > div[class*="Nm"]');
        return Array.from(items).slice(0, 20).map(item => {
          const name = item.querySelector('div[class*="fontHeadline"]')?.textContent?.trim();
          const rating = item.querySelector('span[class*="rating"]')?.textContent?.trim();
          const address = item.querySelector('div[class*="address"]')?.textContent?.trim();
          const phone = item.querySelector('div[class*="phone"]')?.textContent?.trim();
          const website = item.querySelector('a[data-value="Website"]')?.href;
          return { name, rating, address, phone, website };
        }).filter(x => x.name);
      });
      
      for (const listing of listings) {
        results.push({
          source: 'google_maps',
          source_id: `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          business_name: listing.name,
          phone: listing.phone,
          address: listing.address,
          website: listing.website,
          category,
          rating: listing.rating,
          scraped_at: new Date().toISOString(),
        });
      }
      
      console.log(`[Google Maps] Found ${listings.length)} results for "${query}"`);
      await delay(SCRAPER_DELAY_MS);
      
    } catch (err) {
      console.error(`[Google Maps] Error searching "${query}":`, err.message);
    }
  }

  await browser.close();
  return results;
}

/**
 * Yelp Scraper
 */
async function scrapeYelp() {
  console.log('[Yelp] Starting scrape...');
  const results = [];
  
  const searchQueries = [
    { query: 'restaurants', category: 'restaurant' },
    { query: 'nail salons', category: 'nail_salon' },
    { query: 'hair salons', category: 'hair_salon' },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const { query, category } of searchQueries) {
    try {
      console.log(`[Yelp] Searching: ${query}`);
      
      const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=USA`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('div[data-testid="search-result"]');
        return Array.from(items).slice(0, 20).map(item => {
          const name = item.querySelector('h3[class*="title"]')?.textContent?.trim();
          const rating = item.querySelector('div[class*="rating"]')?.textContent?.trim();
          const address = item.querySelector('span[class*="address"]')?.textContent?.trim();
          const phone = item.querySelector('span[class*="phone"]')?.textContent?.trim();
          const website = item.querySelector('a[data-testid="business-url"]')?.href;
          return { name, rating, address, phone, website };
        }).filter(x => x.name);
      });
      
      for (const listing of listings) {
        results.push({
          source: 'yelp',
          source_id: `yelp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          business_name: listing.name,
          phone: listing.phone,
          address: listing.address,
          website: listing.website,
          category,
          rating: listing.rating,
          scraped_at: new Date().toISOString(),
        });
      }
      
      console.log(`[Yelp] Found ${listings.length} results for "${query}"`);
      await delay(SCRAPER_DELAY_MS);
      
    } catch (err) {
      console.error(`[Yelp] Error searching "${query}":`, err.message);
    }
  }

  await browser.close();
  return results;
}

/**
 * BuiltWith Scraper
 * Note: BuiltWith requires API key for full access
 * This is a simplified version that demonstrates the integration
 */
async function scrapeBuiltWith() {
  console.log('[BuiltWith] Starting scrape...');
  const results = [];
  
  const POS_SYSTEMS = ['toast', 'clover', 'square'];
  const MAJOR_CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  
  const BUILTWITH_API_KEY = process.env.BUILTWITH_API_KEY;
  
  if (!BUILTWITH_API_KEY) {
    console.log('[BuiltWith] API key not configured, skipping...');
    return results;
  }

  for (const pos of POS_SYSTEMS) {
    for (const city of MAJOR_CITIES) {
      try {
        console.log(`[BuiltWith] Searching: ${pos} in ${city}`);
        
        const response = await fetch(
          `https://api.builtwith.com/v19/api.json?KEY=${BUILTWITH_API_KEY}&LOOKUP=${pos}&NEGATIVE=&BEST=yes&GROUPS=2&TOP=&MARKET=${city}`,
          { headers: { 'Accept': 'application/json' } }
        );
        
        const data = await response.json();
        
        if (data.Results?.[0]?.Rows) {
          for (const row of data.Results[0].Rows.slice(0, 20)) {
            results.push({
              source: 'builtwith',
              source_id: `bw_${row.Id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              business_name: row.Name,
              website: row.Domain,
              address: `${row.City || ''}, ${row.State || ''}`,
              category: `pos_${pos}`,
              tech_stack: row.Technologies?.map(t => t.Name).join(', '),
              scraped_at: new Date().toISOString(),
            });
          }
        }
        
        console.log(`[BuiltWith] Found ${results.length} results for ${pos} in ${city}`);
        await delay(SCRAPER_DELAY_MS);
        
      } catch (err) {
        console.error(`[BuiltWith] Error: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * FMCSA Scraper
 * Scrapes FMCSA database for trucking companies
 */
async function scrapeFMCSA() {
  console.log('[FMCSA] Starting scrape...');
  const results = [];
  
  const searchTerms = [
    'trucking',
    'transportation',
    'freight',
    'truck driver',
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const term of searchTerms) {
    try {
      console.log(`[FMCSA] Searching: ${term}`);
      
      // FMCSA search page
      await page.goto('https://www.fmcsa.dot.gov/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Note: FMCSA has anti-scraping measures, this is a simplified approach
      // In production, you may need to use their API or data broker services
      
      console.log(`[FMCSA] Manual review needed for "${term}"`);
      
    } catch (err) {
      console.error(`[FMCSA] Error searching "${term}":`, err.message);
    }
  }

  await browser.close();
  
  // For now, return empty - FMCSA requires API access
  return results;
}

/**
 * Additional Sources - Web Scraper API integration
 * Using a general web scraping service for additional leads
 */
async function scrapeAdditionalSources() {
  console.log('[Additional Sources] Checking for new sources...');
  const results = [];
  
  // Add more sources here as needed
  // Examples:
  // - YellowPages
  // - BBB (Better Business Bureau)
  // - Manta
  // - Localeze
  
  return results;
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================

async function runScraper() {
  console.log('='.repeat(50));
  console.log(`[Scraper] Starting at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  const allLeads = [];

  // Run all scrapers
  try {
    const [gmResults, yelpResults, bwResults, fmcsResults, additionalResults] = await Promise.allSettled([
      scrapeGoogleMaps(),
      scrapeYelp(),
      scrapeBuiltWith(),
      scrapeFMCSA(),
      scrapeAdditionalSources(),
    ]);

    if (gmResults.status === 'fulfilled') allLeads.push(...gmResults.value);
    if (yelpResults.status === 'fulfilled') allLeads.push(...yelpResults.value);
    if (bwResults.status === 'fulfilled') allLeads.push(...bwResults.value);
    if (fmcsResults.status === 'fulfilled') allLeads.push(...fmcsResults.value);
    if (additionalResults.status === 'fulfilled') allLeads.push(...additionalResults.value);

  } catch (err) {
    console.error('[Scraper] Critical error:', err);
  }

  // Deduplicate and save to Supabase
  console.log(`[Scraper] Total leads collected: ${allLeads.length}`);

  if (allLeads.length > 0) {
    // Deduplicate by website/domain
    const seen = new Set();
    const uniqueLeads = allLeads.filter(lead => {
      if (!lead.website) return true; // Keep leads without website
      const domain = lead.website.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    });

    console.log(`[Scraper] Unique leads after dedup: ${uniqueLeads.length}`);

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < uniqueLeads.length; i += batchSize) {
      const batch = uniqueLeads.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('leads')
        .upsert(batch, { 
          onConflict: 'source,source_id',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error(`[Scraper] Error inserting batch:`, error);
      } else {
        console.log(`[Scraper] Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    console.log(`[Scraper] Successfully saved ${uniqueLeads.length} leads to Supabase`);
  }

  console.log('='.repeat(50));
  console.log(`[Scraper] Completed at ${new Date().toISOString()}`);
  console.log('='.repeat(50));
}

// Run if called directly
runScraper().catch(console.error);

export { runScraper };
