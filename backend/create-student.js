require('dotenv').config();
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

async function createStudent() {
  try {
    console.log('🔵 Logging in as admin...');
    
    // 1. Login as admin
    const loginRes = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'Admin123!',
    });

    const token = loginRes.data.token;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    
    console.log('✅ Admin login successful');
    console.log('🔵 Creating student account...');

    // 2. Create student
    const studentRes = await api.post('/api/admin/students', {
      lrn: '100000000009',
      firstName: 'Johntadeo',
      lastName: 'Liscano',
      middleName: 'n/a',
      password: 'JohntadeoLiscano_123',
    });

    console.log('✅ Student account created successfully!');
    console.log('\n📋 Student Details:');
    console.log(`   LRN: 100000000009`);
    console.log(`   Name: Johntadeo Liscano`);
    console.log(`   Password: Skipper_15!`);
    console.log('\n📝 You can now login with these credentials at the student portal.');
    console.log('\nFull response:', JSON.stringify(studentRes.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  }
}

createStudent();
