import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { CreatePage } from './pages/CreatePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { CaseListPage } from './pages/CaseListPage.jsx';
import { InvestigationPage } from './pages/InvestigationPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/cases" element={<CaseListPage />} />
        <Route path="/investigation/:caseId" element={<InvestigationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
