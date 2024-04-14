/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();
// const db = admin.firestore();

import * as sgMail from '@sendgrid/mail';

const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
const TEMPLATE_ID_SOLUTION = functions.config().sendgrid.templatesolutioninvite;
const TEMPLATE_ID_COMMENT = functions.config().sendgrid.templatecommentinvite;
const TEMPLATE_ID_EVALUTION =
  functions.config().sendgrid.templatesolutionevaluationinvite;
const TEMPLATE_ID_EVALUATION_COMPLETE =
  functions.config().sendgrid.templateevaluationcomplete;
sgMail.setApiKey(API_KEY);

export const welcomeEmail = functions.auth.user().onCreate((user) => {
  const msg = {
    to: user.email,
    from: 'newworld@newworld-game.org',
    templateId: TEMPLATE_ID,
    // dynamic_template_data: {
    //   name: user.displayName,
    // },
  };
  return sgMail.send(msg);
});

export const genericEmail = functions.https.onCall(async (data, context) => {
  //   if (!context.auth && !context.auth!.token.email) {
  //     throw new functions.https.HttpsError(
  //       'failed-precondition',
  //       'Must be logged with email-address'
  //     );
  //   }
  const msg = {
    to: data.email,
    from: 'newworld@newworld-game.org',
    templateId: TEMPLATE_ID_SOLUTION,
    dynamic_template_data: {
      subject: data.subject,
      description: data.description,
      title: data.title,
      path: data.path,
    },
  };

  await sgMail.send(msg);

  return { success: true };
});

export const commentNotificationEmail = functions.https.onCall(
  async (data, context) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_COMMENT,
      dynamic_template_data: {
        subject: data.subject,
        // title: data.title,
        path: data.path,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const solutionEvaluationInvite = functions.https.onCall(
  async (data, context) => {
    try {
      // Your existing email sending logic...
      const msg = {
        to: data.email,
        from: 'newworld@newworld-game.org',
        templateId: TEMPLATE_ID_EVALUTION,
        dynamic_template_data: {
          subject: data.subject,
          // title: data.title,
          path: data.path,
        },
      };
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('Failed to send email', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send email',
        error
      );
    }
  }
);

export const solutionEvaluationComplete = functions.https.onCall(
  async (data, context) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_EVALUATION_COMPLETE,
      dynamic_template_data: {
        subject: data.subject,
        // title: data.title,
        path: data.path,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

exports.dailyNews = functions.pubsub
  .schedule('every day 23:30')
  .timeZone('America/Los_Angeles') // Ensure time zone matches your requirements
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const yesterday = new Date(now.setDate(now.getDate() - 1));
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

    const solutions = await db
      .collection('solutions')
      .where('submissionDate', '>=', yesterdayStart)
      .where('submissionDate', '<=', yesterdayEnd)
      .get();

    let solutionsToSummarize = [];

    if (solutions.empty) {
      const recentSolutions = await db
        .collection('solutions')
        .orderBy('submissionDate', 'desc')
        .limit(5)
        .get();
      solutionsToSummarize = recentSolutions.docs.map((doc) => doc.data());
    } else {
      solutionsToSummarize = solutions.docs.map((doc) => doc.data());
    }

    const summaryText = solutionsToSummarize
      .map((solution) => {
        return `Title: ${solution.title}\nAuthor: ${
          solution.authorName
        }\nDate: ${solution.submissionDate.toISOString()}\nContent: ${
          solution.content
        }`;
      })
      .join('\n\n');

    const enhancedPrompt = `
      Envision yourself as a groundbreaking news reporter who embodies an exceptional combination of attributes: the ability to contextualize current events within their historical tapestry, akin to Ken Burns; the capacity to infuse news analysis with engaging and insightful wit, reminiscent of Jon Stewart; the skill to cover stories with the profound global awareness and nuanced understanding of Christiane Amanpour; and the profound commitment to and knowledge of sustainable development and environmental conservation, inspired by Elizabeth Wathuti. Your reporting not only informs and entertains but also enlightens viewers on the importance of environmental stewardship and sustainable practices.

      My name is Rachel and today's date is ${new Date().toLocaleDateString()}.
      ${summaryText}
      Thank you, that is all for today. I will see you tomorrow.
    `;

    // Send the single concatenated summary to the summaries collection
    const summaryDocRef = db.collection('summaries').doc();
    await summaryDocRef.set({ text: enhancedPrompt });

    // Listen for the summary response
    listenForSummaryResponse(summaryDocRef);
  });

function listenForSummaryResponse(docRef: any) {
  const unsubscribe = docRef.onSnapshot(
    (docSnapshot: any) => {
      if (docSnapshot.exists && docSnapshot.data().summary) {
        console.log('Summary received:', docSnapshot.data().summary);
        unsubscribe(); // Detach the listener after receiving the summary
      }
    },
    (err: any) => {
      console.log(`Encountered error: ${err}`);
      unsubscribe();
    }
  );
}
