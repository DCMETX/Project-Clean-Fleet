// Your settings live here so re-uploading index.html never overwrites them.
// Upload this file to the same folder as index.html. Replace every PASTE_ value.
// (Firebase web config values are designed to be public; your Firestore/Storage Rules protect the data.)
window.APP_CONFIG = {
  firebase: {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
    projectId: "PASTE_YOUR_PROJECT_ID_HERE",
    storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
    appId: "PASTE_YOUR_APP_ID_HERE"
  },
  // Leave blank until the Metra snapshot job is running. Format:
  // https://raw.githubusercontent.com/<owner>/<repo>/live-data/metra-live.json
  liveFeedUrl: ""
};
