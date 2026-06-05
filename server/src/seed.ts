import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { logger } from './logger';

export async function seedAdmin(username: string, password: string): Promise<void> {
  const normalized = username.toLowerCase();
  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    logger.info({ username: existing.username }, 'Admin user already present, skipping seed');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ username: normalized, passwordHash, role: 'admin' });
  logger.warn(
    { username: normalized },
    'Created initial admin user from ADMIN_USERNAME/ADMIN_PASSWORD. Change the password before any non-local deployment.'
  );
}
