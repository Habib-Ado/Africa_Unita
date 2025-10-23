// Test API Endpoint - Verifica se /api/auth/login funziona
import fetch from 'node-fetch';

async function testAPIEndpoint() {
    try {
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

        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log(`📊 Response Body: ${responseText}`);

        if (response.ok) {
            console.log('✅ API endpoint is working!');
            const data = JSON.parse(responseText);
            console.log('📋 Response data:');
            console.log(`   Success: ${data.success}`);
            console.log(`   Message: ${data.message}`);
            if (data.data && data.data.user) {
                console.log(`   User: ${data.data.user.email}`);
                console.log(`   Role: ${data.data.user.role}`);
                console.log(`   Status: ${data.data.user.status}`);
            }
        } else {
            console.log('❌ API endpoint failed');
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${responseText}`);
        }

    } catch (error) {
        console.error('❌ Error testing API endpoint:', error.message);
        console.log('');
        console.log('🛠️ Troubleshooting:');
        console.log('1. Make sure the server is running on port 3000');
        console.log('2. Check if the database is connected');
        console.log('3. Verify the admin user exists in the database');
    }
}

testAPIEndpoint();
