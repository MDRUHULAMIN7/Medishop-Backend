import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export const signJwt = <T extends object>(payload: T, secret: string, expiresIn: SignOptions['expiresIn']) =>
  jwt.sign(payload, secret, { expiresIn });

export const verifyJwt = <T extends JwtPayload>(token: string, secret: string) => jwt.verify(token, secret) as T;
