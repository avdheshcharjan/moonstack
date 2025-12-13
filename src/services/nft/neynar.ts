/**
 * Neynar Service
 *
 * Service for fetching Farcaster user data via Neynar API
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_BASE = 'https://api.neynar.com/v2';

export interface NeynarProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  score: number; // Engagement score (0-1)
  followerCount: number;
  followingCount: number;
}

/**
 * Fetch a Farcaster user's profile from Neynar
 *
 * @param fid - Farcaster ID
 * @returns User profile with engagement score
 */
export async function fetchNeynarProfile(fid: number): Promise<NeynarProfile> {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is not configured');
  }

  try {
    const url = `${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.users || data.users.length === 0) {
      throw new Error(`No user found for FID ${fid}`);
    }

    const user = data.users[0];

    // Calculate engagement score (0-1) based on follower count
    // This is a simple heuristic - you can make it more sophisticated
    const followerCount = user.follower_count || 0;
    const followingCount = user.following_count || 0;

    // Score calculation:
    // - Heavy weight on follower count
    // - Bonus for high follower/following ratio (not just following everyone)
    const baseScore = Math.min(followerCount / 10000, 0.7); // Max 0.7 from followers
    const ratioBonus = followerCount > 0 && followingCount > 0
      ? Math.min((followerCount / followingCount) / 10, 0.3)
      : 0;

    const score = Math.min(baseScore + ratioBonus, 1.0);

    return {
      fid: user.fid,
      username: user.username || '',
      displayName: user.display_name || user.username || '',
      pfpUrl: user.pfp_url || '',
      score,
      followerCount,
      followingCount,
    };
  } catch (error) {
    console.error(`Error fetching Neynar profile for FID ${fid}:`, error);
    throw error;
  }
}
