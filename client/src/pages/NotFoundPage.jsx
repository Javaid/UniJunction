import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="mx-auto max-w-md text-center">
    <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
    <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist.</p>
    <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-700">
      Return to dashboard
    </Link>
  </div>
);

export default NotFoundPage;
