import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SHOW TABLES');
const tables = rows.map(r => Object.values(r)[0]);
const needed = ['featureCuts','featureCutScenes','actGroups','shotPackages','continuityRecords','featureAudioPlans','filmCompileJobs','characterArcs'];
const missing = needed.filter(t => !tables.includes(t));
const existing = needed.filter(t => tables.includes(t));
console.log('Missing tables:', missing);
console.log('Existing new tables:', existing);
await conn.end();
