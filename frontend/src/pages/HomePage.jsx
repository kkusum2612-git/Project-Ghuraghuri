import { Link } from 'react-router-dom';

import useAuth from '../features/auth/hooks/useAuth';


// Sends each logged-in role to its main workspace.
const ROLE_HOME_ROUTES = {
  traveler: '/trips',
  hotel: '/hotel/dashboard',
  guide: '/guide/dashboard',
  admin: '/admin',
};


const features = [
  {
    number: '01',
    title: 'Plan your trip',
    description:
      'Create trips, organize daily stops, and view your travel route on an interactive map.',
  },
  {
    number: '02',
    title: 'Find hotels',
    description:
      'Search hotels, check availability for your dates, and manage your bookings.',
  },
  {
    number: '03',
    title: 'Book local guides',
    description:
      'Discover tour guides, explore their packages, and request a booking.',
  },
  {
    number: '04',
    title: 'Travel together',
    description:
      'Join public event rooms, meet travelers, manage members, and chat with your group.',
  },
];


function HomePage() {
  const {
    user,
    isAuthenticated,
    isInitializing,
  } = useAuth();

  const hasActiveSession =
    !isInitializing && isAuthenticated;

  // checks if the user who's logged in, is an administrator 

  const isAdmin =
  hasActiveSession && user?.role === 'admin';

  const isHotel =
  hasActiveSession && user?.role === 'hotel';

  const primaryRoute = hasActiveSession
    ? ROLE_HOME_ROUTES[user?.role] || '/'
    : '/register';

  const primaryLabel = hasActiveSession
    ? 'Open My Workspace'
    : 'Start Planning';

  const canViewPremium =
    !hasActiveSession || user?.role === 'traveler';

  
  if (isAdmin) {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-200 bg-[#F7FAF8]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#0F6B4D]">
            Ghuraghuri Administration
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Admin Control Center
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Review provider applications and manage access for hotels
            and tour guides across the Ghuraghuri platform.
          </p>

          <Link
            to="/admin"
            className="mt-8 inline-block rounded-lg bg-[#0F6B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
          >
            Open Admin Dashboard
          </Link>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-[#0F6B4D]">
              Provider Applications
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Review pending providers
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Check hotel and guide registration applications before
              allowing them to use provider features.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-[#0F6B4D]">
              Access Management
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Approve or reject access
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Control which verified hotel vendors and tour guides
              can operate on the platform.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

  // adding different landing page for hotel


  if (isHotel) {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-200 bg-[#F7FAF8]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#0F6B4D]">
            Ghuraghuri Administration
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Hotel Dashboard
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Publish your hotels and facilities across the Ghuraghuri platform.
            Approve or Decline any incoming client bookings.
          </p>

          <Link
            to="/hotel/dashboard"
            className="mt-8 inline-block rounded-lg bg-[#0F6B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
          >
            Open Hotel Dashboard
          </Link>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-[#0F6B4D]">
              Booking Applications
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Review pending bookings
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Check hotel bookings before
              allowing clients to confirm their stay.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-6">
            <p className="text-sm font-semibold text-[#0F6B4D]">
              Hotel Listings
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Publish or Unpublish your hotels 
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Create postings for all your hotels and unpublish them
              at your will.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

  
  return (
    <div className="bg-white">
      {/* Main introduction to Ghuraghuri. */}
      <section className="border-b border-slate-200 bg-[#F7FAF8]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#0F6B4D]">
              Explore Bangladesh
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Travel planning,
              <span className="text-[#0F6B4D]">
                {' '}made easier.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Plan your journey, find places to stay, book local
              guides, and connect with other travelers from one
              simple platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryRoute}
                className="rounded-lg bg-[#0F6B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
              >
                {primaryLabel}
              </Link>

              <Link
                to="/hotels"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explore Hotels
              </Link>

              <Link
                to="/trips"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Make Trips
              </Link>

            </div>
          </div>


          {/* Simple summary card keeps the hero informative without making it busy. */}
          <div className="rounded-2xl border border-[#DCE5E0] bg-white p-7 shadow-sm sm:p-9">
            <p className="text-sm font-semibold text-[#0F6B4D]">
              One travel platform
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Everything you need for your journey
            </h2>

            <div className="mt-7 space-y-5">
              <div className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF7F2] text-sm font-bold text-[#0F6B4D]">
                  ✓
                </span>

                <div>
                  <p className="font-semibold text-slate-800">
                    Plan
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Build trips and organize your daily travel plans.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF7F2] text-sm font-bold text-[#0F6B4D]">
                  ✓
                </span>

                <div>
                  <p className="font-semibold text-slate-800">
                    Book
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Find hotels and local guides for your destination.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF7F2] text-sm font-bold text-[#0F6B4D]">
                  ✓
                </span>

                <div>
                  <p className="font-semibold text-slate-800">
                    Connect
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Meet travelers through public event rooms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Overview of the main traveler features. */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#0F6B4D]">
              What you can do
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Plan your trip from one place
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Ghuraghuri combines the important parts of travel
              planning into a single experience.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <p className="text-sm font-bold text-[#0F6B4D]">
                  {feature.number}
                </p>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>


      {/* Premium is shown as a small secondary section instead of a large promotional block. */}
      {canViewPremium && (
        <section className="border-y border-slate-200 bg-[#F7FAF8] px-6 py-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#0F6B4D]">
                Ghuraghuri Premium
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Plan smarter with AI and rewards
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Premium travelers can generate AI travel plans
                and use reward points for booking discounts.
              </p>
            </div>

            <Link
              to={
                hasActiveSession
                  ? '/premium'
                  : '/register'
              }
              className="w-fit rounded-lg border border-[#0F6B4D] px-5 py-3 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
            >
              {hasActiveSession
                ? 'View Premium'
                : 'Create Account'}
            </Link>
          </div>
        </section>
      )}


      {/* Final lightweight call-to-action. */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to start exploring?
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Keep your planning, bookings, and travel connections
            together with Ghuraghuri.
          </p>

          <Link
            to={primaryRoute}
            className="mt-7 inline-block rounded-lg bg-[#0F6B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>


      <footer className="border-t border-slate-200 bg-[#F7FAF8] px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Ghuraghuri — Plan. Explore. Enjoy.
          </p>

          <p>
            CSE471 Group 04 · Summer 2026
          </p>
        </div>
      </footer>
    </div>
  );
}


export default HomePage;