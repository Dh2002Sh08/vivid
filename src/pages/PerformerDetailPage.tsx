import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import clsx from 'clsx';
import { fetchEvents, fetchPerformer, fetchTickets } from '../api/client';
import type { Event } from '../api/types';

type ViewMode = 'list' | 'calendar';

interface Filters {
  startDate?: string;
  endDate?: string;
  homeAway: 'all' | 'home' | 'away';
  underPrice?: number;
  zone?: string;
}

function ZoneDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['performer-detail-zone', event.productionId],
    queryFn: () => fetchTickets(event.productionId ?? event.id, { quantity: 2 }),
    enabled: open
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          Available zones
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold text-white">{event.name}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-400">
            Hover over zones to view lowest pricing, ticket availability, and listing counts. Create custom zones to
            tailor searches with multi-zone filtering.
          </Dialog.Description>
          {isLoading ? (
            <div className="h-36 bg-slate-800/40 rounded-2xl animate-pulse" />
          ) : (
            <div className="space-y-3">
              {data?.zones.map((zone) => (
                <div
                  key={zone.zone}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-colors"
                >
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">{zone.zone}</h4>
                    <span className="text-xs text-blue-300">{zone.sections.length} sections</span>
                  </header>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
                    <span>Lowest price: {zone.lowestPrice ? `$${zone.lowestPrice.toFixed(0)}` : '—'}</span>
                    <span>Total tickets: {zone.totalTickets}</span>
                    <span>Total listings: {zone.totalListings}</span>
                    {zone.lowestPairPrice && <span>Pairs from ${zone.lowestPairPrice.toFixed(0)}</span>}
                    {zone.lowestGroupPrice && <span>Groups (4) from ${zone.lowestGroupPrice.toFixed(0)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Dialog.Close asChild>
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function PerformerDetailPage() {
  const { performerId } = useParams<{ performerId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<Filters>({
    homeAway: 'all'
  });

  const { data: performer, isLoading: performerLoading } = useQuery({
    queryKey: ['performer', performerId],
    queryFn: () => fetchPerformer(performerId!),
    enabled: Boolean(performerId)
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['performer-events', performerId, filters.startDate, filters.endDate],
    queryFn: () =>
      fetchEvents({
        performerId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 40,
        sort: 'date'
      }),
    enabled: Boolean(performerId)
  });

  const filteredEvents = useMemo(() => {
    const performerEvents = events?.filter((event) => event.performer?.id === performerId) ?? [];
    return performerEvents.filter((event) => {
      if (filters.homeAway !== 'all' && event.type) {
        const isHome = event.type.toLowerCase().includes('home');
        if (filters.homeAway === 'home' && !isHome) return false;
        if (filters.homeAway === 'away' && isHome) return false;
      }
      if (filters.underPrice && event.lowestPrice && event.lowestPrice > filters.underPrice) {
        return false;
      }
      if (filters.zone && event.ticketCount) {
        return true;
      }
      return true;
    });
  }, [events, filters, performerId]);

  const renderList = () => (
    <div className="space-y-4">
      {filteredEvents.map((event) => (
        <article
          key={event.id}
          className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-blue-500 transition-colors"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{event.name}</h3>
              <p className="text-xs text-slate-400">
                {event.localeDate ? format(new Date(event.localeDate), 'PPP • h:mm a') : 'Date TBA'}
              </p>
            </div>
            <span className="text-xs uppercase text-blue-300 tracking-wide">
              {event.performer?.league ?? 'Event'}
            </span>
          </header>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <span>Venue: {event.venueName}</span>
            <span>City: {event.city}</span>
            <span>Lowest price: {event.lowestPrice ? `$${event.lowestPrice}` : '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ZoneDialog event={event} />
            <Link
              to={`/productions/${event.productionId ?? event.id}`}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 transition-colors"
            >
              Open Stadium View
            </Link>
          </div>
        </article>
      ))}
    </div>
  );

  const renderCalendar = () => {
    const grouped = filteredEvents.reduce<Record<string, Event[]>>((accumulator, event) => {
      if (!event.localeDate) return accumulator;
      const key = format(new Date(event.localeDate), 'yyyy-MM-dd');
      accumulator[key] = accumulator[key] ? [...accumulator[key], event] : [event];
      return accumulator;
    }, {});

    return (
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(grouped).map(([date, dayEvents]) => (
          <section key={date} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {format(new Date(date), 'PPP')}
              </h3>
              <span className="text-xs text-slate-500">{dayEvents.length} events</span>
            </header>
            {dayEvents.map((event) => (
              <article
                key={event.id}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-white">{event.name}</h4>
                  <span className="text-xs text-blue-300 uppercase tracking-wide">
                    {event.performer?.league ?? 'Event'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {event.venueName} • {event.city}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Time: {event.localeDate ? format(new Date(event.localeDate), 'h:mm a') : 'TBA'}</span>
                  <span>Tickets: {event.ticketCount ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <ZoneDialog event={event} />
                  <Link
                    to={`/productions/${event.productionId ?? event.id}`}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Tickets
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <Link to="/performers" className="text-xs text-blue-400 hover:text-blue-300 underline">
          ← Back to performers
        </Link>
        {performerLoading ? (
          <div className="h-20 bg-slate-900/60 rounded-3xl animate-pulse" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-blue-400 tracking-[0.3em]">Performer</p>
              <h1 className="text-3xl font-semibold text-white">{performer?.name}</h1>
              <p className="text-sm text-slate-400">
                {performer?.homeVenue ? `${performer.homeVenue} • ` : ''}
                {performer?.homeCity}
              </p>
            </div>
            <div className="text-xs text-slate-400">
              <p>League: {performer?.league ?? 'N/A'}</p>
              <p>Next event: {performer?.nextEventDate ? format(new Date(performer.nextEventDate), 'PPP') : 'TBA'}</p>
            </div>
          </div>
        )}
      </header>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <div className="inline-flex rounded-full bg-slate-950/60 border border-slate-800 p-1">
            {(['list', 'calendar'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-4 py-1.5 text-sm rounded-full transition-colors capitalize',
                  viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                )}
              >
                {mode} view
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs uppercase text-slate-400 tracking-wide">
          <label className="flex flex-col gap-2">
            Start Date
            <input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  startDate: event.target.value || undefined
                }))
              }
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-2">
            End Date
            <input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  endDate: event.target.value || undefined
                }))
              }
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-2">
            Home/Away
            <select
              value={filters.homeAway}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  homeAway: event.target.value as Filters['homeAway']
                }))
              }
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Tickets under
            <input
              type="number"
              min={0}
              placeholder="500"
              value={filters.underPrice ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  underPrice: event.target.value ? Number(event.target.value) : undefined
                }))
              }
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      {eventsLoading ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 bg-slate-900/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        renderList()
      ) : (
        renderCalendar()
      )}
    </div>
  );
}

