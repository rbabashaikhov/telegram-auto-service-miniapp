import 'dotenv/config';
import { db } from './schema.js';
import { applySchema } from './schema.js';
import { resetAndSeed } from './seed.js';

applySchema(db);
resetAndSeed(db);
console.log('Demo database reset and seeded');
