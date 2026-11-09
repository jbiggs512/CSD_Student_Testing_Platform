// components/completed-tests-dialog.tsx
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    ScrollArea,
    Progress
} from "@/shared/components";
import type { CompletedTest } from "../model"

export function CompletedTestsDialog({ tests }: { tests: CompletedTest[] }) {
    return (
        <Dialog>
            <DialogTrigger render={<Button variant="link" className="text-sm font-bold text-navy underline decoration-2 underline-offset-4 transition-colors hover:text-primary"> View All Completed Tests...</Button>}>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Completed Tests
                    </DialogTitle>
                    <DialogDescription>
                        {tests.length} {tests.length === 1 ? "test" : "tests"} completed
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <ul className="space-y-3">
                        {tests.map((test) => {
                            return (
                                <li key={test.id} className="rounded-xl border p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className="font-heading text-lg font-bold text-navy">
                                            {test.test_name}
                                        </h3>
                                        <span className="font-heading text-lg font-bold text-navy">
                                            {test.score_percentage}%
                                        </span>
                                    </div>
                                    <Progress value={test.score_percentage} className="w-full mb-2" />
                                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                                        <span>
                                            {test.questions_correct} of {test.questions_total} correct · {test.score_points} points
                                        </span>
                                        <span>{test.completed_date}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}