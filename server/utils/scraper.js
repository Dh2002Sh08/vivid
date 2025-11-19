// utils/scraper.js
import axios from 'axios';
import { load } from 'cheerio'; // ← NAMED IMPORT

const VIVID_BASE = 'https://www.vividseats.com';

export async function scrapeVividEvents(limit = 12) {
    try {
        const { data } = await axios.get(VIVID_BASE, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            },
            timeout: 15000,
        });

        const $ = load(data); // ← Use load() function
        const events = [];

        // === 1. Extract from JSON-LD (SEO data) ===
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const raw = $(el).html();
                if (!raw) return;

                const json = JSON.parse(raw);
                const event = Array.isArray(json) ? json.find(e => e['@type'] === 'Event') : json;

                if (event?.['@type'] === 'Event' && event.name && event.startDate) {
                    const url = event.url || event.offers?.url;
                    const productionId = url?.match(/production\/(\d+)/)?.[1];

                    events.push({
                        id: productionId || null,
                        productionId,
                        name: event.name,
                        localeDate: event.startDate,
                        venueName: event.location?.name,
                        city: event.location?.address?.addressLocality,
                        state: event.location?.address?.addressRegion,
                        imageUrl: Array.isArray(event.image) ? event.image[0] : event.image,
                        lowestPrice: extractPrice(event.offers?.lowPrice),
                        url,
                    });
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        });

        // === 2. Fallback: Scrape visible event cards ===
        if (events.length < 3) {
            $('.event-card, [data-testid="event-card"], a[href*="/production/"]').each((_, el) => {
                const $el = $(el);
                const link = $el.is('a') ? $el : $el.find('a').first();
                const href = link.attr('href');
                if (!href?.includes('/production/')) return;

                const url = href.startsWith('http') ? href : VIVID_BASE + href;
                const productionId = url.match(/production\/(\d+)/)?.[1];
                if (!productionId) return;

                const title = $el.find('h3, .event-title, [data-testid="event-title"]').text().trim();
                const venue = $el.find('.venue, [data-testid="venue"]').text().trim();
                const priceText = $el.find('.price, [data-testid="price"]').text().trim();

                events.push({
                    id: productionId,
                    productionId,
                    name: title || 'Event',
                    localeDate: null,
                    venueName: venue || null,
                    city: null,
                    state: null,
                    imageUrl: $el.find('img').attr('src') || null,
                    lowestPrice: parsePrice(priceText),
                    url,
                });
            });
        }

        // Deduplicate
        const seen = new Set();
        const unique = events.filter(e => {
            if (!e.productionId || seen.has(e.productionId)) return false;
            seen.add(e.productionId);
            return true;
        });

        return unique.slice(0, limit);
    } catch (error) {
        console.error('Scrape failed:', error.message);
        return [];
    }
}

// utils/scraper.js  (ADD THIS FUNCTION)

export async function scrapeVividSearch(query, limit = 12) {
    if (!query) return [];

    const encoded = encodeURIComponent(query.trim());
    const url = `https://www.vividseats.com/search?searchTerm=${encoded}`;

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            },
            timeout: 15000,
        });

        const $ = load(data);
        const events = [];

        // Try JSON-LD first
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html());
                const event = Array.isArray(json) ? json[0] : json;
                if (event['@type'] === 'Event' && event.name && event.startDate) {
                    const url = event.url || event.offers?.url;
                    const productionId = url?.match(/production\/(\d+)/)?.[1];
                    if (productionId) {
                        events.push({
                            id: productionId,
                            productionId,
                            name: event.name,
                            localeDate: event.startDate,
                            venueName: event.location?.name,
                            city: event.location?.address?.addressLocality,
                            state: event.location?.address?.addressRegion,
                            imageUrl: Array.isArray(event.image) ? event.image[0] : event.image,
                            lowestPrice: extractPrice(event.offers?.lowPrice),
                            url,
                        });
                    }
                }
            } catch (e) { }
        });

        // Fallback: visible search results
        if (events.length === 0) {
            $('a[href*="/production/"]').each((_, el) => {
                const $el = $(el);
                const href = $el.attr('href');
                if (!href) return;

                const fullUrl = href.startsWith('http') ? href : 'https://www.vividseats.com' + href;
                const productionId = fullUrl.match(/production\/(\d+)/)?.[1];
                if (!productionId) return;

                const title = $el.find('h3, .title, [data-testid="title"]').text().trim() || $el.text().trim();
                const venue = $el.find('.venue, [data-testid="venue"]').text().trim();
                const priceText = $el.find('.price, [data-testid="price"]').text().trim();

                events.push({
                    id: productionId,
                    productionId,
                    name: title.split('|')[0].trim() || 'Event',
                    localeDate: null,
                    venueName: venue,
                    city: null,
                    state: null,
                    imageUrl: $el.find('img').attr('src') || null,
                    lowestPrice: parsePrice(priceText),
                    url: fullUrl,
                });
            });
        }

        // Deduplicate
        const seen = new Set();
        const unique = events.filter(e => {
            if (!e.productionId || seen.has(e.productionId)) return false;
            seen.add(e.productionId);
            return true;
        });

        return unique.slice(0, limit);
    } catch (error) {
        console.error('Search scrape failed:', error.message);
        return [];
    }
}

// utils/scraper.js

export async function scrapeProduction(productionId) {
    const htmlUrl = `https://www.vividseats.com/production/${productionId}`;
    const apiUrl = `https://www.vividseats.com/api/production/${productionId}`;
  
    try {
      // Try the JSON API endpoint first
      const apiRes = await axios.get(apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 15000,
      });
  
      // ✅ If we got a valid response, just return it
      if (apiRes?.data) return apiRes.data;
    } catch (err) {
      console.warn(
        `[scrapeProduction] JSON API failed for ${productionId}:`,
        err.response?.status || err.message
      );
    }
  
    // 🔄 fallback to scraping the HTML page
    try {
      const { data } = await axios.get(htmlUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
        timeout: 15000,
      });
  
      const $ = load(data);
      const json = $('script[type="application/ld+json"]').first().html();
      if (!json) return null;
  
      const event = JSON.parse(json);
      if (event['@type'] !== 'Event') return null;
  
      return {
        id: productionId,
        name: event.name,
        date: event.startDate,
        venue: event.location?.name,
        city: event.location?.address?.addressLocality,
        state: event.location?.address?.addressRegion,
        imageUrl: Array.isArray(event.image) ? event.image[0] : event.image,
        performers: (event.performer || []).map((p) => ({
          id: p.url?.match(/performer\/(\d+)/)?.[1] || '',
          name: p.name,
          imageUrl: p.image,
        })),
      };
    } catch (error) {
      console.error(`[scrapeProduction] HTML scrape failed for ${productionId}:`, error.message);
      return null;
    }
  }
  

export async function scrapeTickets(productionId, quantity = 1) {
    const url = `https://www.vividseats.com/production/${productionId}/tickets?quantity=${quantity}`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
        });

        const $ = load(data);
        const listings = [];

        // Try JSON-LD first
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html());
                if (json.offers) {
                    (Array.isArray(json.offers) ? json.offers : [json.offers]).forEach(offer => {
                        if (offer.price && offer.availability) {
                            listings.push({
                                id: offer.url?.match(/listing\/(\d+)/)?.[1] || Math.random().toString(),
                                zone: offer.areaServed || 'General',
                                section: offer.areaServed,
                                row: null,
                                quantity: quantity,
                                price: extractPrice(offer.price),
                                score: null,
                                attributes: [],
                            });
                        }
                    });
                }
            } catch (e) { }
        });

        // Fallback: visible listings
        if (listings.length === 0) {
            $('.listing-card, [data-testid="listing"]').each((_, el) => {
                const $el = $(el);
                const priceText = $el.find('.price, [data-testid="price"]').text();
                const section = $el.find('.section, [data-testid="section"]').text();
                const zone = $el.find('.zone, [data-testid="zone"]').text() || section;

                listings.push({
                    id: Math.random().toString(),
                    zone: zone || 'General',
                    section: section,
                    row: $el.find('.row').text() || null,
                    quantity: quantity,
                    price: parsePrice(priceText),
                    score: null,
                    attributes: [],
                });
            });
        }

        // Deduplicate
        const seen = new Set();
        const unique = listings.filter(l => {
            const key = `${l.zone}-${l.section}-${l.price}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const zones = Array.from(new Set(unique.map(l => l.zone))).map(zone => {
            const zoneListings = unique.filter(l => l.zone === zone);
            return {
                zone,
                lowestPrice: Math.min(...zoneListings.map(l => l.price)),
                totalTickets: zoneListings.reduce((s, l) => s + l.quantity, 0),
                totalListings: zoneListings.length,
            };
        });

        return { listings: unique, zones };
    } catch (error) {
        console.error('Tickets scrape failed:', error.message);
        return { listings: [], zones: [] };
    }
}

// Helper: extract number from "$99" or "99.00"
function extractPrice(str) {
    if (!str) return null;
    const match = str.toString().match(/[\d,]+(\.\d+)?/);
    return match ? parseFloat(match[0].replace(',', '')) : null;
}

function parsePrice(text) {
    const match = text.match(/\$([\d,]+(\.\d+)?)/);
    return match ? parseFloat(match[1].replace(',', '')) : null;
}