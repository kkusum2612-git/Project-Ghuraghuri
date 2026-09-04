# Ghuraghuri Coding Conventions

## Naming

- React components use PascalCase: `TripCard.jsx`
- Functions and variables use camelCase: `createTrip`
- Constants use UPPER_SNAKE_CASE: `DEFAULT_PAGE_SIZE`
- Backend models use singular PascalCase: `Trip.js`
- API routes use lowercase plural nouns: `/api/v1/trips`

## Frontend

- Shared UI belongs in `src/components/common`
- Feature-specific UI belongs in `src/features`
- API requests must use `src/api/axiosClient.js`
- Pages should not directly access MongoDB or external APIs

## Backend

- Routes define endpoint paths
- Controllers handle requests and responses
- Services contain business logic
- Models define MongoDB data
- Middleware handles authentication, validation, and errors

## Git

- Do not commit `.env`
- Do not commit `node_modules`
- Work only in a feature branch
- Use meaningful commit messages
