export interface Performer {
  id: string;
  name: string;
  imageUrl?: string;
  league?: string;
  homeCity?: string;
  homeVenue?: string;
  nextEventDate?: string;
}

export interface Event {
  id: string;
  name: string;
  localeDate?: string;
  venueName?: string;
  city?: string;
  state?: string;
  performer?: Performer;
  productionId?: string;
  lowestPrice?: number;
  ticketCount?: number;
  imageUrl?: string;
  type?: string;
}

export interface Production {
  id: string;
  name: string;
  date?: string;
  venue?: string;
  city?: string;
  state?: string;
  performers?: Performer[];
  metadata?: Record<string, unknown>;
}

export interface TicketListing {
  id: string;
  section?: string;
  row?: string;
  zone?: string;
  quantity: number;
  price: number;
  listingType?: string;
  attributes?: string[];
  score?: number;
}

export interface ZoneSummary {
  zone: string;
  lowestPrice: number;
  lowestPairPrice?: number;
  lowestGroupPrice?: number;
  totalTickets: number;
  totalListings: number;
  sections: string[];
}

export interface SearchResults {
  events: Event[];
  performers: Performer[];
}

export interface ZoneQuantityDetail {
  quantity: number;
  lowestPrice: number;
  sampleListing?: Record<string, unknown>;
}

export interface ZoneSummaryZone {
  zone: string;
  sections: string[];
  totalTickets: number;
  totalListings: number;
  lowestPrice: Record<string, number>;
  quantities: ZoneQuantityDetail[];
}

export interface ProductionZoneSummary {
  productionId: string;
  capturedAt: string;
  quantities: number[];
  totals: {
    totalTickets: number;
    totalListings: number;
  };
  zones: ZoneSummaryZone[];
}

