export interface Lab {
  id: string; slug: string; titleEn: string; titleAr: string;
  orderIndex: number; totalChallenges: number; solvedChallenges: number;
}

export interface PathChallenge {
  id: string; slug: string; titleEn: string; titleAr: string;
  difficulty: string; points: number; orderIndex: number; solved: boolean; locked: boolean;
}

export interface LabDetail {
  id: string; slug: string; titleEn: string; titleAr: string; challenges: PathChallenge[];
}

export interface SchemaColumn { name: string; type: string; key?: 'PK' | 'FK'; }
export interface SchemaTable { name: string; columns: SchemaColumn[]; }
export interface Schema { tables: SchemaTable[]; }

export interface StarterCode { id: string; language: string; code: string; }

export interface HintMeta { id: string; order: number; pointPenalty: number; }
export interface HintRevealed extends HintMeta { contentEn: string; contentAr: string; }

export interface ChallengeDetail {
  id: string; slug: string; titleEn: string; titleAr: string;
  descriptionEn: string; descriptionAr: string; difficulty: string; points: number;
  schemaJson?: string | null; starterCodes: StarterCode[]; hints: HintMeta[]; locked: boolean;
}

export interface Submission {
  id: string; status: string; actualOutput?: string | null; errorMessage?: string | null;
  pointsAwarded: number; runtimeMs?: number | null;
  resultColumns?: string[]; resultRows?: unknown[][]; totalRows?: number;
  expectedRowCount?: number | null;
  failureReason?: 'COLUMNS' | 'ROW_COUNT' | 'ROWS' | 'NOT_ROW_RETURNING' | null;
}

export interface Stats {
  totalPoints: number; rank: number; totalUsers: number; solvedChallenges: number; totalChallenges: number;
}

export interface LeaderboardEntry {
  rank: number; id: string; username: string; totalPoints: number; avatarUrl?: string | null;
}

export type AnnouncementType = 'INFO' | 'NEW_LAB' | 'FEATURE' | 'MAINTENANCE';

export interface Announcement {
  id: string; titleEn: string; titleAr: string; contentEn: string; contentAr: string;
  type: AnnouncementType; createdAt: string;
}