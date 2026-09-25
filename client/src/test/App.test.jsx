import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { store } from '../store';
import App from '../app/App';

describe('App shell', () => {
  it('renders the navigation and redirects an unauthenticated visitor to login', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Academic Connect')).toBeInTheDocument();
    // "/" -> "/dashboard" (index redirect) -> "/login" (ProtectedRoute, unauthenticated)
    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });
});
