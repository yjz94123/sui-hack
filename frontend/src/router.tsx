import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MarketList from './pages/MarketList';
import { MarketDetailPage } from './pages/MarketDetailPage';
import Portfolio from './pages/Portfolio';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<MarketList />} />
        <Route path="market/:eventId" element={<MarketDetailPage />} />
        <Route path="portfolio" element={<Portfolio />} />
      </Route>
    </Routes>
  );
};
