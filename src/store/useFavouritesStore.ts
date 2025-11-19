import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addFavourite, deleteFavourite, fetchFavourites } from '../api/client';

export interface FavouriteTeam {
  _id: string;
  performerId: string;
  performerName: string;
  performerImage?: string;
  league?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface FavouritesState {
  userId: string;
  teams: FavouriteTeam[];
  loading: boolean;
  error?: string;
  initialise: () => Promise<void>;
  addTeam: (team: Omit<FavouriteTeam, '_id'>) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;
}

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set, get) => ({
      userId: crypto.randomUUID(),
      teams: [],
      loading: false,
      async initialise() {
        const { userId } = get();
        set({ loading: true, error: undefined });
        try {
          const teams = await fetchFavourites(userId);
          set({ teams, loading: false });
        } catch (error) {
          console.error('Failed to fetch favourites', error);
          set({ error: 'Unable to load favourites', loading: false });
        }
      },
      async addTeam(team) {
        const { userId, teams } = get();
        set({ loading: true, error: undefined });
        try {
          const created = await addFavourite({
            userId,
            performerId: team.performerId,
            performerName: team.performerName,
            performerImage: team.performerImage,
            league: team.league,
            metadata: team.metadata
          });
          set({ teams: [created, ...teams], loading: false });
        } catch (error) {
          console.error('Failed to create favourite', error);
          set({ error: 'Unable to add favourite', loading: false });
        }
      },
      async removeTeam(id) {
        const { teams } = get();
        set({ loading: true, error: undefined });
        try {
          await deleteFavourite(id);
          set({ teams: teams.filter((team) => team._id !== id), loading: false });
        } catch (error) {
          console.error('Failed to delete favourite', error);
          set({ error: 'Unable to remove favourite', loading: false });
        }
      }
    }),
    {
      name: 'vivid-favourites',
      partialize: (state) => ({
        userId: state.userId
      })
    }
  )
);

