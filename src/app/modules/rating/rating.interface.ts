export interface ICreateRating {
  participantId: string;
  rating: number; // 1-5
  review?: string;
}

export interface IUpdateRating {
  rating?: number;
  review?: string;
}

export interface IRatingResponse {
  id: string;
  rating: number;
  review?: string;
  rater: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  event: {
    id: string;
    title: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IRatingWithMeta {
  avgRating: number;
  totalRatings: number;
  ratings: IRatingResponse[];
}
