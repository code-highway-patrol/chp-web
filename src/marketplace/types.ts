export type Statue = {
  _id?: string;
  slug: string;
  title: string;
  body: string;
  /** Same as on-disk law.json; API usually sends a string, may be an object if stored as BSON doc. */
  lawJson?: string | object;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  stars: number;
  score?: number;
  hasStarred?: boolean;
};
