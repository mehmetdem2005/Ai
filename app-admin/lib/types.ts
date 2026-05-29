export type PendingItem = {
  id_hash: string;
  title: string;
  title_tr: string | null;
  link: string;
  source: string;
  summary: string | null;
  ai_insight: string | null;
  impact_score: number | null;
  category: string | null;
  processed_at: string;
};

export type PublishItem = {
  hash: string;
  title: string;
  title_tr: string | null;
  link: string;
  source: string;
  ai_insight: string | null;
  impact_score: number | null;
  category: string | null;
};

export type SocialPost = {
  platform: string;
  kind: string;
  content: string;
};

export type SocialResult = {
  posts: SocialPost[];
  strategy_note: string;
};

export type PublishResult = {
  count: number;
  markdown: string;
  html: string;
  beehiiv: unknown | null;
  social_posts: SocialResult;
  title: string;
};
