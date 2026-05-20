import { KHL_TEAMS } from '@/data/khlTeams'
import { TeamAvatar } from '@/components/TeamAvatar'
import './TeamPicker.css'

interface TeamPickerProps {
  value: string
  onChange: (slug: string) => void
}

export function TeamPicker({ value, onChange }: TeamPickerProps) {
  return (
    <div className="team-picker" role="listbox" aria-label="Команда КХЛ">
      {KHL_TEAMS.map((team) => {
        const selected = value === team.slug
        return (
          <button
            key={team.slug}
            type="button"
            role="option"
            aria-selected={selected}
            className={`team-picker__item ${selected ? 'team-picker__item--selected' : ''}`}
            title={team.name}
            onClick={() => onChange(team.slug)}
          >
            <TeamAvatar slug={team.slug} size={48} />
            <span className="team-picker__name">{team.name}</span>
          </button>
        )
      })}
    </div>
  )
}
