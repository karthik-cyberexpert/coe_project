const http = require('http');

const API_URL = 'http://localhost:3001';

// Sample token - replace with actual token from your system
const TOKEN = 'your-actual-token-here';

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('Testing Sheets API Filtering\n');
  console.log('='.repeat(50));

  // Test 1: Get all sheets
  console.log('\n1. Fetching ALL sheets...');
  const allSheets = await makeRequest('/api/sheets', TOKEN);
  console.log(`   Status: ${allSheets.status}`);
  console.log(`   Count: ${Array.isArray(allSheets.data) ? allSheets.data.length : 'N/A'}`);
  
  if (Array.isArray(allSheets.data) && allSheets.data.length > 0) {
    const sample = allSheets.data[0];
    console.log(`   Sample: ${sample.sheet_name} (subject_id: ${sample.subject_id}, dept_id: ${sample.department_id})`);
    
    // Test 2: Filter by subject_id
    const subjectId = sample.subject_id;
    console.log(`\n2. Filtering by subject_id = ${subjectId}...`);
    const bySubject = await makeRequest(`/api/sheets?subject_id=${subjectId}`, TOKEN);
    console.log(`   Status: ${bySubject.status}`);
    console.log(`   Count: ${Array.isArray(bySubject.data) ? bySubject.data.length : 'N/A'}`);
    
    // Test 3: Filter by department_id
    const deptId = sample.department_id;
    console.log(`\n3. Filtering by department_id = ${deptId}...`);
    const byDept = await makeRequest(`/api/sheets?department_id=${deptId}`, TOKEN);
    console.log(`   Status: ${byDept.status}`);
    console.log(`   Count: ${Array.isArray(byDept.data) ? byDept.data.length : 'N/A'}`);
    
    // Test 4: Filter by both subject_id AND department_id
    console.log(`\n4. Filtering by BOTH subject_id=${subjectId} AND department_id=${deptId}...`);
    const byBoth = await makeRequest(`/api/sheets?subject_id=${subjectId}&department_id=${deptId}`, TOKEN);
    console.log(`   Status: ${byBoth.status}`);
    console.log(`   Count: ${Array.isArray(byBoth.data) ? byBoth.data.length : 'N/A'}`);
    
    if (Array.isArray(byBoth.data)) {
      byBoth.data.forEach((sheet, i) => {
        console.log(`   [${i + 1}] ${sheet.sheet_name}`);
      });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test complete!');
}

test().catch(console.error);
