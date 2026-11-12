import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Progress,
  RadioIndicator,
} from '@shared/components'
import { Clock, TriangleAlert } from "lucide-react";
import type { TestPageContentProps } from "../model";
import logo from '@shared/assets/altius-transparent.png'
import { useNavigate } from 'react-router';

export function TestPageContent(props: Readonly<TestPageContentProps>) {
  const navigate = useNavigate();

  const toMMSS = (secs: number) => {
    const secNum = Number.parseInt(secs.toString(), 10);
    const minutes = Math.floor(secNum / 60) % 60;
    const seconds = secNum % 60;

    return [minutes, seconds]
      .map((val) => (val < 10 ? `0${val}` : val))
      .filter((val, index) => val !== "00" || index > 0)
      .join(":")
      .replace(/^0/, "");
  };



  return (
    <main id="dashboard-page" className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div className="flex w-full items-center justify-end px-2">
          <img src={logo} alt="Logo" className="h-16 w-auto mr-auto" />

          {/* Exit test button and confirmation dialog */}
          <Dialog>
            <DialogTrigger render={<Button data-testid="exit-test">Exit Test</Button>} />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Are you sure you want to exit this test?</DialogTitle>
                <DialogDescription>
                  If you exit without submitting, all of your progress will be lost.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose>
                  <Button variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose>
                  <Button data-testid="continue-exit-test" onClick={() => navigate('/dashboard')}>
                    Exit
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </header>

      {/* Hero Section */}
      <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row lg:items-center">
        <div className="mb-6 lg:mb-0">
          <p className="mb-2 text-sm font-semibold uppercase text-white/80">{props.testDetails.course} - {props.testDetails.subject}</p>
          <h1 className="mb-2 font-heading text-5xl font-bold text-white">{props.testDetails.test_name}</h1>
          <p className="text-sm text-white/80">{props.testDetails.description}</p>
        </div>

        {/* Timer Card */}
        {props.testDetails.timed && (
          <Card className="flex items-center justify-center rounded-xl bg-white px-8 py-4 text-navy">
            <div className="flex flex-col items-center">
              <p className="mb-1 text-sm font-semibold uppercase text-navy/80">Time Remaining</p>
              <div className="flex items-center gap-3 font-heading text-4xl font-bold">
                <Clock className="h-8 w-8" strokeWidth={2.5} />
                {toMMSS(props.testDetails.time_limit_minutes * 60)}
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* Question Area */}
        <div className="lg:col-span-2">
          <Card className="p-8 shadow-sm">
            <div className="mb-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                Question {props.testDetails.current_question} of {props.testDetails.questions_per_attempt}
              </p>
              <Progress value={(props.testDetails.current_question) / (props.testDetails.questions_per_attempt) * 100} />
            </div>

            <h3 className="mb-8 font-heading text-3xl font-bold text-navy">{props.testDetails.questions[props.testDetails.current_question - 1]?.question_text}</h3>

            <div className="mb-8 flex flex-col gap-4">
              {props.testDetails.questions[props.testDetails.current_question - 1]?.options.map((option) => (
                <button
                  key={option.option_id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${option.selected
                    ? 'border-navy bg-slate-50' // Selected option styling
                    : 'border-border hover:bg-muted/50'
                    }`}
                  onClick={() => props.onSelectOption(props.testDetails.questions[props.testDetails.current_question - 1].question_id, option.option_id)}
                >
                  {/* Custom Radio Button UI */}
                  <RadioIndicator selected={option.selected} />

                  {/* Letter Indicator (A, B, C, D */}
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-bold text-navy">
                    {String.fromCodePoint(65 + props.testDetails.questions[props.testDetails.current_question - 1].options.indexOf(option))}
                  </div>

                  {/* Answer Text */}
                  <span className="text-sm font-medium text-navy">{option.option_text}</span>
                </button>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button variant="outline" className="border-border text-navy hover:bg-muted"
                onClick={() => props.onNavigateQuestion(props.testDetails.current_question - 1)} disabled={props.testDetails.current_question === 1}>
                Previous Question
              </Button>
              <Button onClick={() => props.onNavigateQuestion(props.testDetails.current_question + 1)} disabled={props.testDetails.current_question === props.testDetails.questions_per_attempt}>
                Next Question
              </Button>
            </div>
          </Card>
        </div>

        {/* Question Navigation Grid */}
        <div className="lg:col-span-1">
          <Card className="p-6 shadow-sm">
            <h3 className="mb-6 font-heading text-2xl font-bold text-navy">Questions</h3>

            {/* Grid of buttons for question navigation */}
            <div className="mb-8 grid grid-cols-5 gap-3">
              {Array.from({ length: props.testDetails.questions_per_attempt }, (_, i) => i + 1).map((num) => {
                const isAnswered = props.isAnswered(num);
                const isCurrent = num === (props.testDetails.current_question);

                let borderBgClasses = 'border-border bg-white text-navy hover:border-slate-400';
                if (isAnswered) {
                  borderBgClasses = 'border-navy bg-navy text-white';
                } else if (isCurrent) {
                  borderBgClasses = 'border-primary bg-white text-primary outline outline-1 outline-primary';
                }

                return (
                  <button
                    key={num}
                    className={`flex aspect-square items-center justify-center rounded border text-sm font-bold transition-colors ${borderBgClasses}`}
                    onClick={() => props.onNavigateQuestion(num)}
                  >{num}</button>
                );
              })}
            </div>

            {/* Legend for question navigation */}
            <div className="mb-8 flex flex-col gap-3 text-sm font-medium text-navy">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-sm bg-navy" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-sm border border-border bg-white" />
                <span>Not Answered</span>
              </div>
            </div>

            {/* Submit test button and confirmation dialog */}
            <Dialog>
              <DialogTrigger render={<Button data-testid="submit-test" className="w-full">
                Submit Test
              </Button>}>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure you want to submit?</DialogTitle>
                  <DialogDescription>
                    Once you submit your test, you can no longer edit your answers and your results will be calculated.
                    {props.submitError && (
                      <Alert variant="destructive" aria-live="polite" className="mt-6">
                        <TriangleAlert aria-hidden="true" />
                        <AlertDescription>{props.submitError}</AlertDescription>
                      </Alert>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose>
                    <Button variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    data-testid="continue-submit-test"
                    onClick={() => void props.onSubmit?.()}
                    disabled={props.isSubmitting}
                  >
                    {props.isSubmitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </div>
      </div>
    </main>
  );
}