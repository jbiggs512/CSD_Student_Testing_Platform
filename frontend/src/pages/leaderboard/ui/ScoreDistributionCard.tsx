import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components";

export function ScoreDistributionCard() {
    return (
        <Card className="gap-0 border-0 py-0 shadow-md">
            <CardHeader className="gap-1 border-b py-5">
                <CardTitle className="font-heading text-2xl font-bold text-plum">
                   Cohort Score Distribution
                </CardTitle>
            </CardHeader>

            <CardContent className="p-2">
            </CardContent>
        </Card>
    )
}

