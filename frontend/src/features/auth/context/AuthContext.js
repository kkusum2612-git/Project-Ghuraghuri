import { createContext } from 'react';

// The initial value is null.
//
// The useAuth hook will detect this null value and produce a clear error when
// a component tries to use authentication outside AuthProvider.
const AuthContext = createContext(null);

export default AuthContext;