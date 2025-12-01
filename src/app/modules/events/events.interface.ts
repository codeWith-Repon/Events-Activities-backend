export type TUpdateEvent = {
    title?: string;
    slug?: string;
    category?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    minParticipants?: number;
    maxParticipants?: number;
    fee?: number;
    images?: string[];        // URLs of new images
    deleteImages?: string[];  // URLs to delete from existing images
    status?: "OPEN" | "FULL" | "CANCELLED" | "COMPLETED";
};