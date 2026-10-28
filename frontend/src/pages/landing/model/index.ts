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

export const PLATFORM_DESCRIPTION =
  'Altius turns revision into a challenge worth winning. Lecturers set short, timed multiple-choice quizzes for each module, and students take them to reinforce what they have learned, earning points for every correct answer and seeing exactly where they stand against their classmates and their own past results.'

export interface LandingAudience {
  label: string
  description: string
}

export const LANDING_AUDIENCES: LandingAudience[] = [
  {
    label: 'For students',
    description:
      'Practise little and often, climb the leaderboards and spot weaker topics well before the exam.',
  },
  {
    label: 'For lecturers',
    description:
      'Build timed quizzes for your modules and keep your cohort revising between lectures.',
  },
]
