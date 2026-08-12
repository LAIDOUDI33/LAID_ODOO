import { seedAnalyticsData } from './src/lib/seed-analytics';
const result = await seedAnalyticsData();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
