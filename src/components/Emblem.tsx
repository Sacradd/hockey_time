import './Emblem.css'

/** Исходная эмблема — масштаб в CSS, чтобы круг заполнялся без смены картинки */
const LOGO_SRC = '/emblem.jpeg'

export function Emblem() {
  return (
    <div className="emblem">
      <img
        className="emblem__img"
        src={LOGO_SRC}
        alt="Время хоккея"
        decoding="async"
      />
    </div>
  )
}
