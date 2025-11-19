import * as Popover from '@radix-ui/react-popover';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { fetchPerformer, searchAll } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import type { Performer, SearchResults } from '../api/types';

type TrendingRecommendation = {
  label: string;
  icon: string;
  performerId?: string;
  query?: string;
};

const TRENDING_ITEMS: TrendingRecommendation[] = [
  { label: 'Hamilton', icon: '🎭', performerId: '40710' },
  { label: 'Ariana Grande', icon: '🎤', query: 'Ariana Grande' },
  { label: 'NFL', icon: '🏈', query: 'NFL' },
  { label: 'Nate Bargatze', icon: '😂', query: 'Nate Bargatze' },
  { label: 'Morgan Wallen', icon: '🎤', performerId: '188487' }
];

function isSearchResults(payload: Performer | SearchResults | null): payload is SearchResults {
  return Boolean(payload && typeof (payload as SearchResults).events !== 'undefined');
}

function getRecommendedCardData(
  recommendation: TrendingRecommendation | null,
  result: Performer | SearchResults | null
): {
  title: string;
  subtitle?: string;
  metadata?: string;
  ctaLabel: string;
  productionId?: string;
  performerId?: string;
} | null {
  if (!recommendation || !result) return null;

  if (!isSearchResults(result)) {
    return {
      title: result.name,
      subtitle: result.league ?? undefined,
      metadata: [result.homeVenue, result.homeCity].filter(Boolean).join(' • ') || undefined,
      ctaLabel: 'View performer',
      performerId: result.id
    };
  }

  const recommendedEvent = result.events?.[0];
  if (recommendedEvent) {
    return {
      title: recommendedEvent.name,
      subtitle: [recommendedEvent.venueName, recommendedEvent.city]
        .filter(Boolean)
        .join(' • ') || undefined,
      metadata: recommendedEvent.localeDate
        ? new Date(recommendedEvent.localeDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : undefined,
      ctaLabel: 'View tickets',
      productionId: recommendedEvent.productionId ?? recommendedEvent.id
    };
  }

  const recommendedPerformer = result.performers?.[0];
  if (recommendedPerformer) {
    return {
      title: recommendedPerformer.name,
      subtitle: recommendedPerformer.league ?? undefined,
      metadata: [recommendedPerformer.homeVenue, recommendedPerformer.homeCity]
        .filter(Boolean)
        .join(' • ') || undefined,
      ctaLabel: 'View performer',
      performerId: recommendedPerformer.id
    };
  }

  return null;
}

export default function SearchPopover() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<TrendingRecommendation | null>(null);
  const debouncedTerm = useDebounce(term, 350);
  const navigate = useNavigate();

  const normalizedTerm = term.trim().toLowerCase();

  useEffect(() => {
    if (!normalizedTerm) {
      setSelectedRecommendation(null);
      return;
    }

    const matched = TRENDING_ITEMS.find(
      (item) => item.label.toLowerCase() === normalizedTerm || item.query?.toLowerCase() === normalizedTerm
    );
    setSelectedRecommendation(matched ?? null);
  }, [normalizedTerm]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: () => searchAll(debouncedTerm),
    enabled: debouncedTerm.trim().length > 2
  });

  const {
    data: recommendationData,
    isFetching: recommendationLoading
  } = useQuery<Performer | SearchResults | null>({
    queryKey: [
      'search-recommendation',
      selectedRecommendation?.performerId ?? selectedRecommendation?.label ?? 'none'
    ],
    queryFn: async () => {
      if (!selectedRecommendation) return null;
      if (selectedRecommendation.performerId) {
        return fetchPerformer(selectedRecommendation.performerId);
      }
      const query = selectedRecommendation.query ?? selectedRecommendation.label;
      return searchAll(query);
    },
    enabled: Boolean(selectedRecommendation)
  });

  const recommendationCard = useMemo(
    () => getRecommendedCardData(selectedRecommendation, recommendationData ?? null),
    [recommendationData, selectedRecommendation]
  );

  const showTrending = normalizedTerm.length < 3;

  const hasResults =
    (data?.events && data.events.length > 0) || (data?.performers && data.performers.length > 0);

  const handleTrendingSelect = (item: TrendingRecommendation) => {
    setTerm(item.label);
  };

  const navigateToPerformer = (performerId: string) => {
    navigate(`/performers/${performerId}`);
    setOpen(false);
  };

  const navigateToProduction = (productionId: string) => {
    navigate(`/productions/${productionId}`);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-200 hover:border-blue-500 transition-colors"
        >
          <MagnifyingGlassIcon />
          <span>Search events & teams</span>
          <kbd className="hidden md:inline-flex text-xs bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-400">
            ⌘K
          </kbd>
        </button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        sideOffset={12}
        className="w-[320px] md:w-[420px] bg-slate-900 border border-slate-800 shadow-2xl rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3">
            <MagnifyingGlassIcon className="text-slate-400" />
            <input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by team, performer or event"
              className="bg-transparent outline-none w-full text-sm py-2 placeholder:text-slate-500"
            />
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {selectedRecommendation && (
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase text-slate-500 font-semibold tracking-wide">
                <span aria-hidden className="text-base">
                  {selectedRecommendation.icon}
                </span>
                Recommendation
              </div>
              {recommendationLoading ? (
                <div className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
              ) : recommendationCard ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-sm text-slate-400 uppercase tracking-wide">
                      {selectedRecommendation.label}
                    </p>
                    <p className="text-lg font-semibold text-white">{recommendationCard.title}</p>
                    {recommendationCard.subtitle && (
                      <p className="text-xs text-slate-400">{recommendationCard.subtitle}</p>
                    )}
                    {recommendationCard.metadata && (
                      <p className="text-xs text-blue-300">{recommendationCard.metadata}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white"
                    onClick={() => {
                      if (recommendationCard.performerId) {
                        navigateToPerformer(recommendationCard.performerId);
                        return;
                      }
                      if (recommendationCard.productionId) {
                        navigateToProduction(recommendationCard.productionId);
                      }
                    }}
                  >
                    {recommendationCard.ctaLabel}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  We&apos;ll surface personalised picks as you explore trending searches.
                </p>
              )}
            </div>
          )}

          {showTrending && (
            <div className="px-4 py-3 border-b border-slate-800 space-y-3">
              <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">
                Trending
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING_ITEMS.map((item) => {
                  const isActive = selectedRecommendation?.label === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                        isActive
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-blue-500 hover:bg-slate-800/80'
                      )}
                      onClick={() => handleTrendingSelect(item)}
                    >
                      <span aria-hidden className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isFetching && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">Searching…</div>
          )}
          {!isFetching && !hasResults && term.trim().length > 2 && (
            <div className="px-4 py-6 text-center text-slate-500 text-sm">
              No results found for “{term}”.
            </div>
          )}

          {hasResults && (
            <div className="p-3 space-y-4">
              {data?.performers && data.performers.length > 0 && (
                <section>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">
                    Performers
                  </p>
                  <ul className="divide-y divide-slate-800 rounded-lg overflow-hidden border border-slate-800">
                    {data.performers.map((performer) => (
                      <li
                        key={performer.id}
                        className="bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left"
                          onClick={() => {
                            navigate(`/performers/${performer.id}`);
                            setOpen(false);
                          }}
                        >
                          <div className="w-10 h-10 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                            {performer.name
                              .split(' ')
                              .map((word) => word.at(0))
                              .join('')
                              .slice(0, 3)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-100">{performer.name}</p>
                            {performer.league && (
                              <span className="text-xs text-slate-500">{performer.league}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data?.events && data.events.length > 0 && (
                <section>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Events</p>
                  <ul className="divide-y divide-slate-800 rounded-lg overflow-hidden border border-slate-800">
                    {data.events.map((event) => (
                      <li
                        key={event.id}
                        className="bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                          onClick={() => {
                            navigate(`/productions/${event.productionId ?? event.id}`);
                            setOpen(false);
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-100">{event.name}</p>
                            <p className="text-xs text-slate-500">
                              {event.venueName}
                              {event.city ? ` • ${event.city}${event.state ? `, ${event.state}` : ''}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-blue-400">
                            {event.localeDate
                              ? new Date(event.localeDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

