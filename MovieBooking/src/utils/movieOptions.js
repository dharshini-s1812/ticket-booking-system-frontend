// Single source of truth for the movie dropdown fields, so the admin form
// and the public location selector (Hero) never drift out of sync. Add a
// city/genre/etc. here and it shows up everywhere it's used.

export const LOCATIONS = ["Coimbatore", "Chennai", "Bengaluru", "Madurai"];

export const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
];

export const LANGUAGE_OPTIONS = [
  "Tamil",
  "English",
  "Hindi",
  "Telugu",
  "Malayalam",
  "Kannada",
];

// Indian censor-board certificates.
export const CERTIFICATE_OPTIONS = ["U", "U/A", "A", "S"];
