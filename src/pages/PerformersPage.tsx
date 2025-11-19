import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from 'react';
import { useQuery } from '@tanstack/react-query';
import {  format } from 'date-fns';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchTickets } from '../api/client';
import type { Event, Performer } from '../api/types';

type ViewMode = 'list' | 'calendar';
type DaySegment = 'any' | 'day' | 'night';

interface Filters {
  startDate?: string;
  endDate?: string;
  segment: DaySegment;
  homeAway: 'all' | 'home' | 'away';
  maxPrice?: number;
  opponent?: string;
}

function PerformerTicketInsights({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['performer-ticket', event.productionId],
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
          Zone insights
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold text-white">
            {event.performer?.name} at {event.venueName}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-400">
            Hover over each zone to see lowest price, available tickets, and listing totals. Multi-zone selection
            enables section-based filtering within the stadium view.
          </Dialog.Description>
          {isLoading ? (
            <div className="h-36 bg-slate-800/40 rounded-2xl animate-pulse" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data?.zones.map(
                (
                  zone: {
                    zone: string | number; // Update type so 'zone' is assignable to 'key'
                    sections: string[] | any[];
                    lowestPrice: number;
                    totalTickets: number;
                    totalListings: number;
                  }
                ) => (
                  <div
                    key={zone.zone}
                    className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-colors"
                  >
                    <header className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">{zone.zone}</h4>
                    <span className="text-xs text-blue-300">{zone.sections.length} sections</span>
                  </header>
                  <p className="text-2xl font-bold text-white">
                    {zone.lowestPrice ? `$${zone.lowestPrice.toFixed(0)}` : '—'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Total tickets: {zone.totalTickets}
                    <br />
                    Total listings: {zone.totalListings}
                  </p>
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

function getOpponents(events: Event[]) {
  const opponents = new Set<string>();
  events.forEach((event) => {
    if (event.name) {
      const versusIndex = event.name.toLowerCase().indexOf('vs');
      if (versusIndex !== -1) {
        const name = event.name.slice(versusIndex + 2).replace(/[-:]/g, '').trim();
        if (name) opponents.add(name);
      }
    }
  });
  return Array.from(opponents);
}

function applyFilters(events: Event[], filters: Filters) {
  return events.filter((event) => {
    if (filters.startDate && event.localeDate && new Date(event.localeDate) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && event.localeDate && new Date(event.localeDate) > new Date(filters.endDate)) {
      return false;
    }
    if (filters.maxPrice && event.lowestPrice && event.lowestPrice > filters.maxPrice) {
      return false;
    }
    if (filters.segment !== 'any' && event.localeDate) {
      const hour = new Date(event.localeDate).getHours();
      const isDay = hour >= 6 && hour < 17;
      if (filters.segment === 'day' && !isDay) return false;
      if (filters.segment === 'night' && isDay) return false;
    }
    if (filters.homeAway !== 'all' && event.type) {
      const isHome = event.type.toLowerCase().includes('home');
      if (filters.homeAway === 'home' && !isHome) return false;
      if (filters.homeAway === 'away' && isHome) return false;
    }
    if (filters.opponent && event.name && !event.name.toLowerCase().includes(filters.opponent.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export default function PerformersPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<Filters>({
    segment: 'any',
    homeAway: 'all'
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['performer-events'],
    queryFn: () =>
      fetchEvents({
        limit: 60,
        sort: 'date'
      }),
    staleTime: 120_000
  });

  const uniquePerformers = useMemo(() => {
    const map = new Map<string, Performer & { events: Event[] }>();
    events?.forEach((event) => {
      if (!event.performer) return;
      const key = event.performer.id;
      if (!map.has(key)) {
        map.set(key, {
          ...event.performer,
          events: [event]
        });
      } else {
        map.get(key)?.events.push(event);
      }
    });
    return Array.from(map.values());
  }, [events]);

  const filteredEvents = useMemo(
    () => (events ? applyFilters(events, filters) : []),
    [events, filters]
  );

  const opponents = useMemo(() => (events ? getOpponents(events) : []), [events]);

  const renderListView = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {uniquePerformers?.map((performer) => (
        <article
          key={performer.id}
          className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-white font-semibold flex items-center justify-center">
              {performer.name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 3)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{performer.name}</h3>
              <p className="text-xs uppercase text-blue-300 tracking-wide">
                {performer.league ?? 'Performer'}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {performer.homeVenue ? `${performer.homeVenue} • ` : ''}
            {performer.homeCity}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {performer.events.length} upcoming events
            </span>
            <Link
              to={`${import.meta.env.VITE_APP_URL}/performers/${performer.id}`}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 transition-colors"
            >
              View Schedule
            </Link>
          </div>
        </article>
      ))}
    </div>
  );

  const renderCalendarView = () => {
    const groupedByDate = filteredEvents.reduce<Record<string, Event[]>>((accumulator, event) => {
      if (!event.localeDate) return accumulator;
      const key = format(new Date(event.localeDate), 'yyyy-MM-dd');
      accumulator[key] = accumulator[key] ? [...accumulator[key], event] : [event];
      return accumulator;
    }, {});

    const entries = Object.entries(groupedByDate).sort(([a], [b]) => (a < b ? -1 : 1));

    return (
      <div className="space-y-6">
        {entries.map(([date, items]) => (
          <section key={date} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{format(new Date(date), 'PPP')}</h3>
              <span className="text-xs text-slate-500">{items.length} events</span>
            </header>
            <div className="space-y-4">
              {items.map((event) => (
                <article key={event.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{event.name}</h4>
                      <p className="text-xs text-slate-400">
                        {event.venueName} • {event.city}
                      </p>
                    </div>
                    <p className="text-xs text-blue-300 uppercase tracking-wide">
                      {event.performer?.league ?? 'Event'}
                    </p>
                  </header>
                  <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
                    <span>
                      Time:{' '}
                      {event.localeDate ? format(new Date(event.localeDate), 'h:mm a') : 'TBA'}
                    </span>
                    <span>Lowest price: {event.lowestPrice ? `$${event.lowestPrice}` : '—'}</span>
                    <span>Tickets: {event.ticketCount ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <PerformerTicketInsights event={event} />
                    <Link
                      to={`/productions/${event.productionId ?? event.id}`}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Stadium View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase text-blue-400 tracking-[0.3em]">Performers & Teams</p>
        <h1 className="text-3xl font-semibold text-white">
          Dive into team calendars with listing and stadium views.
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Toggle between a list of teams or a calendar of upcoming matchups. Analyse pricing, home versus away splits,
          and availability with stadium-level detail.
        </p>
      </header>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <div className="inline-flex rounded-full bg-slate-950/60 border border-slate-800 p-1">
            {(['list', 'calendar'] as ViewMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={clsx(
                  'px-4 py-1.5 text-sm rounded-full transition-colors capitalize',
                  view === option ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                )}
              >
                {option} view
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            Start Date
            <input
              type="date"
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.startDate ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, startDate: event.target.value || undefined }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            End Date
            <input
              type="date"
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.endDate ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, endDate: event.target.value || undefined }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            Day/Night
            <select
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.segment}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  segment: event.target.value as DaySegment
                }))
              }
            >
              <option value="any">Any</option>
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            Home/Away
            <select
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.homeAway}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  homeAway: event.target.value as Filters['homeAway']
                }))
              }
            >
              <option value="all">All</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            Tickets under
            <input
              type="number"
              min={0}
              placeholder="500"
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.maxPrice ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  maxPrice: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase text-slate-400 tracking-wide">
            VS Opponents
            <select
              className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.opponent ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  opponent: event.target.value || undefined
                }))
              }
            >
              <option value="">All opponents</option>
              {opponents.map((opponent) => (
                <option key={opponent} value={opponent}>
                  {opponent}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 bg-slate-900/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : view === 'list' ? (
        renderListView()
      ) : (
        renderCalendarView()
      )}
    </div>
  );
}

