// Searchable fields for rating queries (text search)
export const ratingSearchableFields = [
  "review",
  "event.title",
  "rater.name",
  "rater.email"
];

// All filterable fields (exact match)
export const ratingFilterableFields = [
  "searchTerm",
  "rating",
  "eventId",
  "userId",
  "participantId"
];

// Fields that require numeric conversion from query string
export const ratingNumericFilterFields = ["rating"];

// Per-endpoint picks — eventId/userId come from route params so excluded per endpoint
export const eventRatingFilterableFields = ratingFilterableFields.filter(
  (f) => f !== "eventId" && f !== "userId"
);

export const userRatingFilterableFields = ratingFilterableFields.filter(
  (f) => f !== "userId"
);

// Rating scale
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const REVIEW_MAX_LENGTH = 500;
