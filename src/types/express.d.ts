import { UserRole } from '../modules/user/user.types';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: UserRole;
      sessionId: string;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
