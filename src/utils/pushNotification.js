const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const { goal } = require('../config/prismaClient');
const prisma = new PrismaClient();

const DAILY_INTERVAL = parseInt(process.env.DAILY_TASK_REMINDER_INTERVAL);
const WEEKLY_INTERVAL = parseInt(process.env.WEEKLY_TASK_REMINDER_INTERVAL);
const MONTHLY_INTERVAL = parseInt(process.env.MONTHLY_TASK_REMINDER_INTERVAL);

async function sendPushNotification(userId, title, body) {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) }, // Ensure userId is an integer
    select: { pushSubscriptions: true }
  });

  if (user && user.pushSubscriptions.length > 0) {
    const payload = JSON.stringify({ title, body, icon: 'i-ico.png', image: 'i-banner.png' });

    for (const subscription of user.pushSubscriptions) {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.auth,
          p256dh: subscription.p256dh
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error) {
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        }
      }
    }
  }
}

function shouldSendReminder(goal) {
  const now = new Date();
  const lastReminderTime = goal.lastReminder ? new Date(goal.lastReminder) : new Date(0); // Initialize to epoch if null
  let interval;

  switch (goal.type) {
    case 'Daily':
      interval = DAILY_INTERVAL;
      break;
    case 'Weekly':
      interval = WEEKLY_INTERVAL;
      break;
    case 'Monthly':
      interval = MONTHLY_INTERVAL;
      break;
    default:
      return false;
  }
  return ((now.getTime() - lastReminderTime.getTime()) / 1000 >= interval);
}

async function checkGoalsForReminders() {
  try {
    console.log('Checking goals for reminders...');
    const goals = await prisma.goal.findMany({
      where: {
        status: 'pending verification'
      } 
    });
    for (const goal of goals) {
      if (shouldSendReminder(goal)) {
        console.log(`Sending reminder for goal: ${goal.id}`);
        await sendPushNotification(goal.userId, 'Task Reminder', `Reminder to complete your ${goal.type.toLowerCase()} task: ${goal.title}`);
        await prisma.goal.update({
          where: { id: goal.id },
          data: { lastReminder: new Date() }
        });
      }
    }
  } catch (error) {
    console.error('Error checking goals for reminders:', error);
  }
}

async function notifyPendingVerifications() {
  try {
    const goalsWithPendingVerification = await prisma.goal.findMany({
      where: {
        status: 'pending verification'
      },
      include: {
        friend: {
          select: {
            id: true,
            pushSubscriptions: true
          }
        }
      }
    });

    for (const goal of goalsWithPendingVerification) {
      if (goal.friend.pushSubscriptions.length > 0) {
        await sendPushNotification(goal.friend.id, 'Pending Goal Verification', 'You have goals pending verification.');
      }
    }
  } catch (error) {
    console.error('Error checking for pending verifications:', error);
  }
}

module.exports = { sendPushNotification, checkGoalsForReminders, notifyPendingVerifications };
