// Test API Endpoint - Verifica se /api/auth/login funziona
import http from 'http';

function testAPIEndpoint() {
    console.log('🔍 Testing API endpoint /api/auth/login...');
    console.log('');

    const baseUrl = 'http://localhost:3000';
    const loginUrl = `${baseUrl}/api/auth/login`;

    console.log(`📡 Testing URL: ${loginUrl}`);

    // Test con credenziali admin
    const testData = {
        email: 'admin@africaunita.it',
        password: 'password123'
    };

    console.log('📋 Test data:');
    console.log(`   Email: ${testData.email}`);
    console.log(`   Password: ${testData.password}`);
    console.log('');

    const postData = JSON.stringify(testData);
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`📊 Response Status: ${res.statusCode}`);
        console.log(`📊 Response Headers:`, res.headers);

        let responseBody = '';
        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            console.log(`📊 Response Body: ${responseBody}`);

            if (res.statusCode === 200) {
                console.log('✅ API endpoint is working!');
                try {
                    const data = JSON.parse(responseBody);
                    console.log('📋 Response data:');
                    console.log(`   Success: ${data.success}`);
                    console.log(`   Message: ${data.message}`);
                    if (data.data && data.data.user) {
                        console.log(`   User: ${data.data.user.email}`);
                        console.log(`   Role: ${data.data.user.role}`);
                        console.log(`   Status: ${data.data.user.status}`);
                    }
                } catch (parseError) {
                    console.log('⚠️  Could not parse JSON response');
                }
            } else {
                console.log('❌ API endpoint failed');
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Response: ${responseBody}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error testing API endpoint:', error.message);
        console.log('');
        console.log('🛠️ Troubleshooting:');
        console.log('1. Make sure the server is running on port 3000');
        console.log('2. Check if the database is connected');
        console.log('3. Verify the admin user exists in the database');
    });

    req.write(postData);
    req.end();
}

testAPIEndpoint();
