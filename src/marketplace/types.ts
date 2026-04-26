export type Statue = {
  _id?: string;
  slug: string;
  title: string;
  body: string;
  /** Serialized law.json (object), same as on disk under docs/chp/laws/<name>/ */
  lawJson?: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  stars: number;
  score?: number;
  hasStarred?: boolean;
};
