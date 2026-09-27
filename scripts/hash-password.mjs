// Uso: npm run hash-password -- "MiContraseña"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "<contraseña>"');
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
console.log(`scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
