import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchEvents, searchEvents } from '../api/client';
import type { Event } from '../api/types';
import { useFavouritesStore } from '../store/useFavouritesStore';

const DEFAULT_EVENT_LIMIT = 20;

/* -------------------------------------------------------------------------- */
/*                              EVENT CARD                                    */
/* -------------------------------------------------------------------------- */
function EventCard({
  event,
  onViewProduction,
}: {
  event: Event;
  onViewProduction: (event: Event) => void;
}) {
  return (
    <article className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-blue-500 transition-colors flex flex-col">
      <div
        className="h-40 bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.8) 100%), url(${
            event.imageUrl ?? '/hero.jpg'
          })`,
        }}
      >
        <div className="absolute bottom-3 left-4">
          <span className="text-xs uppercase text-white/80 tracking-widest">
            {event.localeDate
              ? format(new Date(event.localeDate), 'MMM dd • h:mm a')
              : 'Date TBA'}
          </span>
          <h3 className="text-xl font-semibold text-white">{event.name}</h3>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div>
          <p className="text-sm text-blue-300 font-semibold uppercase tracking-wide">
            {event.venueName ?? 'Venue TBA'}
          </p>
          <p className="text-xs text-slate-400">
            {event.city}
            {event.state ? `, ${event.state}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Starting at</span>
          <span className="text-lg font-semibold text-white">
            {event.lowestPrice ? `$${event.lowestPrice.toFixed(0)}` : '—'}
          </span>
        </div>

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => onViewProduction(event)}
            className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            View Tickets
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*                            FAVOURITE CARD                                  */
/* -------------------------------------------------------------------------- */
function FavouriteCard({
  name,
  league,
  onRemove,
}: {
  id: string;
  name: string;
  league?: string;
  onRemove: () => void;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-white font-semibold">{name}</p>
        {league && <p className="text-xs uppercase text-blue-300 tracking-wide">{league}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-slate-300 hover:text-rose-400 transition-colors"
      >
        Remove
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export default function HomePage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();

  const favourites = useFavouritesStore((s) => s.teams);
  const loadingFavourites = useFavouritesStore((s) => s.loading);
  const addFavourite = useFavouritesStore((s) => s.addTeam);
  const removeFavourite = useFavouritesStore((s) => s.removeTeam);

  /* ----------------------------------------------------- */
  /*  Fetch Featured Events (by date)                      */
  /* ----------------------------------------------------- */
  const {
    data: featuredEvents = [],
    isLoading: loadingFeatured,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['featured-events', selectedDate],
    queryFn: async () => {
      const raw = await fetchEvents({ limit: 50, sort: 'date' });
      if (!selectedDate) return raw.slice(0, DEFAULT_EVENT_LIMIT);

      return raw
        .filter((e) => {
          if (!e.localeDate) return false;
          return format(new Date(e.localeDate), 'yyyy-MM-dd') === selectedDate;
        })
        .slice(0, DEFAULT_EVENT_LIMIT);
    },
    staleTime: 5 * 60 * 1000,
  });

  /* ----------------------------------------------------- */
  /*  Search Events                                        */
  /* ----------------------------------------------------- */
  const {
    data: searchResults = [],
    isLoading: loadingSearch,
  } = useQuery({
    queryKey: ['search-events', searchQuery],
    queryFn: () => searchEvents(searchQuery),
    enabled: isSearching && searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
  });

  /* ----------------------------------------------------- */
  /*  Date picker options                                  */
  /* ----------------------------------------------------- */
  const upcomingWeekOptions = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(today, i);
        return {
          label: format(d, 'EEE, MMM d'),
          value: format(d, 'yyyy-MM-dd'),
        };
      }),
    [today]
  );

  /* ----------------------------------------------------- */
  /*  Add to favourites (with _id)                         */
  /* ----------------------------------------------------- */
  const handleAddToFavourites = (event: Event) => {
    if (!event.performer) return;

    addFavourite({
      _id: crypto.randomUUID(),
      performerId: event.performer.id,
      performerName: event.performer.name,
      performerImage: event.performer.imageUrl,
      league: event.performer.league,
    });
  };

  /* ----------------------------------------------------- */
  /*  UI                                                   */
  /* ----------------------------------------------------- */
  const eventsToShow = isSearching ? searchResults : featuredEvents;
  const isLoading = isSearching ? loadingSearch : loadingFeatured;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* ====================== HERO ====================== */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-3xl px-8 py-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,244,0.4),transparent)]" />
        <div className="relative z-10 grid md:grid-cols-[2fr,1fr] gap-8 items-center">
          <div className="space-y-6">
            <span className="inline-flex text-xs uppercase tracking-[0.3em] bg-white/10 rounded-full px-3 py-1">
              Live in vivid colour
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Discover events, teams, and tickets tailored for every fan.
            </h1>
            <p className="text-base text-blue-100 max-w-xl">
              Explore concerts, sports, and theater experiences with real-time ticket pricing,
              section availability, and curated insights powered by Vivid Seats.
            </p>

            {/* Search Bar */}
            <div className="mt-6 w-full max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.length > 2) {
                      setIsSearching(true);
                    }
                  }}
                  placeholder="Search events, teams, venues..."
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/50 transition-colors"
                />
                <button
                  onClick={() => searchQuery.length > 2 && setIsSearching(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => refetchFeatured()}
                className="bg-slate-950/90 hover:bg-slate-900 text-white font-semibold px-5 py-2 rounded-full transition-colors"
              >
                Refresh Events
              </button>
              <button
                type="button"
                className="border border-white/40 hover:border-white text-white font-semibold px-5 py-2 rounded-full transition-colors"
              >
                View Analytics
              </button>
            </div>
          </div>

          {/* Date picker */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Choose a date</h3>
            <div className="grid grid-cols-2 gap-3">
              {upcomingWeekOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedDate(opt.value);
                    setIsSearching(false);
                  }}
                  className={`px-4 py-2 rounded-xl border transition-colors text-left ${
                    opt.value === selectedDate && !isSearching
                      ? 'bg-white text-blue-600 border-white'
                      : 'bg-white/10 border-white/40 text-white hover:bg-white/20'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-white/80">Event Day</p>
                  <p className="font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-white/70 mt-4">
              Displaying up to {DEFAULT_EVENT_LIMIT} events for{' '}
              {isSearching ? `"${searchQuery}"` : format(new Date(selectedDate), 'PPP')}.
            </p>
          </div>
        </div>
      </section>

      {/* ====================== FAVOURITES ====================== */}
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Favourite Teams</h2>
            <p className="text-sm text-slate-400">
              Instant access to the teams you track the most.
            </p>
          </div>
          {loadingFavourites && <span className="text-xs text-slate-500">Syncing…</span>}
        </header>

        {favourites.length === 0 ? (
          <div className="border border-dashed border-slate-700 rounded-3xl p-8 text-center text-slate-400">
            <p className="font-semibold">No favourites yet.</p>
            <p className="text-sm mt-2">
              Add teams from events to build your personalised dashboard.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {favourites.map((f) => (
              <FavouriteCard
                key={f._id}
                id={f._id}
                name={f.performerName}
                league={f.league}
                onRemove={() => removeFavourite(f._id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ====================== EVENTS (Featured or Search) ====================== */}
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {isSearching ? `Search Results for "${searchQuery}"` : 'Featured Events'}
            </h2>
            <p className="text-sm text-slate-400">
              {isSearching
                ? 'Real-time results from Vivid Seats.'
                : 'Real-time listings from Vivid Seats. Filter by date or explore details.'}
            </p>
          </div>
          {isSearching && (
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to Featured
            </button>
          )}
        </header>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-900/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : eventsToShow.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg font-semibold">
              {isSearching
                ? `No events found for "${searchQuery}"`
                : 'No events found for the selected date.'}
            </p>
            <p className="text-sm mt-2">
              {isSearching ? 'Try a different search term.' : 'Try another day or refresh the list.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsToShow.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onViewProduction={(e) => navigate(`/productions/${e.productionId ?? e.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ====================== TRACK FAVOURITES ====================== */}
      {!isSearching && eventsToShow.length > 0 && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Track Your Favourites</h2>
              <p className="text-sm text-slate-400">
                Click any performer to add them to your favourites list.
              </p>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsToShow.slice(0, 6).map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleAddToFavourites(ev)}
                className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 text-left hover:border-blue-500 transition-colors"
              >
                <p className="text-sm text-blue-300 font-semibold uppercase tracking-wide">
                  {ev.performer?.league ?? 'Performer'}
                </p>
                <p className="text-lg text-white font-semibold">
                  {ev.performer?.name ?? ev.name}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  {ev.venueName}
                  {ev.city ? ` • ${ev.city}` : ''}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}