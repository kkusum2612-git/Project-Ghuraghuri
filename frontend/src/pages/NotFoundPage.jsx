import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-emerald-700">404</p>

      <h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1>

      <p className="mt-3 text-slate-600">The page you requested does not currently exist.</p>

      <Link
        to="/"
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Return home
      </Link>
    </section>
  );
}

export default NotFoundPage;
