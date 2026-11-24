import type { LucideIcon } from 'lucide-react'
import { ArrowRightIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card'

interface DashboardLinkCardProps {
  icon: LucideIcon
  title: string
  description: string
  to: string
  linkLabel: string
}

export function DashboardLinkCard({
  icon: Icon,
  title,
  description,
  to,
  linkLabel,
}: Readonly<DashboardLinkCardProps>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <Icon className="size-8 text-pink" aria-hidden="true" />
        <CardTitle className="font-heading text-2xl text-plum">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild>
          <Link to={to}>
            {linkLabel}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
