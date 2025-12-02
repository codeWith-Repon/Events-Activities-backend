// searchable (text fields for contains search)
export const eventParticipantSearchableFields = [
    "user.name",
    "user.email",
    "host.user.name",
    "host.user.email",
    "event.title",
];

// filterable (exact match / enum / fk)
export const eventParticipantFilterableFields = [
    "searchTerm",
    "event.category",
    "event.status",
    "user.gender",
    "joinStatus",
    "paymentStatus",
    "createdAt",
    "updatedAt"
];

