const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Helper function to check if user has email notifications enabled
 */
async function hasEmailNotificationEnabled(uid, notificationType) {
  try {
    const snapshot = await admin
      .database()
      .ref(`users/${uid}/emailNotifications/${notificationType}`)
      .once("value");
    return snapshot.val() === true;
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return false; // Default to not sending if there's an error
  }
}

/**
 * Helper function to get user email
 */
async function getUserEmail(uid) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.emailVerified ? userRecord.email : null;
  } catch (error) {
    console.error("Error getting user email:", error);
    return null;
  }
}

/**
 * Send welcome email after user verifies their email
 * Triggered when emailVerified changes to true in auth
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  if (!user.email || !user.emailVerified) {
    console.log("User has no verified email, skipping welcome email");
    return null;
  }

  const hasEnabled = await hasEmailNotificationEnabled(user.uid, "welcome");
  if (!hasEnabled) {
    console.log("User has disabled welcome emails");
    return null;
  }

  // TODO: Integrate with your email service (SendGrid, Mailgun, etc.)
  // Example with Firestore Email Extension:
  /*
  await admin.firestore().collection('mail').add({
    to: user.email,
    template: {
      name: 'welcome',
      data: {
        displayName: user.displayName || 'Player',
        appName: 'Pattrn',
      }
    }
  });
  */

  console.log(`Welcome email queued for ${user.email}`);
  return null;
});

/**
 * Send notification when a mosaic is shared with a user
 * Listen to changes in mosaics/shared/{uid}
 */
exports.notifyMosaicShared = functions.database
  .ref("/mosaics/shared/{recipientUid}/{mosaicId}")
  .onCreate(async (snapshot, context) => {
    const {recipientUid, mosaicId} = context.params;
    const sharedData = snapshot.val();

    const hasEnabled = await hasEmailNotificationEnabled(
      recipientUid,
      "mosaicShared"
    );
    if (!hasEnabled) {
      console.log("User has disabled mosaic shared notifications");
      return null;
    }

    const recipientEmail = await getUserEmail(recipientUid);
    if (!recipientEmail) {
      console.log("Recipient has no verified email");
      return null;
    }

    // Get sender's username
    let senderUsername = "A friend";
    try {
      const senderSnap = await admin
        .database()
        .ref(`users/${sharedData.sharedBy}/username`)
        .once("value");
      if (senderSnap.exists()) {
        senderUsername = senderSnap.val();
      }
    } catch (error) {
      console.error("Error getting sender username:", error);
    }

    // TODO: Send email via your email service
    /*
    await admin.firestore().collection('mail').add({
      to: recipientEmail,
      template: {
        name: 'mosaic-shared',
        data: {
          senderUsername,
          mosaicName: sharedData.name || 'a mosaic',
          mosaicId,
        }
      }
    });
    */

    console.log(
      `Mosaic shared notification queued for ${recipientEmail} from ${senderUsername}`
    );

    // Also send in-app notification (already handled by your existing code)
    return null;
  });

/**
 * Send notification when user unlocks an achievement
 * Listen to changes in users/{uid}/achievements
 */
exports.notifyAchievement = functions.database
  .ref("/users/{uid}/achievements/{achievementId}")
  .onCreate(async (snapshot, context) => {
    const {uid, achievementId} = context.params;

    const hasEnabled = await hasEmailNotificationEnabled(uid, "achievements");
    if (!hasEnabled) {
      console.log("User has disabled achievement notifications");
      return null;
    }

    const userEmail = await getUserEmail(uid);
    if (!userEmail) {
      console.log("User has no verified email");
      return null;
    }

    const achievementData = snapshot.val();

    // TODO: Send email via your email service
    /*
    await admin.firestore().collection('mail').add({
      to: userEmail,
      template: {
        name: 'achievement-unlocked',
        data: {
          achievementName: achievementData.name || 'New Achievement',
          achievementDesc: achievementData.description || '',
        }
      }
    });
    */

    console.log(
      `Achievement notification queued for ${userEmail}: ${achievementId}`
    );
    return null;
  });

/**
 * Send notification when a friend completes a puzzle
 * Listen to changes in puzzleCompletions
 */
exports.notifyFriendActivity = functions.database
  .ref("/puzzleCompletions/{mode}/{puzzleKey}/{uid}")
  .onCreate(async (snapshot, context) => {
    const {uid} = context.params;
    const completionData = snapshot.val();

    // Get this user's friends
    const friendsSnap = await admin
      .database()
      .ref(`friends/${uid}`)
      .once("value");

    if (!friendsSnap.exists()) {
      return null; // No friends to notify
    }

    const friends = friendsSnap.val();
    const friendUids = Object.keys(friends);

    // Get user's username
    let username = "Your friend";
    try {
      const userSnap = await admin
        .database()
        .ref(`users/${uid}/username`)
        .once("value");
      if (userSnap.exists()) {
        username = userSnap.val();
      }
    } catch (error) {
      console.error("Error getting username:", error);
    }

    // Notify each friend
    const notifications = friendUids.map(async (friendUid) => {
      const hasEnabled = await hasEmailNotificationEnabled(
        friendUid,
        "friendActivity"
      );
      if (!hasEnabled) {
        return null;
      }

      const friendEmail = await getUserEmail(friendUid);
      if (!friendEmail) {
        return null;
      }

      // TODO: Send email via your email service
      /*
      await admin.firestore().collection('mail').add({
        to: friendEmail,
        template: {
          name: 'friend-activity',
          data: {
            friendUsername: username,
            activityType: 'completed a puzzle',
            mode: context.params.mode,
          }
        }
      });
      */

      console.log(`Friend activity notification queued for ${friendEmail}`);
      return null;
    });

    await Promise.all(notifications);
    return null;
  });

/**
 * Weekly digest - scheduled function
 * Runs every Monday at 9 AM UTC
 */
exports.sendWeeklyDigest = functions.pubsub
  .schedule("0 9 * * 1")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Running weekly digest job");

    // Get all users with digest enabled
    const usersSnap = await admin.database().ref("users").once("value");

    if (!usersSnap.exists()) {
      console.log("No users found");
      return null;
    }

    const users = usersSnap.val();
    const digestPromises = [];

    for (const [uid, userData] of Object.entries(users)) {
      if (userData.emailNotifications?.digest !== true) {
        continue; // Skip users who haven't enabled digest
      }

      digestPromises.push(
        (async () => {
          const userEmail = await getUserEmail(uid);
          if (!userEmail) {
            return;
          }

          // Calculate user's weekly stats
          // TODO: Implement your stats calculation logic
          const weeklyStats = {
            puzzlesSolved: 0,
            achievements: 0,
            mosaicsCreated: 0,
          };

          // TODO: Send digest email
          /*
          await admin.firestore().collection('mail').add({
            to: userEmail,
            template: {
              name: 'weekly-digest',
              data: {
                username: userData.username || 'Player',
                ...weeklyStats,
              }
            }
          });
          */

          console.log(`Weekly digest queued for ${userEmail}`);
        })()
      );
    }

    await Promise.all(digestPromises);
    console.log(`Weekly digest sent to ${digestPromises.length} users`);
    return null;
  });
