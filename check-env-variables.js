// Check Environment Variables on Railway
import { config } from './backend/config.js';

function checkEnvironmentVariables() {
    console.log('🔍 Checking Railway Environment Variables...');
    console.log('');

    // 1. Check DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
        console.log('✅ DATABASE_URL: Present');
        console.log(`   Value: ${databaseUrl.substring(0, 20)}...`);
    } else {
        console.log('❌ DATABASE_URL: Missing');
        console.log('💡 Railway should provide this automatically');
    }

    // 2. Check JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
        console.log('✅ JWT_SECRET: Present');
        console.log(`   Length: ${jwtSecret.length} characters`);
    } else {
        console.log('❌ JWT_SECRET: Missing');
        console.log('💡 Add this in Railway dashboard under Variables');
    }

    // 3. Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv) {
        console.log(`✅ NODE_ENV: ${nodeEnv}`);
    } else {
        console.log('⚠️  NODE_ENV: Not set (defaults to development)');
    }

    // 4. Check CORS_ORIGIN
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin) {
        console.log(`✅ CORS_ORIGIN: ${corsOrigin}`);
    } else {
        console.log('⚠️  CORS_ORIGIN: Not set (will auto-detect)');
    }

    // 5. Check Railway specific variables
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (railwayDomain) {
        console.log(`✅ RAILWAY_PUBLIC_DOMAIN: ${railwayDomain}`);
    } else {
        console.log('⚠️  RAILWAY_PUBLIC_DOMAIN: Not set');
    }

    // 6. Check database configuration
    console.log('');
    console.log('🗄️ Database Configuration:');
    console.log(`   URL: ${config.database.url ? 'Present' : 'Missing'}`);
    console.log(`   Host: ${config.database.host}`);
    console.log(`   Port: ${config.database.port}`);
    console.log(`   Database: ${config.database.name}`);

    // 7. Recommendations
    console.log('');
    console.log('📋 Recommendations:');
    
    if (!databaseUrl) {
        console.log('❌ Add DATABASE_URL in Railway dashboard');
    }
    
    if (!jwtSecret) {
        console.log('❌ Add JWT_SECRET in Railway dashboard');
        console.log('   Use a strong, random secret key');
    }
    
    if (!corsOrigin) {
        console.log('💡 Consider adding CORS_ORIGIN for better security');
    }

    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Go to Railway dashboard');
    console.log('2. Click on "Variables"');
    console.log('3. Add missing variables');
    console.log('4. Redeploy if needed');
}

checkEnvironmentVariables();
