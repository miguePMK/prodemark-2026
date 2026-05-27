import { FIREBASE_CONFIG } from './config.js';

firebase.initializeApp(FIREBASE_CONFIG);

export const db               = firebase.database();
export const usersRef         = db.ref("users");
export const matchesRef       = db.ref("matches");
export const predictionsRef   = db.ref("predictions");
export const specialConfigRef = db.ref("special_config");
export const specialPredsRef  = db.ref("special_predictions");
