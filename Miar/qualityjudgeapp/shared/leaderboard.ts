export type LeaderboardFilterRow = {
  name: string;
  tier: string;
  overall: number;
};

export function filterLeaderboard<T extends LeaderboardFilterRow>(rows: T[], searchTerm: string, tier: string): T[] {
  const normalized = searchTerm.trim().toLocaleLowerCase("ar");
  return rows.filter((row) => {
    const matchesSearch = !normalized || row.name.toLocaleLowerCase("ar").includes(normalized);
    const matchesTier = tier === "all" || row.tier === tier;
    return matchesSearch && matchesTier;
  });
}
