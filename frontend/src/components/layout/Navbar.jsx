import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="text-xl font-bold text-emerald-700">
          Ghuraghuri
        </Link>

        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          Project Scaffold
        </div>
      </div>
    </header>
  );
}

export default Navbar;
