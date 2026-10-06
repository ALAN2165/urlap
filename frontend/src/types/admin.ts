import { ChatMessage } from '@/types';

export interface RecentSubmission {
  id: string; status: string; createdAt: string; pointsAwarded: number;
  username: string; challengeTitle: string; challengeSlug: string;
}
export interface TrendPoint { date: string; count: number; }
export interface TopLab { labId: string; title: string; count: number; }
export interface AdminOverview {
  totalUsers: number; totalLabs: number; totalChallenges: number;
  submissionsToday: number; submissionsYesterday: number; platformSuccessRate: number;
  dailyTrend: TrendPoint[]; topLabs: TopLab[]; recentSubmissions: RecentSubmission[];
}
export interface HealthCheck { ok: boolean; detail: string; }
export interface SystemHealth { database: HealthCheck; redis: HealthCheck; sqlGrader: HealthCheck; }

export interface AdminChallengeSummary {
  id: string; slug: string; titleEn: string; titleAr: string;
  difficulty: string; points: number; orderIndex: number;
}
export interface AdminLab {
  id: string; slug: string; titleEn: string; titleAr: string; orderIndex: number;
  challenges: AdminChallengeSummary[];
}
export interface AdminHint { id?: string; order: number; contentEn: string; contentAr: string; pointPenalty: number; }
export interface AdminChallengeDetail {
  id: string; slug: string; titleEn: string; titleAr: string;
  descriptionEn: string; descriptionAr: string; difficulty: string; points: number;
  labId: string | null; schemaJson: string | null; referenceAnswer: string | null; hints: AdminHint[];
}
export interface SqlTestResult { ok: boolean; columns: string[]; rows: unknown[][]; message: string; runtimeMs: number; }

export interface AdminUser {
  id: string; username: string; totalPoints: number;
  role: 'STUDENT' | 'ADMIN'; isBanned: boolean; createdAt: string; solvedCount: number;
}

export interface AdminReport {
  id: string; reason: string; createdAt: string; username: string; challengeTitle: string; challengeSlug: string;
}

export interface MostFailedChallenge { challengeId: string; title: string; failedCount: number; totalAttempts: number; failureRatePct: number; }
export interface MostUsedHint { hintId: string; challengeTitle: string; hintOrder: number; studentCount: number; }
export interface HardestChallenge { challengeId: string; title: string; avgAttempts: number; solveCount: number; }
export interface AdminAnalytics {
  mostFailedChallenges: MostFailedChallenge[];
  mostUsedHints: MostUsedHint[];
  overallAvgAttempts: number;
  hardestChallengesByAttempts: HardestChallenge[];
}

export interface AdminAlert {
  id: string; userId: string; username: string; challengeId: string; challengeTitle: string; challengeSlug: string;
  conversationId: string | null; claimedBy: string | null; reason: string; failCount: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'; createdAt: string;
}
export interface AdminConversation {
  id: string; username: string; challengeTitle: string | null; status: 'OPEN' | 'CLOSED'; messages: ChatMessage[];
}