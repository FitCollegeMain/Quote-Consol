import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// One Firebase app for the whole console. The web API key in the config file is
// a public project identifier, not a secret — every read and write is gated by
// the rules in firestore.rules, which are enforced on Google's servers.
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persistent local cache means an advisor who loses signal mid-quote still gets
// the save recorded; Firestore replays the write when the connection returns.
// Multi-tab manager keeps that cache consistent across duplicate browser tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
