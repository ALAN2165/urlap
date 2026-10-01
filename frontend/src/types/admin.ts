export interface RecentSubmission {
  id: string;
  status: string;
  createdAt: string;
  pointsAwarded: number;
  username: string;
  challengeTitle: string;
  challengeSlug: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface TopLab {
  labId: string;
  title: string;
  count: number;
}

export interface AdminOverview {
  totalUsers: number;
  totalLabs: number;
  totalChallenges: number;
  submissionsToday: number;
  submissionsYesterday: number;
  platformSuccessRate: number;
  dailyTrend: TrendPoint[];
  topLabs: TopLab[];
  recentSubmissions: RecentSubmission[];
}

export interface HealthCheck {
  ok: boolean;
  detail: string;
}
export interface SystemHealth {
  database: HealthCheck;
  redis: HealthCheck;
  sqlGrader: HealthCheck;
}

export interface AdminChallengeSummary {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  difficulty: string;
  points: number;
  orderIndex: number;
}

export interface AdminLab {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  orderIndex: number;
  challenges: AdminChallengeSummary[];
}

export interface AdminHint {
  id?: string;
  order: number;
  contentEn: string;
  contentAr: string;
  pointPenalty: number;
}

export interface AdminChallengeDetail {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  difficulty: string;
  points: number;
  labId: string | null;
  schemaJson: string | null;
  referenceAnswer: string | null;
  hints: AdminHint[];
}

export interface SqlTestResult {
  ok: boolean;
  columns: string[];
  rows: unknown[][];
  message: string;
  runtimeMs: number;
}