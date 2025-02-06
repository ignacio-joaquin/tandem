const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const setupCronJobs = () => {
    // Reset daily tasks at midnight
    cron.schedule('0 0 * * *', async () => {
        await prisma.goal.updateMany({
            where: { type: 'Daily' },
            data: { verified: false }
        });
        console.log('Daily tasks reset');
    },
    {
        timezone:'America/Argentina/Buenos_Aires'
    }
);

    // Reset weekly tasks
    cron.schedule('0 0 * * 1', async () => {
        await prisma.goal.updateMany({
            where: { type: 'Weekly' },
            data: { verified: false }
        });
        console.log('Weekly tasks reset');
    },
    {
        timezone:'America/Argentina/Buenos_Aires'
    });

    // Reset monthly tasks
    cron.schedule('0 0 1 * *', async () => {
        await prisma.goal.updateMany({
            where: { type: 'Monthly' },
            data: { verified: false }
        });
        console.log('Monthly tasks reset');
    },
    {
        timezone:'America/Argentina/Buenos_Aires'
    });
    console.log('Cron jobs set up');
};

//
//  FOR TEST PORPUSES ONLY
//
// const setupCronJobs = () => {
//     // Reset daily tasks every minute for testing
//     cron.schedule('* * * * *', async () => {
//         await prisma.goal.updateMany({
//             where: { type: 'Daily' },
//             data: { verified: false }
//         });
//         console.log('Daily tasks reset');
//     });

//     // Reset weekly tasks every minute for testing
//     cron.schedule('* * * * *', async () => {
//         await prisma.goal.updateMany({
//             where: { type: 'Weekly' },
//             data: { verified: false }
//         });
//         console.log('Weekly tasks reset');
//     });

//     // Reset monthly tasks every minute for testing
//     cron.schedule('* * * * *', async () => {
//         await prisma.goal.updateMany({
//             where: { type: 'Monthly' },
//             data: { verified: false }
//         });
//         console.log('Monthly tasks reset');
//     });
//     console.log('Test Cron jobs set up');
// };

module.exports = setupCronJobs;