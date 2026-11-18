import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import background from '@shared/assets/altius-bg.jpg'
import rocket from '@shared/assets/coloured-rocket.png'
import altiusLogo from '@shared/assets/logos/altius-sticker.png'
import triviumLogo from '@shared/assets/logos/trivium-transparent.png'

/**
 * The Trivium logo PNG sits on a 2000px square transparent canvas, so it is
 * cropped to its visible bounds (in source pixels) to keep sizing predictable.
 */
const TRIVIUM_CROP = {
  source: 2000,
  x: 233,
  y: 833,
  width: 1468,
  height: 370,
} as const

export function AuthHeroPanel() {
  const backgroundStyle = { '--login-bg': `url(${background})` } as CSSProperties

  return (
    <div
      aria-label="Altius branding artwork"
      style={backgroundStyle}
      // Animating width from ~200% to 100% contracts the full-screen landing sky into
      // the left column on mount without stretching the child logo or rocket images.
      className="relative z-20 flex h-full min-h-72 w-full flex-col justify-between overflow-hidden rounded-2xl bg-navy bg-(image:--login-bg) bg-cover bg-bottom bg-no-repeat p-6 select-none sm:min-h-96 sm:rounded-3xl sm:p-8 lg:min-h-0 lg:animate-[hero-dock-left_0.7s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
    >
      <div className="relative z-10 flex items-start">
        <Link to="/" aria-label="Back to home">
          <img
            src={altiusLogo}
            alt="Altius"
            className="w-28 drop-shadow-lg transition-transform hover:scale-105 sm:w-36"
          />
        </Link>
      </div>

      <div className="relative z-10 my-auto flex items-center justify-center py-4">
        <img
          src={rocket}
          alt=""
          aria-hidden="true"
          className="w-48 animate-[float_6s_ease-in-out_infinite] drop-shadow-2xl motion-reduce:animate-none sm:w-64 lg:w-80 xl:w-96"
        />
      </div>

      <div className="relative z-10 flex items-end">
        <div
          className="relative w-24 overflow-hidden sm:w-28"
          style={{
            aspectRatio: `${TRIVIUM_CROP.width} / ${TRIVIUM_CROP.height}`,
          }}
        >
          <img
            src={triviumLogo}
            alt="Trivium"
            className="absolute max-w-none"
            style={{
              width: `${(TRIVIUM_CROP.source / TRIVIUM_CROP.width) * 100}%`,
              left: `${(-TRIVIUM_CROP.x / TRIVIUM_CROP.width) * 100}%`,
              top: `${(-TRIVIUM_CROP.y / TRIVIUM_CROP.height) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

