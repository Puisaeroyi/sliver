import fs from 'fs';
import path from 'path';

const testFile = '/home/silver/log.xlsx';
const baseUrl = 'http://localhost:3001';

async function testUpload() {
  try {
    console.log('📤 Reading test file...');
    const fileBuffer = fs.readFileSync(testFile);
    const base64 = fileBuffer.toString('base64');

    // Step 1: Convert file
    console.log('📝 Step 1: Converting file...');
    const convertRes = await fetch(`${baseUrl}/api/v1/converter/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'log.xlsx',
        fileData: base64
      })
    });

    if (!convertRes.ok) {
      throw new Error(`Convert failed: ${convertRes.statusText}`);
    }

    const convertData = await convertRes.json();
    console.log(`✅ Converted: ${convertData.records.length} records`);

    // Step 2: Process attendance
    console.log('\n⚙️  Step 2: Processing attendance...');
    const processRes = await fetch(`${baseUrl}/api/v1/processor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        swipeRecords: convertData.records
      })
    });

    if (!processRes.ok) {
      throw new Error(`Process failed: ${processRes.statusText}`);
    }

    const processData = await processRes.json();
    console.log(`✅ Processed: ${processData.recordsProcessed} records`);
    console.log(`   Attendance: ${processData.attendance.length} records`);
    console.log(`   Deviations: ${processData.deviationRecords.length} records`);

    // Step 3: Download main Excel
    console.log('\n📥 Step 3: Downloading main Excel...');
    const downloadRes = await fetch(`${baseUrl}/api/v1/processor/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: processData.attendance })
    });

    if (downloadRes.ok) {
      console.log('✅ Main Excel download successful');
    }

    // Step 4: Download deviation Excel
    console.log('\n📥 Step 4: Downloading deviation Excel...');
    const deviationRes = await fetch(`${baseUrl}/api/v1/processor/download-deviation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: processData.deviationRecords })
    });

    if (deviationRes.ok) {
      console.log('✅ Deviation Excel download successful');
    }

    // Step 5: Check saved files
    console.log('\n📁 Step 5: Checking saved files in /home/silver/...');
    const today = new Date().toISOString().split('T')[0];
    const mainFile = `/home/silver/attendance_records_${today}.xlsx`;
    const deviationFile = `/home/silver/Deviation_Summary_${today}.xlsx`;

    console.log(`   Main: ${fs.existsSync(mainFile) ? '✅ Found' : '❌ Not found'} - ${mainFile}`);
    console.log(`   Deviation: ${fs.existsSync(deviationFile) ? '✅ Found' : '❌ Not found'} - ${deviationFile}`);

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUpload();
