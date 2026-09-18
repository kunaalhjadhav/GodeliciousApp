// App-wide config constants that need a real value filled in before features
// depending on them will work. Unlike web (which reads process.env.NEXT_PUBLIC_*),
// React Native has no built-in env-var injection at build time, so these are
// plain exported constants — edit this file directly with your real key.

// Used for reverse-geocoding "use my current location" into a readable
// address on Checkout and Booking screens. Get a key from Google Cloud
// Console > APIs & Services > Credentials, with the Geocoding API enabled.
// Leave blank to disable auto-fill (GPS coordinates still work for delivery,
// the address field just won't be filled in automatically).
export const GOOGLE_MAPS_API_KEY = "AIzaSyAMVHG92yiSUlaPmGUG9usTBbGLrmPNbss";
