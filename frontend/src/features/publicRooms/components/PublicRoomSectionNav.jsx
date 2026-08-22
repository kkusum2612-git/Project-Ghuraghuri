import {
  NavLink,
} from 'react-router-dom';

function PublicRoomSectionNav({
  roomId,
  showChat = false,
}) {
  const navItems = [
    {
      label: 'Overview',
      to: `/event-rooms/${roomId}`,
      end: true,
    },
  ];

  if (showChat) {
    navItems.push({
      label: 'Chat',
      to: `/event-rooms/${roomId}/chat`,
    });
  }

  return (
    <nav
      aria-label="Public room sections"
      className="mb-6 flex flex-wrap gap-2 border-b border-slate-200"
    >
      {navItems.map(
        (item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({
              isActive,
            }) =>
              [
                'border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-[#0F6B4D] text-[#0F6B4D]'
                  : 'border-transparent text-slate-500 hover:text-[#0F6B4D]',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  );
}

export default PublicRoomSectionNav;