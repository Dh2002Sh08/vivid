import { useMemo, useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { fetchProduction, fetchTickets } from '../api/client';
import type { TicketListing, ZoneSummary } from '../api/types';

interface Filters {
  priceMin: number;
  priceMax: number;
  quantity: number;
  dealScore: number;
  perks: string[];
  zones: string[];
  onlyAvailable: boolean;
}

type SortOption = 'price-asc' | 'price-desc' | 'section' | 'quantity';

function applyFilters(listings: TicketListing[], filters: Filters) {
  return listings.filter((listing) => {
    if (listing.price < filters.priceMin || listing.price > filters.priceMax) return false;
    if (listing.quantity < filters.quantity) return false;
    if (filters.dealScore > 0 && (listing.score ?? 0) < filters.dealScore) return false;
    if (filters.perks.length > 0) {
      const listingPerks = (listing.attributes ?? []).map(a => a.toLowerCase());
      if (!filters.perks.every(p => listingPerks.some(lp => lp.includes(p.toLowerCase())))) {
        return false;
      }
    }
    if (filters.zones.length > 0 && listing.zone && !filters.zones.includes(listing.zone)) return false;
    if (filters.onlyAvailable && listing.quantity === 0) return false;
    return true;
  });
}

function sortListings(listings: TicketListing[], sort: SortOption) {
  return [...listings].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'section') return (a.section ?? '').localeCompare(b.section ?? '');
    if (sort === 'quantity') return b.quantity - a.quantity;
    return 0;
  });
}

function getPerks(listings: TicketListing[]) {
  const perks = new Set<string>();
  listings.forEach(l => l.attributes?.forEach(a => perks.add(a)));
  return Array.from(perks);
}

export default function ProductionPage() {
  const { productionId } = useParams<{ productionId: string }>();
  const [filters, setFilters] = useState<Filters>({
    priceMin: 0,
    priceMax: 1000,
    quantity: 1,
    dealScore: 0,
    perks: [],
    zones: [],
    onlyAvailable: true,
  });
  const [sort, setSort] = useState<SortOption>('price-asc');

  const { data: production, isLoading: loadingProduction } = useQuery({
    queryKey: ['production', productionId],
    queryFn: () => fetchProduction(productionId!),
    enabled: !!productionId,
  });

  console.log("🎭 Production:", production);


  const {
    data: ticketData,
    isLoading: loadingTickets,
  } = useQuery({
    queryKey: ['tickets', productionId, filters.quantity],
    queryFn: () => fetchTickets(productionId!, { quantity: Math.max(filters.quantity, 1) }),
    enabled: !!productionId,
  });
  console.log("🎟️ Tickets:", ticketData);

  const listings = ticketData?.listings ?? [];
  const zones = ticketData?.zones ?? [];

  const perks = useMemo(() => getPerks(listings), [listings]);
  const filteredListings = useMemo(
    () => sortListings(applyFilters(listings, filters), sort),
    [listings, filters, sort]
  );

  const totals = useMemo(() => {
    const totalTickets = filteredListings.reduce((sum, l) => sum + l.quantity, 0);
    const minPrice = filteredListings.reduce((min, l) => Math.min(min, l.price), Infinity);
    return {
      totalTickets,
      totalListings: filteredListings.length,
      minPrice: isFinite(minPrice) ? minPrice : null,
    };
  }, [filteredListings]);

  const selectedZones = new Set(filters.zones);

  const handleZoneToggle = (zone: string) => {
    setFilters(prev => {
      const newZones = prev.zones.includes(zone)
        ? prev.zones.filter(z => z !== zone)
        : [...prev.zones, zone];
      return { ...prev, zones: newZones };
    });
  };

  const priceMax = Math.max(filters.priceMax, filters.priceMin + 50);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* ====================== HEADER ====================== */}
      {loadingProduction ? (
        <div className="h-48 bg-slate-900/60 rounded-3xl animate-pulse" />
      ) : production ? (
        <header className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3">
          <p className="text-xs uppercase text-blue-400 tracking-[0.3em]">Production</p>
          <h1 className="text-3xl font-semibold text-white">{production.name}</h1>
          <p className="text-sm text-slate-400">
            {production.date
              ? new Date(production.date).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Date TBA'}{' '}
            • {production.venue}
            {production.city ? ` • ${production.city}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {production.performers?.map((p: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/20"
              >
                {p.name}
              </span>
            ))}
          </div>
        </header>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg font-semibold">Production not found</p>
        </div>
      )}

      {/* ====================== FILTERS ====================== */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Total tickets: {totals.totalTickets}</span>
            <span>Listings: {totals.totalListings}</span>
            <span>
              Lowest: {totals.minPrice ? `$${totals.minPrice.toFixed(0)}` : '—'}
            </span>
          </div>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs uppercase text-slate-400 tracking-wide">
          {/* Price Range */}
          <label className="flex flex-col gap-3">
            Price range
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>${filters.priceMin}</span>
                <span>${priceMax}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2000}
                step={10}
                value={filters.priceMin}
                onChange={e =>
                  setFilters(p => ({ ...p, priceMin: Number(e.target.value) }))
                }
                className="w-full accent-blue-500"
              />
              <input
                type="range"
                min={filters.priceMin + 50}
                max={2500}
                step={10}
                value={filters.priceMax}
                onChange={e =>
                  setFilters(p => ({ ...p, priceMax: Number(e.target.value) }))
                }
                className="w-full accent-blue-500 mt-2"
              />
            </div>
          </label>

          {/* Quantity */}
          <label className="flex flex-col gap-3">
            Ticket quantity
            <input
              type="number"
              min={1}
              max={10}
              value={filters.quantity}
              onChange={e =>
                setFilters(p => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))
              }
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* Deal Score */}
          <label className="flex flex-col gap-3">
            Deal score
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.dealScore}
              onChange={e =>
                setFilters(p => ({ ...p, dealScore: Number(e.target.value) }))
              }
              className="w-full accent-blue-500"
            />
          </label>

          {/* Sort */}
          <label className="flex flex-col gap-3">
            Sort by
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
              <option value="section">Section</option>
              <option value="quantity">Quantity</option>
            </select>
          </label>

          {/* Perks */}
          <label className="flex flex-col gap-3">
            Perks
            <div className="flex flex-wrap gap-2">
              {perks.length === 0 ? (
                <span className="text-slate-500">No perks available</span>
              ) : (
                perks.map(perk => {
                  const selected = filters.perks.includes(perk);
                  return (
                    <button
                      key={perk}
                      type="button"
                      onClick={() =>
                        setFilters(p => ({
                          ...p,
                          perks: selected
                            ? p.perks.filter(v => v !== perk)
                            : [...p.perks, perk],
                        }))
                      }
                      className={clsx(
                        'px-3 py-1 rounded-full border text-xs transition-colors',
                        selected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-blue-500'
                      )}
                    >
                      {perk}
                    </button>
                  );
                })
              )}
            </div>
          </label>

          {/* Availability */}
          <label className="flex flex-col gap-3">
            Availability
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={filters.onlyAvailable}
                onChange={e =>
                  setFilters(p => ({ ...p, onlyAvailable: e.target.checked }))
                }
                className="accent-blue-500"
              />
              <span className="text-slate-300">Only show available tickets</span>
            </div>
          </label>
        </div>
      </section>

      {/* ====================== MAIN GRID ====================== */}
      <section className="grid lg:grid-cols-[2fr,1fr] gap-8">
        {/* TICKET LISTINGS */}
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Ticket Listings</h2>
            <span className="text-xs text-slate-500">{filteredListings.length} results</span>
          </header>

          {loadingTickets ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg font-semibold">No tickets match your filters</p>
              <p className="text-sm mt-2">Try adjusting price, quantity, or zones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map(listing => (
                <article
                  key={listing.id}
                  className={clsx(
                    'border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 transition-colors',
                    selectedZones.has(listing.zone ?? '')
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-800 bg-slate-900/70'
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Section {listing.section ?? 'TBA'} • Row {listing.row ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Zone: {listing.zone ?? 'General admission'}
                    </p>
                    <p className="text-xs text-slate-500">Qty: {listing.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      ${listing.price.toFixed(0)}
                    </p>
                    {listing.score && (
                      <p className="text-xs text-blue-300">Deal score: {listing.score}</p>
                    )}
                    {listing.attributes && listing.attributes.length > 0 && (
                      <p className="text-[11px] text-slate-400">
                        {listing.attributes.slice(0, 3).join(' • ')}
                        {listing.attributes.length > 3 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* STADIUM VIEW */}
        <aside className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Stadium View</h2>
            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, zones: [] }))}
              className="text-xs text-slate-400 hover:text-blue-300 underline underline-offset-2"
            >
              Reset zones
            </button>
          </header>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{zones.length} zones</span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters(p => ({
                      ...p,
                      priceMin: Math.max(p.priceMin - 50, 0),
                      priceMax: Math.max(p.priceMax - 50, 100),
                    }))
                  }
                  className="px-2 py-1 border border-slate-700 rounded-md text-slate-300 hover:border-blue-500"
                >
                  Zoom out
                </button>
                <button
                  onClick={() =>
                    setFilters(p => ({
                      ...p,
                      priceMin: p.priceMin + 50,
                      priceMax: p.priceMax + 50,
                    }))
                  }
                  className="px-2 py-1 border border-slate-700 rounded-md text-slate-300 hover:border-blue-500"
                >
                  Zoom in
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {zones.map((zone: ZoneSummary) => (
                <ZoneCard
                  key={zone.zone}
                  zone={zone}
                  active={selectedZones.has(zone.zone)}
                  onToggle={() => handleZoneToggle(zone.zone)}
                />
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Click zones to filter tickets. Selected zones are highlighted.
            </p>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Selected: {filters.zones.length}</span>
              <button
                onClick={() => handleZoneToggle('Custom')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                + Custom zone
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ZoneCard({
  zone,
  active,
  onToggle,
}: {
  zone: ZoneSummary;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'relative p-4 border rounded-2xl text-left transition-all duration-200',
        active
          ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/20'
          : 'border-slate-800 bg-slate-950/60 hover:border-blue-500 text-slate-200'
      )}
    >
      <h3 className="text-sm font-semibold">{zone.zone}</h3>
      <p className="text-lg font-bold mt-1">
        {zone.lowestPrice ? `$${zone.lowestPrice.toFixed(0)}` : '—'}
      </p>
      <p className="text-xs text-slate-400">
        {zone.totalTickets} tickets • {zone.totalListings} listings
      </p>
      {active && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
      )}
    </button>
  );
}