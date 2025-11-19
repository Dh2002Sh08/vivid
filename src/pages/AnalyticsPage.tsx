import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductionZoneSummary } from '../api/client';
import type { ProductionZoneSummary } from '../api/types';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const PRESET_PRODUCTIONS: Array<{ productionId: string; label: string }> = [
  {
    productionId: '5679537',
    label: 'Chris Brown • Bobby Dodd Stadium (Oct 3, 2025)'
  },
  {
    productionId: '5768463',
    label: 'Billie Eilish • Moody Center ATX (Nov 13, 2025)'
  },
  {
    productionId: '4925388',
    label: 'BravoCon • Caesars Forum (Nov 14, 2025)'
  },
  {
    productionId: '5953837',
    label: 'Backstreet Boys • Sphere at Venetian (Feb 6, 2026)'
  }
];

const QUANTITY_OPTIONS = [1, 2, 4];

export default function AnalyticsPage() {
  const [inputProductionId, setInputProductionId] = useState(PRESET_PRODUCTIONS[0].productionId);
  const [productionId, setProductionId] = useState(PRESET_PRODUCTIONS[0].productionId);
  const [selectedQuantities, setSelectedQuantities] = useState<number[]>([1, 2, 4]);

  const { data: summary, isLoading, isError, refetch, isFetching } = useQuery<ProductionZoneSummary, Error>({
    queryKey: ['zone-summary', productionId, selectedQuantities.join(',')] as const,
    queryFn: () => fetchProductionZoneSummary(productionId, { quantities: selectedQuantities }),
    enabled: Boolean(productionId)
  });

  const sortedZones = useMemo(() => {
    if (!summary) return [];
    return [...summary.zones].sort((a, b) => a.zone.localeCompare(b.zone));
  }, [summary]);

  const toggleQuantity = (quantity: number) => {
    setSelectedQuantities((previous) => {
      const exists = previous.includes(quantity);
      if (exists && previous.length === 1) return previous;
      const updated = exists ? previous.filter((value) => value !== quantity) : [...previous, quantity];
      return updated.sort((a, b) => a - b);
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase text-blue-400 tracking-[0.3em]">Live Data Explorer</p>
        <h1 className="text-3xl font-semibold text-white">Zone-level pricing snapshots</h1>
        <p className="text-sm text-slate-400">
          Pull real-time pricing and availability data directly from Vivid Seats for tracked productions. Use the
          controls below to explore different events and quantity filters (1, 2, 4 tickets).
        </p>
      </header>

      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-lg">
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (inputProductionId.trim()) {
              setProductionId(inputProductionId.trim());
            }
          }}
        >
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-400">
              Choose a tracked production
              <select
                value={productionId}
                onChange={(event) => {
                  setProductionId(event.target.value);
                  setInputProductionId(event.target.value);
                }}
                className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRESET_PRODUCTIONS.map((production) => (
                  <option key={production.productionId} value={production.productionId}>
                    {production.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-400">
              Or load a custom production ID
              <div className="flex gap-2">
                <input
                  value={inputProductionId}
                  onChange={(event) => setInputProductionId(event.target.value)}
                  placeholder="e.g. 5679537"
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-white"
                >
                  Load
                </button>
              </div>
            </label>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Ticket quantities</p>
              <div className="flex flex-wrap gap-2">
                {QUANTITY_OPTIONS.map((quantity) => {
                  const active = selectedQuantities.includes(quantity);
                  return (
                    <button
                      key={quantity}
                      type="button"
                      onClick={() => toggleQuantity(quantity)}
                      className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                        active
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-blue-500 hover:bg-slate-800/80'
                      }`}
                    >
                      {quantity} ticket{quantity > 1 ? 's' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <header className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Snapshot details</p>
              <h3 className="text-lg font-semibold text-white">
                {PRESET_PRODUCTIONS.find((item) => item.productionId === productionId)?.label ??
                  `Production ${productionId}`}
              </h3>
            </header>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Total tickets: {summary?.totals.totalTickets?.toLocaleString() ?? '—'}</li>
              <li>Listings captured: {summary?.totals.totalListings?.toLocaleString() ?? '—'}</li>
              <li>
                Quantities requested:{' '}
                {selectedQuantities.length ? selectedQuantities.join(', ') : 'Add at least one quantity'}
              </li>
              <li>
                Snapshot captured:{' '}
                {summary?.capturedAt
                  ? `${new Date(summary.capturedAt).toLocaleString()}`
                  : 'Pending'}
              </li>
            </ul>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-semibold text-blue-300 hover:text-blue-200 underline underline-offset-4"
              disabled={isFetching}
            >
              Refresh snapshot
            </button>
          </div>
        </form>

        <div className="border-t border-slate-800 pt-6">
          {isLoading ? (
            <div className="h-48 bg-slate-950/40 rounded-2xl animate-pulse" />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
              Failed to load data from Vivid Seats. Please verify the production ID and try again.
            </div>
          ) : sortedZones.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
              No zone data returned for this snapshot.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-slate-800 rounded-2xl overflow-hidden text-sm">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Zone / Section</th>
                    <th className="px-4 py-3 text-left">Sections detected</th>
                    <th className="px-4 py-3 text-right">Total tickets</th>
                    <th className="px-4 py-3 text-right">Listings</th>
                    {selectedQuantities.map((quantity) => (
                      <th key={quantity} className="px-4 py-3 text-right">
                        {quantity === 1 ? 'Single' : `${quantity} tickets`} price
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedZones.map((zone) => {
                    const priceByQuantity = Object.fromEntries(
                      zone.quantities.map((item) => [item.quantity, item.lowestPrice])
                    );
                    return (
                      <tr key={zone.zone} className="bg-slate-950/40 hover:bg-slate-900/70 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{zone.zone}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {zone.sections.length ? zone.sections.join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {zone.totalTickets.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {zone.totalListings.toLocaleString()}
                        </td>
                        {selectedQuantities.map((quantity) => (
                          <td key={quantity} className="px-4 py-3 text-right text-blue-300 font-semibold">
                            {priceByQuantity[quantity] ? formatter.format(priceByQuantity[quantity]) : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Data capture & ingestion</h2>
        <ul className="space-y-3 text-sm text-slate-300 list-disc list-inside">
          <li>
            A scheduled collector (Cloud Run job / Lambda + EventBridge) polls Vivid Seats public endpoints every 10–20
            minutes for tracked productions.
          </li>
          <li>
            For each snapshot we capture zone-level metrics: cheapest price, cheapest pairs/quads, ticket counts, and
            listing totals. Raw payloads are archived in object storage (S3/GCS) for audit replay.
          </li>
          <li>
            Cleaned facts stream through Kafka/PubSub into a warehouse (Snowflake, BigQuery, ClickHouse) partitioned by
            snapshot timestamp and clustered by event/zone.
          </li>
        </ul>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Model & serving layer</h2>
        <ul className="space-y-3 text-sm text-slate-300 list-disc list-inside">
          <li>
            dbt/Airflow orchestrates transformations to materialise fact tables (`fact_ticket_snapshot`) and dimensions
            (`dim_event`, `dim_zone`) supporting 4-month time-range queries.
          </li>
          <li>
            Materialised views and rollups power three core charts: lowest price trend, lowest group price trend (2/4
            tickets), and ticket availability over time.
          </li>
          <li>
            API gateway or BI tool (Looker, Tableau, Metabase) exposes filterable dashboards by event, zone, and time.
          </li>
        </ul>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Scalability considerations</h2>
        <ul className="space-y-3 text-sm text-slate-300 list-disc list-inside">
          <li>
            Tracking 100 events at 10-minute intervals produces millions of rows monthly; columnar storage and partition
            pruning ensure sub-second aggregations.
          </li>
          <li>
            TTL policies archive historical partitions beyond four months to glacier storage while preserving summary
            aggregates.
          </li>
          <li>
            Metric extensibility is built in: new attributes (city, custom zones) land in the same schema without
            breaking downstream dashboards.
          </li>
        </ul>
      </section>
    </div>
  );
}

