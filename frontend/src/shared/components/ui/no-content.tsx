import { Card } from './card'

interface NoContentProps {
    title: string; // Main heading text shown in plum 
    description: string; // Description below the title
    icon: React.ReactNode; // Icon above the title
}

export function NoContentCard({
    title,
    description,
    icon,
}: Readonly<NoContentProps>) {
    return (
        <Card className="gap-0 border-0 py-0 shadow-md">
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-32 text-center">
                <div className="rounded-full bg-muted p-3">
                    {icon}
                </div>
                <div className="space-y-1">
                    <h2 className="font-medium">{title}</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
        </Card>
    );
}