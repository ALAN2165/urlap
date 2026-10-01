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