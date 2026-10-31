import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import altiusLogo from '@shared/assets/logos/altius-sticker.png'
import triviumLogo from '@shared/assets/logos/trivium-transparent.png'
import background from '@shared/assets/altius-bg.jpg'
import rocket from '@shared/assets/coloured-rocket.png'
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@shared/components'
import { ArrowRight, Mail } from 'lucide-react'
import {
  COMPANY_NAME,
  CONTACT_EMAIL,
  LANDING_AUDIENCES,
  LANDING_FEATURES,
  PLATFORM_DESCRIPTION,
} from '../model'

const COPYRIGHT_YEAR = new Date().getFullYear()

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

function CroppedLogo({
  src,
  alt,
  className,
  source,
  crop,
}: Readonly<CroppedLogoProps>) {
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
  const backgroundStyle = { '--landing-bg': `url(${background})` } as CSSProperties

  return (
    <main
      id="landing-page"
      // Below lg the content stacks and the page gets tall, so a full-page
      // background would push the light clouds behind the cards. Instead the sky
      // is a gradient and the clouds are confined to the footer band.
      className="relative flex min-h-screen flex-col overflow-hidden bg-navy bg-linear-to-b from-navy from-35% to-[#55255c] lg:bg-(image:--landing-bg) lg:bg-cover lg:bg-bottom lg:bg-no-repeat"
      style={backgroundStyle}
    >
      <header className="flex items-start justify-between px-6 pt-6 sm:px-10">
        <img src={altiusLogo} alt="Altius" className="w-28 drop-shadow-lg sm:w-36" />
        <nav aria-label="Account" className="flex gap-3">
          <Button asChild className="shadow-md">
            <Link to="/register">Register</Link>
          </Button>
          <Button asChild className="shadow-md">
            <Link to="/login">Login</Link>
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
            The competitive reinforcement testing platform built to launch learners to that next
            grade boundary.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {PLATFORM_DESCRIPTION}
          </p>
          <dl className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            {LANDING_AUDIENCES.map(({ label, description, icon: Icon }) => (
              <div key={label} className="border-l-2 border-yellow pl-3">
                <dt className="flex items-center gap-2 text-sm font-semibold tracking-wide text-yellow uppercase">
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-white/80">{description}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-yellow px-8 text-base font-semibold text-navy shadow-lg shadow-yellow/25 transition-transform hover:-translate-y-0.5 hover:bg-yellow/90"
            >
              <Link to="/register">
                Get started
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-white/80">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-yellow underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
          <img
            src={rocket}
            alt=""
            aria-hidden="true"
            className="mt-6 hidden w-full max-w-xs animate-[float_6s_ease-in-out_infinite] drop-shadow-2xl motion-reduce:animate-none lg:block"
          />
        </div>

        <ul className="flex flex-col gap-6 lg:items-end lg:pt-6" aria-label="Features">
          {LANDING_FEATURES.map(({ title, description, icon: Icon }) => (
            <li key={title} className="w-full lg:max-w-sm">
              <Card className="gap-2 rounded-2xl border-white/30 bg-white/20 text-center text-white shadow-lg backdrop-blur-md">
                <CardHeader className="justify-items-center gap-2">
                  <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-yellow/90 text-navy shadow-md">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="font-heading text-2xl font-bold">
                    <h2 className="text-white">{title}</h2>
                  </CardTitle>
                  <CardDescription className="text-sm text-white/90">{description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative isolate z-10 flex justify-center px-4 pt-36 pb-4 sm:pt-48 lg:pt-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-(image:--landing-bg) bg-[length:auto_170%] bg-bottom bg-no-repeat lg:hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 30%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%)',
          }}
        />
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-full border border-white/60 bg-white/80 px-5 py-2 text-center shadow-md backdrop-blur-md"
        >
          <CroppedLogo
            src={triviumLogo}
            alt="Trivium"
            className="w-20"
            source={2000}
            crop={{ x: 233, y: 833, width: 1468, height: 370 }}
          />
          <span aria-hidden="true" className="hidden text-navy/30 sm:inline">
            ·
          </span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-navy underline-offset-4 hover:underline sm:text-sm"
          >
            <Mail aria-hidden="true" className="size-3.5" />
            {CONTACT_EMAIL}
          </a>
          <span aria-hidden="true" className="hidden text-navy/30 sm:inline">
            ·
          </span>
          <p className="w-full text-xs text-navy/70 sm:w-auto">
            © {COPYRIGHT_YEAR} {COMPANY_NAME}
          </p>
        </nav>
      </footer>
    </main>
  )
}
