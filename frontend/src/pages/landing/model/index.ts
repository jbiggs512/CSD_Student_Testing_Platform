// Landing page state, types, and business logic

export interface LandingFeature {
  title: string
  description: string
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: 'Competitive Learning',
    description: 'Earn points and climb the subject leaderboards',
  },
  {
    title: 'Track Your Progress',
    description:
      'Visualise grades over time with interactive charts and exportable performance reports',
  },
  {
    title: 'Tailored by Lecturers',
    description:
      'Take custom, timed multiple-choice quizzes designed specifically for your modules',
  },
]

export const CONTACT_EMAIL = 'emailaddress@trivium.com'
