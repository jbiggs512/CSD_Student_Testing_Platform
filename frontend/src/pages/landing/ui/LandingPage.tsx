import altiusLogo from '@shared/assets/logos/altius-sticker.png'
import triviumLogo from '@shared/assets/logos/trivium-transparent.png'
import background from '@shared/assets/altius-bg.jpg'
import rocket from '@shared/assets/coloured-rocket.png'
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@shared/components'
import {
  CONTACT_EMAIL,
  LANDING_AUDIENCES,
  LANDING_FEATURES,
  PLATFORM_DESCRIPTION,
} from '../model'

/**
 * The logo PNGs sit on a large square transparent canvas, so they are cropped to
 * their visible bounds (in source pixels) to keep sizing predictable.
 */
interface CroppedLogoProps {
  src: string
  alt: string
  className?: string
  source: number
  crop: { x: number; y: number; width: number; height: number }
}

function CroppedLogo({ src, alt, className, source, crop }: CroppedLogoProps) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: `${crop.width} / ${crop.height}` }}
    >
      <img
        src={src}
        alt={alt}
        className="absolute max-w-none"
        style={{
          width: `${(source / crop.width) * 100}%`,
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
        }}
      />
    </div>
  )
}

export function LandingPage() {
  return (
    <main
      id="landing-page"
      className="relative flex min-h-screen flex-col overflow-hidden bg-navy bg-cover bg-bottom bg-no-repeat"
      style={{ backgroundImage: `url(${background})` }}
    >
      <header className="flex items-start justify-between px-6 pt-6 sm:px-10">
        <img src={altiusLogo} alt="Altius" className="w-28 drop-shadow-lg sm:w-36" />
        <nav aria-label="Account" className="flex gap-3">
          <Button asChild className="shadow-md">
            <a href="/register">Register</a>
          </Button>
          <Button asChild className="shadow-md">
            <a href="/login">Login</a>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 content-start gap-10 px-6 pt-8 sm:px-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
        <div className="flex flex-col">
          <h1 className="text-4xl leading-tight font-bold text-white sm:text-5xl xl:text-6xl">
            Elevate Your Learning
            <br />
            with Altius
          </h1>
          <p className="mt-4 max-w-md text-base text-white/90 sm:text-lg">
            The competitive reinforcement testing platform built to launch learners to that
            next grade boundary.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {PLATFORM_DESCRIPTION}
          </p>
          <dl className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            {LANDING_AUDIENCES.map((audience) => (
              <div key={audience.label} className="border-l-2 border-yellow pl-3">
                <dt className="text-sm font-semibold tracking-wide text-yellow uppercase">
                  {audience.label}
                </dt>
                <dd className="mt-1 text-sm text-white/80">{audience.description}</dd>
              </div>
            ))}
          </dl>
          <img
            src={rocket}
            alt=""
            aria-hidden="true"
            className="mt-6 hidden w-full max-w-xs animate-[float_6s_ease-in-out_infinite] drop-shadow-2xl motion-reduce:animate-none lg:block"
          />
        </div>

        <ul className="flex flex-col gap-6 lg:items-end lg:pt-6" aria-label="Features">
          {LANDING_FEATURES.map((feature) => (
            <li key={feature.title} className="w-full lg:max-w-sm">
              <Card className="gap-2 rounded-2xl border-white/30 bg-white/20 text-center text-white shadow-lg backdrop-blur-md">
                <CardHeader className="gap-2">
                  <CardTitle className="font-heading text-2xl font-bold">
                    <h2 className="text-white">{feature.title}</h2>
                  </CardTitle>
                  <CardDescription className="text-sm text-white/90">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative z-10 flex flex-col items-center gap-1 pt-16 pb-6">
        <CroppedLogo
          src={triviumLogo}
          alt="Trivium"
          className="w-28"
          source={2000}
          crop={{ x: 233, y: 833, width: 1468, height: 370 }}
        />
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-sm text-navy underline-offset-4 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </footer>
    </main>
  )
}
