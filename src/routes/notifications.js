// (A) SETTINGS - CHANGE TO YOUR OWN!
const mail = "your@email.com",
  publicKey =
    "BF23M7KJl7QwnifFtvFXOtVgeTCLw9ik0TiNuQk2FdCrhIWcVRAKHbW2W9OGcStipTNRm10gn38XtyaO7oJThzw",
  privateKey = "TraNptVTVKq1ENuRiL9AsSINr-AuEuhch82f0a6fTzE";

// (B) LOAD MODULES
const webpush = require("web-push");
const express = require("express");
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// (C) SETUP SERVER
webpush.setVapidDetails("mailto:" + mail, publicKey, privateKey);

// (E) SEND TEST PUSH NOTIFICATION
router.post("/mypush", async (req, res) => {
  const subscription = req.body;
  console.log('Received subscription:', subscription);
  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.auth || !subscription.keys.p256dh) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  // Ensure user is authenticated and user ID is available in req.user
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Save or update the subscription in the database
  try {
    const userId = req.user.id;
    const existingSubscription = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint }
    });

    if (existingSubscription) {
      await prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh
        },
      });
      console.log('Updated existing subscription:', existingSubscription.id);
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: userId,
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh
        },
      });
      console.log('Created new subscription for user:', userId);
    }

    res.status(201).json({ message: "Subscription saved successfully" });
  } catch (error) {
    console.error("Error saving subscription to database:", error);
    return res.status(500).json({ error: "Failed to save subscription" });
  }

  // Send a test notification
  webpush
    .sendNotification(
      subscription,
      JSON.stringify({
        title: "Welcome!",
        body: "Yes, it works!",
        icon: "i-ico.png",
        image: "i-banner.png",
      })
    )
    .catch((err) => console.log('Error sending test notification:', err));
});

module.exports = router;
