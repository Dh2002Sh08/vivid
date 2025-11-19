import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { fetchEvents, fetchTickets } from '../api/client';
import type { Event } from '../api/types';

type HomeAwayFilter = 'all' | 'home' | 'away';

interface Filters {
  startDate?: string;
  endDate?: string;
  homeAway: HomeAwayFilter;
  underPrice?: number;
}

function EventInfoDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['event-tickets', event.productionId],
    queryFn: () =>
      fetchTickets(event.productionId ?? event.id, {
        quantity: 2
      }),
    enabled: open
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          Ticket insights
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <Dialog.Title className="text-xl font-semibold text-white">
            Ticket insights • {event.name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-400">
            Snapshot of available zones, custom tickets, and total listings powered by Vivid Seats data.
          </Dialog.Description>
          {isLoading ? (
            <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data?.zones.map((zone) => (
                <div key={zone.zone} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <header className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">{zone.zone}</h4>
                    <span className="text-xs text-blue-300">{zone.sections.length} sections</span>
                  </header>
                  <p className="text-2xl font-bold text-white">
                    {zone.lowestPrice ? `$${zone.lowestPrice.toFixed(0)}` : '—'}
                  </p>
                  <p className="text-xs text-slate-400 flex flex-col gap-1">
                    <span>Tickets: {zone.totalTickets}</span>
                    {zone.lowestPairPrice && <span>Pairs from ${zone.lowestPairPrice.toFixed(0)}</span>}
                    {zone.lowestGroupPrice && <span>Groups (4) from ${zone.lowestGroupPrice.toFixed(0)}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function applyFilters(events: Event[] | undefined, filters: Filters) {
  if (!events) return [];

  return events.filter((event) => {
    const eventDate = event.localeDate ? new Date(event.localeDate) : undefined;
    if (filters.startDate && eventDate && eventDate < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && eventDate && eventDate > new Date(filters.endDate)) {
      return false;
    }
    if (filters.underPrice && event.lowestPrice && event.lowestPrice > filters.underPrice) {
      return false;
    }
    if (filters.homeAway !== 'all' && event.type) {
      const isHome = event.type.toLowerCase().includes('home');
      if (filters.homeAway === 'home' && !isHome) return false;
      if (filters.homeAway === 'away' && isHome) return false;
    }
    return true;
  });
}

export default function EventsPage() {
  const [filters, setFilters] = useState<Filters>({
    homeAway: 'all'
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', filters.startDate, filters.endDate],
    queryFn: () =>
      fetchEvents({
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 50,
        sort: 'date'
      }),
    staleTime: 60_000
  });

  const filteredEvents = useMemo(() => applyFilters(events, filters), [events, filters]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase text-blue-400 tracking-[0.3em]">Event Listings</p>
        <h1 className="text-3xl font-semibold text-white">Browse events & refine by ticket insights</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Filter events by date range, pricing, and home versus away matchups. Click into any production to see
          available zones, ticket counts, and real-time pricing trends.
        </p>
      </header>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col text-sm text-slate-300 gap-2">
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
              className="bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-300 gap-2">
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
              className="bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-300 gap-2">
            Venue Side
            <div className="flex rounded-lg overflow-hidden border border-slate-800">
              {(['all', 'home', 'away'] as HomeAwayFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      homeAway: option
                    }))
                  }
                  className={clsx(
                    'flex-1 px-4 py-2 text-sm capitalize transition-colors',
                    filters.homeAway === option
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950/50 text-slate-300 hover:bg-slate-800'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col text-sm text-slate-300 gap-2">
            Tickets under
            <div className="flex items-center gap-2">
              <span className="text-slate-400">$</span>
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
                className="bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Results</h2>
          <span className="text-xs text-slate-500">
            Showing {filteredEvents.length} of {events?.length ?? 0} events
          </span>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-48 rounded-3xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-500 transition-colors"
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                    <p className="text-sm text-slate-400">
                      {event.localeDate ? format(new Date(event.localeDate), 'PPP • h:mm a') : 'Date TBA'}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-blue-300 tracking-wide">
                    {event.performer?.league ?? 'Event'}
                  </span>
                </header>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                  <p>
                    Venue
                    <br />
                    <span className="text-slate-400 text-xs">
                      {event.venueName} • {event.city}
                    </span>
                  </p>
                  <p>
                    Lowest price
                    <br />
                    <span className="text-white font-semibold">
                      {event.lowestPrice ? `$${event.lowestPrice.toFixed(0)}` : '—'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <EventInfoDialog event={event} />
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/productions/${event.productionId ?? event.id}`}
                      className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 transition-colors"
                    >
                      View Tickets
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

