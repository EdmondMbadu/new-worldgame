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
