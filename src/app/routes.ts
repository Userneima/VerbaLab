import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { FoundryPage } from './pages/FoundryPage';
import { LabPage } from './pages/LabPage';
import { FieldPage } from './pages/FieldPage';
import { CorpusPage } from './pages/CorpusPage';
import { ErrorBankPage } from './pages/ErrorBankPage';
import { StuckPointsPage } from './pages/StuckPointsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'foundry', Component: FoundryPage },
      { path: 'lab', Component: LabPage },
      { path: 'field', Component: FieldPage },
      { path: 'corpus', Component: CorpusPage },
      { path: 'errors', Component: ErrorBankPage },
      { path: 'stuck', Component: StuckPointsPage },
    ],
  },
]);