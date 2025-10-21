#!/usr/bin/env node

/**
 * Script per generare chiavi segrete sicure per JWT e sessioni
 * Esegui con: node scripts/generateSecrets.js
 */

import crypto from 'crypto';

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('🔐 Generatore di Chiavi Segrete');
console.log('═══════════════════════════════════════════════');
console.log('');

// Genera JWT Secret (256 bit / 32 bytes)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (da usare nelle variabili d\'ambiente):');
console.log('─'.repeat(70));
console.log(jwtSecret);
console.log('');

// Genera Session Secret (256 bit / 32 bytes)
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET (opzionale, per sessioni):');
console.log('─'.repeat(70));
console.log(sessionSecret);
console.log('');

// Genera API Key (se necessario in futuro)
const apiKey = crypto.randomBytes(24).toString('hex');
console.log('API_KEY (opzionale, per integrazioni API):');
console.log('─'.repeat(70));
console.log(apiKey);
console.log('');

console.log('═══════════════════════════════════════════════');
console.log('✅ Chiavi generate con successo!');
console.log('');
console.log('📋 Copia e incolla queste chiavi nelle variabili');
console.log('   d\'ambiente su Railway o nel tuo file .env');
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('   - NON condividere queste chiavi pubblicamente');
console.log('   - NON committarle nel repository Git');
console.log('   - Usa chiavi diverse per sviluppo e produzione');
console.log('═══════════════════════════════════════════════');
console.log('');

