import { TeamRosterPlayer } from './player.model';

export interface SquadEntry {
  _id: string;
  tournament: string;
  team: string;
  player: TeamRosterPlayer;
  joinedAt: string;
}