import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AppRouter } from './routes';
import { Layout } from './components/Layout';

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <Layout>
          <AppRouter />
        </Layout>
      </QueryProvider>
    </BrowserRouter>
  );
}