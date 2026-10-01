import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { signToken } from '../utils/jwt';

export async function registerUser(username: string, email: string, password: string) {
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    const err: any = new Error('Email or username already in use');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { username, email, passwordHash } });
  const token = signToken(user.id);
  return { user: sanitize(user), token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (user.isBanned) {
    const err: any = new Error('Your account has been suspended.');
    err.status = 403;
    throw err;
  }
  const token = signToken(user.id);
  return { user: sanitize(user), token };
}

function sanitize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}