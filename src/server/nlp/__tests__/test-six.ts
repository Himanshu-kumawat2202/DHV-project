import { processNaturalLanguageQuery } from '../index';

const testQuestions = [
  'Compare IIT Madras and IISc Bangalore in 2024.',
  'Show the top 10 institutions according to NIRF 2025.',
  'Analyze IIT Madras performance from 2020 to 2025.',
  'Which state has the highest number of top-ranked institutions?',
  'Show the correlation between NIRF scoring parameters.',
  'Show the distribution of overall scores across institutions.',
];

async function run() {
  for (const q of testQuestions) {
    console.log('============================================');
    console.log('Q:', q);
    const res = await processNaturalLanguageQuery(q);
    console.log('Intent:', res.intent);
    console.log('ChartType:', res.response.chartType);
    console.log('ChartConfig:', res.response.chartConfig);
    console.log('ChartData sample:', res.response.chartData?.slice(0, 2));
    console.log('Answer:\n', res.response.answer);
  }
}

run();

