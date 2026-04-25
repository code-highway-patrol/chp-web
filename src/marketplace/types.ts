export type Statue = {
  _id?: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  stars: number;
  score?: number;
  hasStarred?: boolean;
};
