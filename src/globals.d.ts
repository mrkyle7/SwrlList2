// Stylesheets imported for their side effects (webpack's css-loader).
declare module '*.css';

// Replaced at build time by webpack's DefinePlugin (see webpack.config.js).
declare const USE_FIREBASE_EMULATORS: boolean;

/** Set by webpack's DefinePlugin: the app version shown in the menu, e.g. "v2.0.0 · 1a2b3c4". */
declare const APP_VERSION: string;
