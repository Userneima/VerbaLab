import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'foundry',
        lazy: () => import('./pages/FoundryPage').then(m => ({ Component: m.FoundryPage })),
      },
      {
        path: 'lab',
        lazy: () => import('./pages/LabPage').then(m => ({ Component: m.LabPage })),
      },
      {
        path: 'field',
        lazy: () => import('./pages/FieldPage').then(m => ({ Component: m.FieldPage })),
      },
      {
        path: 'word-lab',
        lazy: () => import('./pages/WordLabPage').then(m => ({ Component: m.WordLabPage })),
      },
      {
        path: 'vocab-review',
        lazy: () => import('./pages/VocabReviewPage').then(m => ({ Component: m.VocabReviewPage })),
      },
      {
        path: 'vocab/:id',
        lazy: () =>
          import('./pages/VocabCardDetailPage').then(m => ({ Component: m.VocabCardDetailPage })),
      },
      {
        path: 'corpus',
        lazy: () => import('./pages/CorpusPage').then(m => ({ Component: m.CorpusPage })),
      },
      {
        path: 'errors',
        lazy: () => import('./pages/ErrorBankPage').then(m => ({ Component: m.ErrorBankPage })),
      },
      {
        path: 'stuck',
        lazy: () => import('./pages/StuckPointsPage').then(m => ({ Component: m.StuckPointsPage })),
      },
    ],
  },
]);
