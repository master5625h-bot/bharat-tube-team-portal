// Ready-made task titles per team. Team names must match the names in the teams table.
export const GENERAL_PRESETS = [
  'Reel editing', 'Long video editing', 'Thumbnail', 'Captions / subtitles',
  'Script writing', 'Upload / publish', 'Motion graphics', 'Lyric video',
]

export const TEAM_PRESETS: Record<string, string[]> = {
  Marketing: ['Add new people', 'Number of posts'],
  Research: [
    'New features ideas and suggestions', 'New income sources', 'Testing competitor apps',
    'Kamiya nikalna dusre apps ki', 'Kamiya nikalna khud ke app ki',
  ],
  Editing: GENERAL_PRESETS,
}

// Options shown for an assignee in a given team: team set first, then general (without duplicates).
export function presetsFor(teamName?: string | null) {
  const own = (teamName && TEAM_PRESETS[teamName]) || []
  const general = GENERAL_PRESETS.filter(g => !own.includes(g))
  return { own, general }
}
