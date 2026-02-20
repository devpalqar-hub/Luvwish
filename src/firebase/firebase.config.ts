import * as admin from 'firebase-admin';

// Only initialize if Firebase credentials are available
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
    console.log('✅ Firebase initialized successfully');
    // console.log(process.env.FIREBASE_PROJECT_ID)
    // console.log(process.env.FIREBASE_PRIVATE_KEY)
    // console.log(process.env.FIREBASE_CLIENT_EMAIL)


} else {
    console.warn('⚠️ Firebase credentials not configured. Firebase features will be unavailable.');
}

export { admin };
