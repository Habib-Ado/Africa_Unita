import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Percorso base per gli upload (avatar, content, posts).
 * Usa UPLOAD_DIR per persistenza su Railway (es. Volume montato: UPLOAD_DIR=/data).
 */
export const uploadBase = process.env.UPLOAD_DIR
    ? (path.isAbsolute(process.env.UPLOAD_DIR) ? process.env.UPLOAD_DIR : path.join(__dirname, '..', process.env.UPLOAD_DIR))
    : path.join(__dirname, '../uploads');
