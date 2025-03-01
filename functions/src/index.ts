/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// const cors = require('cors');
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
// const axios = require('axios');
// const cors = require('cors')({ origin: true });
// const corsOptions = cors({ origin: true, optionsSuccessStatus: 200 });

// const corsHandler = cors({
//   origin: ['http://localhost:4200'], // You can specify domains if you want to restrict e.g., 'http://localhost:4200'
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Include OPTIONS
//   credentials: true,
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Make sure 'Authorization' is allowed
//   optionsSuccessStatus: 204,
// });

const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');

admin.initializeApp();
// const db = admin.firestore();

// Automatically allow cross-origin requests
const storage = new Storage();
// Multer configuration for file uploads

const bucketName = 'new-worldgame.appspot.com'; // replace 'your-bucket-name' with your actual bucket name
const bucket = storage.bucket(bucketName);
import * as sgMail from '@sendgrid/mail';

// import * as corsLib from 'cors';

// const cors = corsLib({ origin: true });
const twilio = require('twilio');

const API_KEY = functions.config()['sendgrid'].key;
const TEMPLATE_ID = functions.config()['sendgrid'].template;
const TEMPLATE_ID_SOLUTION =
  functions.config()['sendgrid'].templatesolutioninvite;
const TEMPLATE_ID_SOLUTION_NONUSER =
  functions.config()['sendgrid'].templatesolutioninvitenonuser;
const TEMPLATE_ID_CHALLENGE_PAGE =
  functions.config()['sendgrid'].templatechallengepageinvite;
const TEMPLATE_ID_CHALLENGE_PAGE_NONUSER =
  functions.config()['sendgrid'].templatenonuserchallengepage;
const TEMPLATE_ID_COMMENT =
  functions.config()['sendgrid'].templatecommentinvite;
const TEMPLATE_ID_WORKSHOP = functions.config()['sendgrid'].templateworkshop;
// const DID_API_KEY = functions.config().did.key;

const TEMPLATE_ID_EVALUTION =
  functions.config()['sendgrid'].templatesolutionevaluationinvite;
const TEMPLATE_ID_EVALUATION_COMPLETE =
  functions.config()['sendgrid'].templateevaluationcomplete;
sgMail.setApiKey(API_KEY);

// Twilio credentials from config
const accountSid = functions.config()['twilio'].account_sid;
const authToken = functions.config()['twilio'].auth_token;
const twilioClient = twilio(accountSid, authToken);

export const welcomeEmail = functions.auth.user().onCreate((user: any) => {
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

export const genericEmail = functions.https.onCall(
  async (data: any, context: any) => {
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
        image: data.image,
        author: data.author,
        user: data.user,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);
export const nonUserEmail = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_SOLUTION_NONUSER,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const challengePageInvite = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_CHALLENGE_PAGE,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
        user: data.user,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const nonUserchallengePageInvite = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_CHALLENGE_PAGE_NONUSER,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const commentNotificationEmail = functions.https.onCall(
  async (data: any, context: any) => {
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

export const workshopRegistrationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_WORKSHOP,
      dynamic_template_data: {
        subject: data.subject,
        firstname: data.firstName,
        lastname: data.lastName,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const solutionEvaluationInvite = functions.https.onCall(
  async (data: any, context: any) => {
    try {
      // Your existing email sending logic...
      const msg = {
        to: data.email,
        from: 'newworld@newworld-game.org',
        templateId: TEMPLATE_ID_EVALUTION,
        dynamic_template_data: {
          subject: data.subject,
          title: data.title,
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
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_EVALUATION_COMPLETE,
      dynamic_template_data: {
        subject: data.subject,
        title: data.title,
        path: data.path,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const getIceServers = functions.https.onCall(async (data, context) => {
  try {
    const tokenResponse = await twilioClient.tokens.create();
    const iceServers = tokenResponse.iceServers;
    return { iceServers };
  } catch (error) {
    console.error('Error fetching ICE servers from Twilio:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch ICE servers.'
    );
  }
});
// exports.dailyNews = functions.pubsub
//   .schedule('every day 04:10')
//   .timeZone('America/Los_Angeles')
//   .onRun(async (context:any) => {
//     const summary = await createAndFetchSummary();
//     sendSummaryToDID(summary);
//   });

// async function createAndFetchSummary() {
//   const db = admin.firestore();
//   const now = new Date();
//   const yesterday = new Date(now.setDate(now.getDate() - 1));
//   const yesterdayStartString = formatDateAsString(yesterday, 'start');
//   const yesterdayEndString = formatDateAsString(yesterday, 'end');
//   const today = new Date();

//   const monthNames = [
//     'January',
//     'February',
//     'March',
//     'April',
//     'May',
//     'June',
//     'July',
//     'August',
//     'September',
//     'October',
//     'November',
//     'December',
//   ];

//   const year = today.getFullYear();

//   const date = today.getDate();

//   const suffix = ['st', 'nd', 'rd'][
//     date % 100 > 10 && date % 100 < 20
//       ? 0
//       : date % 10 === 1
//       ? 1
//       : date % 10 === 2
//       ? 2
//       : 3
//   ];
//   const formattedDate = `${
//     monthNames[today.getMonth()]
//   } ${date}${suffix}, ${year}`;

//   const solutions = await db
//     .collection('solutions')
//     .where('submissionDate', '>=', yesterdayStartString)
//     .where('submissionDate', '<=', yesterdayEndString)
//     .get();

//   let solutionsToSummarize = [];

//   if (solutions.empty) {
//     const recentSolutions = await db
//       .collection('solutions')
//       .orderBy('submissionDate', 'desc')
//       .limit(5)
//       .get();
//     solutionsToSummarize = recentSolutions.docs.map((doc: any) => doc.data());
//   } else {
//     solutionsToSummarize = solutions.docs.map((doc: any) => doc.data());
//   }

//   const summaryText = solutionsToSummarize
//     .map(
//       (solution: any) =>
//         `Title: ${solution.title}\nAuthor: ${
//           solution.authorName
//         }\nDate: ${convertToDate(
//           solution.submissionDate
//         ).toISOString()}\nContent: ${solution.content}`
//     )
//     .join('\n\n');

//   const enhancedPrompt = `
//       Envision yourself as a groundbreaking news reporter who embodies an exceptional combination of attributes: the ability to contextualize current events within their historical tapestry; the capacity to infuse news analysis with engaging and insightful wit; the skill to cover stories with the profound global awareness and nuanced understanding; and the profound commitment to and knowledge of sustainable development and environmental conservation. Your reporting not only informs and entertains but also enlightens viewers on the importance of environmental stewardship and sustainable practices.
//       Your approach to news:
//       - Start with your name ( My name is Rachel) and todays' date ${formattedDate}
//       - Place the event within a historical continuum, highlighting how past events and trends have shaped the current situation, providing viewers with a deep understanding of its roots.
//       - Incorporates a balanced use of wit to make the news more engaging, ensuring humor serves to enlighten rather than detract from the gravity of topics, especially those concerning environmental issues.
//       - Expands the story’s scope to include its global implications, drawing on a wide-ranging knowledge of international affairs and cultural insights, while always mindful of the environmental angle.
//       - Integrates sustainable development insights into your analysis, inspired by Elizabeth Wathuti’s work. You highlight the environmental impact of events, advocate for sustainable solutions, and inspire action towards a more sustainable future.
//       - Add a closing message ( like thank you that is all for today. I will see you tomorrow)\n
//       - Remove weird characaters on the summary text such *, or #.
//       - Make the summary about 3-4 minutes long
//       Now summarize the text below: \n
//       ${summaryText}
//     `;

//   const summaryDocRef = db.collection('summaries').doc();
//   await summaryDocRef.set({ text: enhancedPrompt });

//   listenForSummaryResponse(summaryDocRef);
// }

// function formatDateAsString(date: any, type: any) {
//   const year = date.getFullYear();
//   const month = date.getMonth() + 1;
//   const day = date.getDate();
//   const hours = type === 'start' ? '00' : '23';
//   const minutes = type === 'start' ? '00' : '59';
//   const seconds = type === 'start' ? '00' : '59';
//   return `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`;
// }

// function convertToDate(dateStr: any) {
//   const parts = dateStr.split('-');
//   return new Date(
//     parts[2],
//     parts[0] - 1,
//     parts[1],
//     parts[3],
//     parts[4],
//     parts[5]
//   );
// }

// function listenForSummaryResponse(docRef: any) {
//   const unsubscribe = docRef.onSnapshot(
//     (docSnapshot: any) => {
//       if (docSnapshot.exists && docSnapshot.data().summary) {
//         console.log('Summary received:', docSnapshot.data().summary);
//         return docSnapshot.data().summary;
//         unsubscribe(); // Detach the listener after receiving the summary
//       }
//     },
//     (err: any) => {
//       console.log(`Encountered error: ${err}`);

//       unsubscribe();

//       return;
//     }
//   );
// }

// function sendSummaryToDID(summaryText: any) {
//   axios
//     .post(
//       'https://api.d-id.com/talks',
//       {
//         source_url:
//           's3://d-id-images-prod/auth0|65ea804bc78b9c5681c49d5d/img_gPCzWvI6vGdaEj_is9nlx/news-anchor.png',
//         script: {
//           type: 'text',
//           input: summaryText,
//         },
//         webhook:
//           'https://us-central1-new-worldgame.cloudfunctions.net/videoReady', // Replace 'your-project-id' with your actual Firebase project ID
//       },
//       {
//         headers: {
//           Authorization: `Basic ${DID_API_KEY}`, // Replace 'YOUR_API_KEY' with your actual D-ID API Key
//           'Content-Type': 'application/json',
//         },
//       }
//     )
//     .then((response: any) =>
//       console.log('Video creation request sent successfully', response.data)
//     )
//     .catch((error: any) =>
//       console.error('Failed to send video creation request', error)
//     );
// }

// Function to handle the webhook response
// exports.videoReady = functions.https.onRequest(async (req: any, res: any) => {
//   if (req.method === 'POST') {
//     const videoId = req.body.id;
//     const videoUrl = `https://api.d-id.com/talks/${videoId}`;
//     console.log('The video id is', videoId);

//     try {
//       // Download the video content
//       const response = await axios.get(videoUrl, { responseType: 'stream' });
//       const fileStream = response.data;
//       const file = bucket.file('nwg-news');
//       const writeStream = file.createWriteStream({
//         metadata: {
//           contentType: 'video/mp4', // Adjust depending on the actual video format
//         },
//       });

//       fileStream
//         .pipe(writeStream)
//         .on('error', (error: any) => {
//           console.error('Stream Error:', error);
//           res.status(500).send('Failed to upload video');
//         })
//         .on('finish', () => {
//           console.log('Video uploaded successfully');
//           res.status(200).send('Video uploaded successfully');
//         });
//     } catch (error) {
//       console.error('Failed to handle video:', error);
//       res.status(500).send('Failed to handle video');
//     }
//   } else {
//     res.status(405).send('Method not allowed');
//   }
// });

// exports.uploadImage = functions.https.onRequest(async (req: any, res: any) => {
//   if (req.method !== 'POST') {
//     console.log(
//       `Failed because the request body is not POST. The request itself is: ${req}`
//     );
//     return res.status(405).send('Method Not Allowed');
//   }

//   if (!req.body || !req.body.image) {
//     console.log(
//       `Failed because there is no request image or body. The request itself is: ${req}`
//     );
//     return res.status(400).send('No image provided');
//   }

//   const image = req.body.image; // Assuming the image is sent as a base64 encoded string
//   const buffer = Buffer.from(image, 'base64');
//   const fileName = `uploads/${Date.now()}_uploaded_image.jpg`; // You might want to adjust the filename and extension
//   const file = bucket.file(fileName);

//   try {
//     await file.save(buffer, {
//       metadata: {
//         contentType: 'image/jpeg', // You might want to dynamically determine the MIME type
//       },
//     });

//     await file.makePublic();
//     const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
//     res.status(200).send({ url: publicUrl });
//   } catch (error) {
//     console.log(
//       `Failed because while uploading image to cloud. The request itself: ${req}`
//     );
//     console.error('Failed to upload image:', error);
//     res.status(500).send('Error uploading image');
//   }
// });

// exports.uploadImage = functions.https.onRequest(async (req: any, res: any) => {
//   if (req.method !== 'POST') {
//     return res.status(405).send('Method Not Allowed');
//   }

//   const imageUrl = req.body.imageUrl;
//   if (!imageUrl) {
//     return res.status(400).send('No image URL provided');
//   }

//   try {
//     const response = await axios({
//       method: 'get',
//       url: imageUrl,
//       responseType: 'arraybuffer',
//     });

//     const buffer = Buffer.from(response.data, 'binary');
//     const contentType = response.headers['content-type'];
//     const fileName = `uploads/${Date.now()}_uploaded_image.${
//       contentType.split('/')[1]
//     }`;
//     const file = bucket.file(fileName);

//     await file.save(buffer, {
//       metadata: {
//         contentType: contentType,
//       },
//     });

//     await file.makePublic();
//     const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
//     res.status(200).send({ url: publicUrl });
//   } catch (error) {
//     console.error('Failed to upload image:', error);
//     res.status(500).send('Error uploading image');
//   }
// });

// exports.uploadImage = functions.https.onRequest((req: any, res: any) => {
//   if (req.method !== 'POST') {
//     console.log('this method is not allowed', req.body);
//     return res.status(405).send('Method Not Allowed');
//   }

//   const busboy = new Busboy({ headers: req.headers });
//   const tmpdir = os.tmpdir();
//   let fileWrites: any = [];
//   let publicUrl = '';

//   console.log('being processed by busboy');
//   busboy.on(
//     'file',
//     (
//       fieldname: any,
//       file: any,
//       filename: any,
//       encoding: any,
//       mimetype: any
//     ) => {
//       // Note: os.tmpdir() is not recommended for production use; consider using a dedicated temp directory

//       const filepath = path.join(tmpdir, filename);
//       const filenamePath = `ckeditor-images/${filename}`;
//       console.log(' the filename path', filenamePath);
//       const writeStream = fs.createWriteStream(filepath);

//       file.pipe(writeStream);

//       const promise = new Promise((resolve, reject) => {
//         file.on('end', () => {
//           writeStream.end();
//           console.log('File stream ended:', filename);
//         });
//         writeStream.on('finish', () => {
//           console.log('File write finished, starting upload to GCS:', filename);
//           fs.createReadStream(filepath).pipe(
//             bucket
//               .file(filename)
//               .createWriteStream({
//                 metadata: {
//                   contentType: mimetype,
//                 },
//               })
//               .on('error', (error: any) => {
//                 console.error('Error uploading to GCS:', error);
//                 reject(error);
//               })
//               .on('finish', async () => {
//                 try {
//                   const uploadedFile = bucket.file(filename);
//                   await uploadedFile.makePublic();
//                   publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
//                   console.log('File uploaded and made public:', publicUrl);
//                   resolve(publicUrl);
//                 } catch (error) {
//                   reject(error);
//                 }
//               })
//           );
//         });
//         writeStream.on('error', (error: any) => {
//           console.error('Error writing file on server:', error);
//           reject(error);
//         });
//       });

//       fileWrites.push(promise);
//     }
//   );

//   busboy.on('finish', async () => {
//     console.log('Busboy finished processing');
//     try {
//       await Promise.all(fileWrites);
//       res.status(200).send({ url: publicUrl });
//     } catch (error) {
//       console.error('Failed to upload one or more files:', error);
//       res.status(500).send('Error uploading image');
//     }
//   });

//   busboy.end(req.rawBody);
// });

exports.uploadImage = functions.https.onRequest((req: any, res: any) => {
  console.log('Request received with method:', req.method);
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  // cors(req, res, () => {
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');

    // Sending response for preflight request
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    console.log('This method is not allowed', req.method);
    return res.status(405).send('Method Not Allowed');
  }
  // if (req.method === 'POST') {
  //   console.log('This is a post method', req.method);
  //   return res.status(200).send('Method Processed!');
  // }
  const busboy = new Busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  let fileWrites: any = [];
  let publicUrls = [];

  busboy.on(
    'file',
    (
      fieldname: any,
      file: any,
      filename: any,
      encoding: any,
      mimetype: any
    ) => {
      const filepath = path.join(tmpdir, filename);
      // const filenamePath = `ckeditor-images/${filename}`;
      const writeStream = fs.createWriteStream(filepath);

      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        file.on('end', () => {
          writeStream.end();
        });

        writeStream.on('finish', () => {
          const readStream = fs.createReadStream(filepath);
          readStream.pipe(
            bucket
              .file(filename)
              .createWriteStream({
                metadata: {
                  contentType: mimetype,
                },
              })
              .on('error', (error: any) => {
                console.error('Error uploading to GCS:', error);
                reject(error);
              })
              .on('finish', async () => {
                try {
                  const uploadedFile = bucket.file(filename);
                  await uploadedFile.makePublic();
                  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
                  console.log('File uploaded and made public:', publicUrl);
                  resolve(publicUrl);
                } catch (error) {
                  console.error('Error making file public:', error);
                  reject(error);
                }
              })
          );
        });

        writeStream.on('error', (error: any) => {
          console.error('Error writing file on server:', error);
          reject(error);
        });
      });

      fileWrites.push(promise);
    }
  );

  busboy.on('finish', async () => {
    try {
      publicUrls = await Promise.all(fileWrites);
      console.log('All files have been processed and uploaded', publicUrls);
      res.status(200).send({ urls: publicUrls });
    } catch (error) {
      console.error('Failed to upload one or more files:', error);
      res.status(500).send('Error uploading one or more files');
    }
  });

  busboy.end(req.rawBody);
  // });
});

export const createGoogleMeet = functions.https.onCall(
  async (data, context) => {
    try {
      const { solutionId, title, startTime, endTime } = data;

      // Validate input
      if (!solutionId || !title) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'solutionId and title are required.'
        );
      }

      // Retrieve the Base64-encoded service account key from Firebase Functions config
      const base64Encoded = functions.config()['googleapi'].service_account_key;
      if (!base64Encoded) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Service account key not configured.'
        );
      }

      // Decode the Base64 string
      const jsonString = Buffer.from(base64Encoded, 'base64').toString('utf8');

      // Parse JSON
      const serviceAccount = JSON.parse(jsonString);

      // Impersonate a user in your Google Workspace domain
      const userEmail = 'newworld@newworld-game.org'; // Replace with the user to impersonate

      const jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        undefined,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/calendar'],
        userEmail // User to impersonate
      );

      // Authorize the client
      await jwtClient.authorize();

      // Initialize the Calendar API
      const calendar = google.calendar({ version: 'v3', auth: jwtClient });

      // Create a unique requestId to prevent duplication
      const requestId = `meet-${solutionId}-${Date.now()}`;

      // Define event start and end times
      const eventStartTime = startTime ? new Date(startTime) : new Date();
      const eventEndTime = endTime
        ? new Date(endTime)
        : new Date(eventStartTime.getTime() + 60 * 60 * 1000); // Default +1 hour

      // Create the event with Google Meet link
      const event = {
        summary: title || 'Team Meeting',
        description: `Meeting for solution: ${solutionId}`,
        start: {
          dateTime: eventStartTime.toISOString(),
          timeZone: 'UTC', // Specify your desired time zone
        },
        end: {
          dateTime: eventEndTime.toISOString(),
          timeZone: 'UTC', // Specify your desired time zone
        },
        visibility: 'public', // Set visibility to public
        conferenceData: {
          createRequest: {
            requestId: requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }, // Correct conference type
          },
        },
      };

      // Log the event object for debuggin       g
      console.log('Creating event with data:', JSON.stringify(event, null, 2));

      // Insert the event into the calendar
      const response = await calendar.events.insert({
        calendarId: 'primary', // Use 'primary' or a specific calendar ID if using a shared calendar
        requestBody: event,
        conferenceDataVersion: 1,
      });

      // Log the response for debugging
      console.log(
        'Calendar API response:',
        JSON.stringify(response.data, null, 2)
      );

      // Extract the Meet link
      const hangoutLink = response.data.hangoutLink;

      if (!hangoutLink) {
        throw new functions.https.HttpsError(
          'internal',
          'Failed to create Google Meet link.'
        );
      }

      return {
        solutionId,
        hangoutLink,
      };
    } catch (error: any) {
      console.error('Error creating Google Meet link:', error);
      throw new functions.https.HttpsError('unknown', error.message, error);
    }
  }
);
