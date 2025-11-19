import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import SearchPopover from './SearchPopover';
import VividLogo from './VividLogo';
import { useFavouritesStore } from '../store/useFavouritesStore';

const navLinkClass =
  'text-sm font-medium text-slate-200 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800/70';

export default function Layout() {
  const navigate = useNavigate();
  const initialiseFavourites = useFavouritesStore((state) => state.initialise);  
  // try thi neewd to fix the error

  useEffect(() => {
    initialiseFavourites();
  }, [initialiseFavourites]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4 gap-4">
          <button
            type="button"
            className="flex items-center gap-3 group"
            onClick={() => navigate('/')}
          >
            <VividLogo className="w-10 h-10" />
            <div className="text-left">
              <p className="text-lg font-semibold tracking-tight group-hover:text-blue-400">
                TWS Vivid Seats
              </p>
              <span className="text-xs text-slate-400 uppercase tracking-[0.2em]">
                Tickets & Experiences
              </span>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={({ isActive }) => (isActive ? `${navLinkClass} bg-slate-800` : navLinkClass)}>
              Home
            </NavLink>
            <NavLink
              to="/events"
              className={({ isActive }) => (isActive ? `${navLinkClass} bg-slate-800` : navLinkClass)}
            >
              Events
            </NavLink>
            <NavLink
              to="/performers"
              className={({ isActive }) => (isActive ? `${navLinkClass} bg-slate-800` : navLinkClass)}
            >
              Performers
            </NavLink>
          </nav>
          <SearchPopover />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-sm text-slate-400">
          <div>
            <VividLogo className="w-8 h-8 mb-3" />
            <p>
              TWS Vivid Seats connects fans with unforgettable live events. Discover concerts, sports, and theater
              experiences tailored for you.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <NavLink to="/events" className="hover:text-blue-400">
                  Event Listings
                </NavLink>
              </li>
              <li>
                <NavLink to="/performers" className="hover:text-blue-400">
                  Performers & Teams
                </NavLink>
              </li>
              <li>
                <NavLink to="/analytics" className="hover:text-blue-400">
                  Analytics
                </NavLink>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Stay in the Loop</h4>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
                type="email"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 transition-colors rounded-md px-4 py-2 text-white font-semibold"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="text-center text-xs text-slate-500 mt-8">
          © {new Date().getFullYear()} TWS Vivid Seats. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

