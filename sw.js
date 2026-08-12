/* Student legacy service-worker compatibility bridge.
   Existing installed PWAs that still check /sw.js will load the new worker. */
importScripts("./firebase-messaging-sw.js?v=5.0.0");
