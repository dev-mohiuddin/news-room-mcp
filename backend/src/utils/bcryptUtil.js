import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (candidate, hashed) => {
  return bcrypt.compare(candidate, hashed);
};

export const generateSalt = async (rounds = SALT_ROUNDS) => bcrypt.genSalt(rounds);
