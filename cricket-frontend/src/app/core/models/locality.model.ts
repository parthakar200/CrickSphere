export interface Locality {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  district?: string | null;
  state?: string | null;
  isActive: boolean;
  isDefault?: boolean;
  stats?: {
    matchCount: number;
    tournamentCount: number;
    teamCount: number;
    playerCount: number;
  };
}
