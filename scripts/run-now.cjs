/**
 * Run scraper once + enrich + notify
 */

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_IO_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const SCRAPER_DELAY_MS = 2000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeGooglePlaces() {
  console.log('[Google Places] Starting...');
  const results = [];
  
  if (!GOOGLE_API_KEY) return results;

  const queries = [
    { query: 'auto repair', category: 'auto_repair' },
    { query: 'nail salon', category: 'nail_salon' },
    { query: 'hair salon', category: 'hair_salon' },
    { query: 'restaurant', category: 'restaurant' },
  ];
  const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ'];

  for (const { query, category } of queries) {
    for (const location of locations) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + location)}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
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
        }
        await delay(SCRAPER_DELAY_MS);
      } catch (e) { console.error('Error:', e.message); }
    }
  }
  return results;
}

async function enrichLeads() {
  console.log('[Hunter] Enriching...');
  if (!HUNTER_API_KEY) return { enriched: 0 };

  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, website')
    .or('email.is.null,email.eq.')
    .limit(50);

  if (!leads?.length) return { enriched: 0 };

  let enriched = 0;
  for (const lead of leads) {
    try {
      const domain = lead.website?.replace(/^https?:\/\//, '').split('/')[0];
      if (!domain) continue;

      const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&limit=1`, {
        headers: { 'Authorization': `Bearer ${HUNTER_API_KEY}` }
      });
      const data = await res.json();

      if (data.data?.emails?.[0]) {
        const email = data.data.emails[0].value;
        const owner = `${data.data.emails[0].first_name || ''} ${data.data.emails[0].last_name || ''}`.trim();
        
        await supabase.from('leads').update({ 
          email, 
          owner_name: owner, 
          enriched_date: new Date().toISOString() 
        }).eq('id', lead.id);
        
        enriched++;
      }
      await delay(1000);
    } catch (e) { console.error('Enrich error:', e.message); }
  }
  return { enriched };
}

async function notify(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
  });
}

async function main() {
  console.log('🚀 Running scraper...');
  
  const results = await scrapeGooglePlaces();
  
  // Deduplicate
  const seen = new Set();
  const unique = results.filter(lead => {
    if (!lead.website) return true;
    const domain = lead.website.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    if (seen.has(domain)) return false;
    seen.add(domain);
    return true;
  });

  console.log(`Found ${unique.length} leads`);

  // Save
  if (unique.length) {
    const mapped = unique.map(l => ({
      business_name: l.business_name,
      phone: l.phone,
      website: l.website,
      address: l.address,
      source: l.source,
      source_id: l.source_id,
      city: l.address?.split(',')[0],
      state: l.address?.split(',')[1]?.trim(),
      rating: l.rating,
      status: 'New',
      scraped_date: new Date().toISOString().split('T')[0],
      category: l.category,
    }));

    await supabase.from('leads').insert(mapped);
    console.log('Saved to Supabase');
  }

  // Enrich
  const { enriched } = await enrichLeads();

  // Notify
  await notify(`🎯 <b>Daily Lead Scraper Complete</b>

📊 New leads: ${unique.length}
✉️ Enriched: ${enriched}
⏰ ${new Date().toISOString()}

#Hightower #Leads`);

  console.log('Done!');
}

main().catch(console.error);
