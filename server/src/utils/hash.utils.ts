import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashedOrPlain: string): Promise<boolean> => {
  if (!password || !hashedOrPlain) return false;
  
  // If stored password is already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (hashedOrPlain.startsWith('$2a$') || hashedOrPlain.startsWith('$2b$') || hashedOrPlain.startsWith('$2y$')) {
    return bcrypt.compare(password, hashedOrPlain);
  }
  
  // Fallback direct string match for pre-existing seed/legacy accounts
  return password === hashedOrPlain;
};
