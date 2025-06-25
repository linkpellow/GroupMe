import { CronJob } from 'cron';
import { processCampaigns } from '../services/campaignScheduler';

// Create a cron job that runs every 5 minutes
// Cron format: Seconds Minutes Hours DayOfMonth Month DayOfWeek
const campaignProcessorJob = new CronJob(
  '0 */5 * * * *', // Run every 5 minutes
  async function () {
    console.log('Running campaign processor job...');
    try {
      await processCampaigns();
    } catch (error) {
      console.error('Error running campaign processor job:', error);
    }
  },
  null, // onComplete
  false, // start
  'UTC' // timezone
);

export function startCampaignProcessor() {
  console.log('Starting campaign processor job...');
  campaignProcessorJob.start();
}

export function stopCampaignProcessor() {
  console.log('Stopping campaign processor job...');
  campaignProcessorJob.stop();
}

// Export the job for testing or manual triggering
export const job = campaignProcessorJob;
