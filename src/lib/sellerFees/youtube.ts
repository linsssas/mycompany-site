export const YOUTUBE_CREATOR_AD_SHARE = 0.55;
export const YOUTUBE_MEMBERSHIP_CREATOR_SHARE = 0.7;

export interface YoutubeInput {
  monthlyViews: number;
  cpm: number;
  monetizedViewPercent: number;
}

export interface YoutubeResult {
  estimatedAdRevenue: number;
  creatorShare: number;
  youtubeShare: number;
}

export function calculateYoutubeRevenue(input: YoutubeInput): YoutubeResult {
  const monetizedViews = input.monthlyViews * (input.monetizedViewPercent / 100);
  const estimatedAdRevenue = (monetizedViews / 1000) * input.cpm;
  const creatorShare = estimatedAdRevenue * YOUTUBE_CREATOR_AD_SHARE;
  const youtubeShare = estimatedAdRevenue - creatorShare;

  return { estimatedAdRevenue, creatorShare, youtubeShare };
}
