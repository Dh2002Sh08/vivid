import axios from 'axios';
import type {
  Event,
  Performer,
  ProductionZoneSummary,
  SearchResults,

} from './types';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 15000
});

// src/api/client.ts
function mapEvent(raw: any): Event {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    productionId: raw.productionId,
    name: raw.name ?? 'Unknown Event',
    localeDate: raw.localeDate,
    venueName: raw.venueName,
    city: raw.city,
    state: raw.state,
    imageUrl: raw.imageUrl,
    lowestPrice: raw.lowestPrice,
    performer: raw.performer
      ? {
          id: raw.performer.id,
          name: raw.performer.name,
          imageUrl: raw.performer.imageUrl,
          league: raw.performer.league,
        }
      : undefined,
  };
}



function mapPerformer(raw: any): Performer {
  return {
    id: String(raw.id ?? raw.performerId ?? raw.slug ?? ''),
    name: raw.name ?? raw.displayName ?? 'Performer',
    imageUrl: raw.image ?? raw.imageUrl,
    league: raw.league ?? raw.primaryCategory,
    homeCity: raw.homeCity,
    homeVenue: raw.homeVenue,
    nextEventDate: raw.nextEventDate ?? raw.next_event_date
  };
}

export async function fetchEvents(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get('/events', { params });
  const events = response.data?.events ?? response.data ?? [];
  return Array.isArray(events) ? events.map(mapEvent) : [];
}

export async function fetchPerformer(performerId: string, params?: Record<string, unknown>) {
  const response = await api.get(`/performer/${performerId}`, { params });
  const performers = response.data?.performer ?? response.data;
  if (Array.isArray(performers)) {
    return performers.map(mapPerformer)[0];
  }
  return mapPerformer(performers);
}

export const fetchProduction = (id: string) =>
  api.get(`/production/${id}`).then(r => r.data);

export const fetchTickets = (id: string, params = {}) =>
  api.get(`/production/${id}/tickets`, { params }).then(r => r.data);

// src/api/client.ts

export async function searchEvents(query: string) {
  const response = await api.get('/search', { params: { q: query } });
  const events = response.data?.events ?? [];
  return Array.isArray(events) ? events.map(mapEvent) : [];
}

export async function searchAll(query: string) {
  const response = await api.get<SearchResults>('/search', { params: { q: query } });
  return {
    events: response.data.events?.map(mapEvent) ?? [],
    performers: response.data.performers?.map(mapPerformer) ?? []
  };
}

export async function fetchFavourites(userId: string) {
  const response = await api.get('/favourites', { params: { userId } });
  return response.data;
}

export async function addFavourite(payload: {
  userId: string;
  performerId: string;
  performerName: string;
  performerImage?: string;
  league?: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await api.post('/favourites', payload);
  return response.data;
}

export async function deleteFavourite(id: string) {
  await api.delete(`/favourites/${id}`);
}

export async function fetchProductionZoneSummary(
  productionId: string,
  options?: { quantities?: number[]; params?: Record<string, string | number | undefined> }
) {
  const params = {
    ...(options?.params ?? {}),
    ...(options?.quantities?.length
      ? { quantities: options.quantities.map(String).join(',') }
      : {})
  };
  const response = await api.get<ProductionZoneSummary>(
    `/production/${productionId}/zone-summary`,
    { params }
  );
  return response.data;
}

// src/api/client.ts
export async function fetchZoneSummary(productionId: string) {
  if (!productionId) throw new Error("Production ID is required");

  try {
    const res = await fetch(`/api/production/${productionId}/zone-summary`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch zone summary: ${res.status} - ${text}`);
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error("Error in fetchZoneSummary:", error.message);
    throw new Error(error.message || "Failed to load production zone summary");
  }
}
