// Searchable fields for rating queries (text search)
export const ratingSearchableFields = [
  "review",
  "event.title",
  "rater.name",
  "rater.email"
];

// Filterable fields for rating queries (exact match or range)
export const ratingFilterableFields = [
  "searchTerm",
  "rating",
  "eventId",
  "userId",
  "participantId"
];

// Rating scale
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const REVIEW_MAX_LENGTH = 500;
