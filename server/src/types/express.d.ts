export interface AuthContext {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
