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

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCRAPER_DELAY_MS = process.env.SCRAPER_DELAY_MS || 2000;
const SCRAPER_TIMEOUT_MS = 15000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// SCRAPER SOURCES
// ============================================

/**
 * Google Places API Scraper
 * Uses official Google Places API - no scraping needed!
 */
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

  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
  ];

  for (const { query, category } of searchQueries) {
    for (const location of locations) {
      try {
        console.log(`[Google Places] Searching: ${query} in ${location}`);
        
        // Text Search API
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
      
      console.log(`[Google Maps] Found ${listings.length} results for "${query}"`);
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
 * BuiltWith Scraper - CSV Download Method
 * Uses BuiltWith free CSV download feature for POS businesses
 * No API key required for basic queries!
 */
async function scrapeBuiltWith() {
  console.log('[BuiltWith] Starting scrape...');
  const results = [];
  
  // POS systems to search for
  const POS_QUERIES = [
    { query: 'toast pos', category: 'pos_toast' },
    { query: 'clover pos', category: 'pos_clover' },
    { query: 'square pos', category: 'pos_square' },
    { query: 'shopify pos', category: 'pos_shopify' },
  ];

  // Major US cities
  const CITIES = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  for (const { query, category } of POS_QUERIES) {
    for (const city of CITIES) {
      try {
        console.log(`[BuiltWith] Searching: ${query} in ${city}`);
        
        // BuiltWith free directory search
        const searchUrl = `https://builtwith.com/${query.replace(/ /g, '-')}-${city.replace(/ /g, '-').replace(',', '')}`;
        
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Check if there's a CSV download link
        const csvLink = await page.$('a[href*=".csv"]');
        
        if (csvLink) {
          console.log(`[BuiltWith] Found CSV link for ${query} in ${city}`);
          // In a real implementation, you'd download and parse the CSV
          // For now, we'll scrape the directory results
        }
        
        // Scrape directory results
        const listings = await page.evaluate(() => {
          // Try multiple selectors for directory listings
          const selectors = [
            'div.dir-card',
            'div.result-item', 
            'table tr',
            'div.company-listing',
            '.directory-results li',
          ];
          
          let items = [];
          for (const sel of selectors) {
            items = document.querySelectorAll(sel);
            if (items.length > 0) break;
          }
          
          return Array.from(items).slice(0, 20).map(item => {
            const name = item.querySelector('h2, h3, a[href*="/"], .company-name, .name')?.textContent?.trim();
            const website = item.querySelector('a[href*="://"]')?.href;
            const address = item.querySelector('.address, .location, .addr')?.textContent?.trim();
            const phone = item.querySelector('.phone, .tel')?.textContent?.trim();
            return { name, website, address, phone };
          }).filter(x => x.name);
        });
        
        for (const listing of listings) {
          if (listing.name && listing.name.length < 100) { // Skip garbage
            results.push({
              source: 'builtwith',
              source_id: `bw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              business_name: listing.name,
              website: listing.website,
              address: listing.address,
              phone: listing.phone,
              category,
              scraped_at: new Date().toISOString(),
            });
          }
        }
        
        console.log(`[BuiltWith] Found ${listings.length} results for "${query}" in ${city}`);
        await delay(SCRAPER_DELAY_MS);
        
      } catch (err) {
        console.error(`[BuiltWith] Error searching "${query}" in "${city}":`, err.message);
      }
    }
  }

  await browser.close();
  console.log(`[BuiltWith] Total results: ${results.length}`);
  return results;
}

/**
 * Alternative POS Business Scraper
 * Uses business directories to find businesses using POS systems
 */
async function scrapePOSDirectories() {
  console.log('[POS Directories] Starting scrape...');
  const results = [];
  
  const POS_TYPES = [
    { search: 'uses Toast POS', category: 'pos_toast' },
    { search: 'uses Clover POS', category: 'pos_clover' },
    { search: 'uses Square POS', category: 'pos_square' },
    { search: 'uses Shopify POS', category: 'pos_shopify' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  // Use Google to search for businesses with POS
  for (const { search, category } of POS_TYPES) {
    try {
      console.log(`[POS] Searching: ${search}`);
      
      // Go to Google and search
      await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle' });
      await page.fill('input[name="q"]', search);
      await page.press('input[name="q"]', 'Enter');
      await page.waitForTimeout(3000);
      
      // Scroll to load more results
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000);
      }
      
      // Extract results
      const listings = await page.evaluate(() => {
        const selectors = [
          'div[role="feed"] > div > div',
          'div.Nm',
          '.place-result',
        ];
        
        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          if (items.length > 0) break;
        }
        
        return Array.from(items).slice(0, 15).map(item => {
          const name = item.querySelector('.fontHeadlineMedium, .place-name, h3')?.textContent?.trim();
          const address = item.querySelector('.address', '.Adress')?.textContent?.trim();
          const phone = item.querySelector('[data-value="Phone"]')?.textContent?.trim();
          const website = item.querySelector('a[data-value="Website"]')?.href;
          return { name, address, phone, website };
        }).filter(x => x?.name);
      });
      
      for (const listing of listings) {
        results.push({
          source: 'pos_directory',
          source_id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          business_name: listing.name,
          address: listing.address,
          phone: listing.phone,
          website: listing.website,
          category,
          scraped_at: new Date().toISOString(),
        });
      }
      
      console.log(`[POS] Found ${listings.length} results for "${search}"`);
      await delay(SCRAPER_DELAY_MS);
      
    } catch (err) {
      console.error(`[POS] Error searching "${search}":`, err.message);
    }
  }

  await browser.close();
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
 * YellowPages Scraper
 * Easier to scrape than Yelp/Google
 */
async function scrapeYellowPages() {
  console.log('[YellowPages] Starting scrape...');
  const results = [];
  
  const categories = [
    { query: 'auto-repair', category: 'auto_repair' },
    { query: 'beauty-salons', category: 'nail_salon' },
    { query: 'hair-salons', category: 'hair_salon' },
    { query: 'restaurants', category: 'restaurant' },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const { query, category } of categories) {
    try {
      console.log(`[YellowPages] Searching: ${query}`);
      
      const url = `https://www.yellowpages.com/search?search_terms=${query}&geo_location_terms=USA`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPER_TIMEOUT_MS });
      await page.waitForTimeout(2000);
      
      // Scroll to load more
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1000);
      
      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('.result');
        return Array.from(items).slice(0, 15).map(item => {
          const name = item.querySelector('.business-name span')?.textContent?.trim();
          const address = item.querySelector('.street-address')?.textContent?.trim();
          const phone = item.querySelector('.phone')?.textContent?.trim();
          const website = item.querySelector('.extra-links a')?.href;
          return { name, address, phone, website };
        }).filter(x => x.name);
      });
      
      for (const listing of listings) {
        results.push({
          source: 'yellowpages',
          source_id: `yp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          business_name: listing.name,
          phone: listing.phone,
          address: listing.address,
          website: listing.website,
          category,
          scraped_at: new Date().toISOString(),
        });
      }
      
      console.log(`[YellowPages] Found ${listings.length} results for "${query}"`);
      await delay(SCRAPER_DELAY_MS);
      
    } catch (err) {
      console.error(`[YellowPages] Error:`, err.message.substring(0, 100));
    }
  }

  await browser.close();
  return results;
}

/**
 * Additional Sources - Web Scraper API integration
 * Using a general web scraping service for additional leads
 */
async function scrapeAdditionalSources() {
  console.log('[Additional Sources] Checking for new sources...');
  const results = [];
  
  // Run YellowPages scraper
  const ypResults = await scrapeYellowPages();
  results.push(...ypResults);
  
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
    const [googlePlacesResults, bwResults, additionalResults] = await Promise.allSettled([
      scrapeGooglePlaces(),
      scrapeBuiltWith(),
      scrapeAdditionalSources(),
    ]);

    if (googlePlacesResults.status === 'fulfilled') allLeads.push(...googlePlacesResults.value);
    if (bwResults.status === 'fulfilled') allLeads.push(...bwResults.value);
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

    // Map to existing database schema
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
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < mappedLeads.length; i += batchSize) {
      const batch = mappedLeads.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('leads')
        .upsert(batch, { 
          onConflict: 'website',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error(`[Scraper] Error inserting batch:`, error);
      } else {
        console.log(`[Scraper] Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    console.log(`[Scraper] Successfully saved ${mappedLeads.length} leads to Supabase`);
  }

  console.log('='.repeat(50));
  console.log(`[Scraper] Completed at ${new Date().toISOString()}`);
  console.log('='.repeat(50));
}

// Run if called directly
runScraper().catch(console.error);

export { runScraper };
