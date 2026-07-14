const currentScope = [
  {
    title: 'Common Workflows',
    items: ['Registration and Login', 'Admin Role and Access Management'],
  },
  {
    title: 'Module 1',
    items: [
      'Trip Dashboard and Management',
      'Hotel Vendor Listing Management',
      'Guide Registration and Listing Management',
      'Public Event Room Creation and Discovery',
    ],
  },
];

function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-700">
          CSE471 Group 04
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Ghuraghuri development environment is ready
        </h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          This shared foundation will be used for the common workflows and Module 1 features.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {currentScope.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>

            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
