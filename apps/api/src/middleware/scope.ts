import type { Request, Response, NextFunction } from 'express';

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    const scopes: string[] = (req.user as any).scope ?? [];
    if (!scopes.includes('*') && !scopes.includes(scope)) {
      return res.status(403).json({ error: 'forbidden', required_scope: scope });
    }
    return next();
  };
}
