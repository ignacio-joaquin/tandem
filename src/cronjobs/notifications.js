const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const { checkGoalsForReminders, notifyPendingVerifications } = require('../utils/pushNotification');

const prisma = new PrismaClient();

// VAPID keys should be generated only once.
const vapidKeys = {
  publicKey: 'BF23M7KJl7QwnifFtvFXOtVgeTCLw9ik0TiNuQk2FdCrhIWcVRAKHbW2W9OGcStipTNRm10gn38XtyaO7oJThzw',
  privateKey: 'TraNptVTVKq1ENuRiL9AsSINr-AuEuhch82f0a6fTzE'
};

webpush.setVapidDetails(
  'mailto:your@email.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Schedule the cron job to run every minute for testing
function setupNotificationCronJob() {
  // Schedule the cron job every 5 seconds for testing
  cron.schedule('*/15 * * * *', async () => {
    await checkGoalsForReminders();
  });

  // Schedule the cron job to notify users about pending goal verifications every hour
  cron.schedule('0 * * * *', async () => {
    await notifyPendingVerifications();
  });
}

module.exports = setupNotificationCronJob;
