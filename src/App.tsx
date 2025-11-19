import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import PerformersPage from './pages/PerformersPage';
import PerformerDetailPage from './pages/PerformerDetailPage';
import ProductionPage from './pages/ProductionPage';
import AnalyticsPage from './pages/AnalyticsPage';
import './index.css';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/performers" element={<PerformersPage />} />
        <Route path="/performers/:performerId" element={<PerformerDetailPage />} />
        <Route path="/productions/:productionId" element={<ProductionPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
