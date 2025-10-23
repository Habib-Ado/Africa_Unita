// Fix Database Configuration for Railway
import { config } from './backend/config.js';

function debugDatabaseConfig() {
    console.log('🔍 Debugging database configuration...');
    console.log('');

    // 1. Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Present' : 'Missing'}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'Not set'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 'Not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'Not set'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'Not set'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? 'Present' : 'Not set'}`);
    console.log('');

    // 2. Check config object
    console.log('📋 Config Object:');
    console.log(`   Database URL: ${config.database.url || 'Not set'}`);
    console.log(`   Database Host: ${config.database.host}`);
    console.log(`   Database Port: ${config.database.port}`);
    console.log(`   Database Name: ${config.database.name}`);
    console.log(`   Database User: ${config.database.user}`);
    console.log(`   Database Password: ${config.database.password ? 'Present' : 'Not set'}`);
    console.log('');

    // 3. Recommendations
    console.log('💡 Recommendations:');
    
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL is missing');
        console.log('   Add this to Railway dashboard:');
        console.log('   Name: DATABASE_URL');
        console.log('   Value: mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway');
    } else {
        console.log('✅ DATABASE_URL is present');
        console.log(`   Value: ${process.env.DATABASE_URL.substring(0, 50)}...`);
    }

    if (config.database.url) {
        console.log('✅ Config is using DATABASE_URL');
    } else {
        console.log('❌ Config is using fallback values instead of DATABASE_URL');
        console.log('   This means DATABASE_URL is not being read correctly');
    }

    console.log('');
    console.log('🛠️ Next steps:');
    console.log('1. Add DATABASE_URL to Railway dashboard');
    console.log('2. Redeploy the application');
    console.log('3. Test connection again');
}

debugDatabaseConfig();
