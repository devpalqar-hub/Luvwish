importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA9OEeWmPU1sHcscA3XJdL-rmvaAxcjj1Q",
    authDomain: "doulas-41702.firebaseapp.com",
    projectId: "doulas-41702",
    messagingSenderId: "806325345760",
    appId: "1:806325345760:web:a27fa65d457a7ce2be5f85"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    console.log('[firebase-messaging-sw.js] Background message', payload);
});
