import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Clock } from "lucide-react";
import type { TestPageContentProps } from "../model";
import logo from '@shared/assets/altius-transparent.png'
import { useNavigate } from 'react-router';

export function TestPageContent(props: TestPageContentProps) {
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
          <Button onClick={() => navigate('/dashboard')}>Exit Test</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row lg:items-center">
        <div className="mb-6 lg:mb-0">
          <p className="mb-2 text-sm font-semibold uppercase text-white/80">{props.testDetails.course} - {props.testDetails.subject}</p>
          <h1 className="mb-2 font-heading text-5xl font-bold text-white">{props.testDetails.testName}</h1>
          <p className="text-sm text-white/80">{props.testDetails.course} - {props.testDetails.description}</p>
        </div>

        {/* Timer Card */}
        {props.testDetails.timed && (
          <Card className="flex items-center justify-center rounded-xl bg-white px-8 py-4 text-navy">
            <div className="flex flex-col items-center">
              <p className="mb-1 text-sm font-semibold uppercase text-navy/80">Time Remaining</p>
              <div className="flex items-center gap-3 font-heading text-4xl font-bold">
                <Clock className="h-8 w-8" strokeWidth={2.5} />
                {toMMSS(props.testDetails.timeLimitMinutes * 60)}
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
                Question {props.testDetails.currentQuestion} of {props.testDetails.questionsPerAttempt}
              </p>
              <Progress value={(props.testDetails.currentQuestion) / (props.testDetails.questionsPerAttempt) * 100} />
            </div>

            <h3 className="mb-8 font-heading text-3xl font-bold text-navy">{props.testDetails.questions[props.testDetails.currentQuestion - 1]?.questionText}</h3>

            <div className="mb-8 flex flex-col gap-4">
              {props.testDetails.questions[props.testDetails.currentQuestion - 1]?.options.map((option) => (
                <button 
                  key={option.optionId}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${option.selected
                    ? 'border-navy bg-slate-50' // Selected option styling
                    : 'border-border hover:bg-muted/50'
                    }`}
                  onClick={() => props.onSelectOption(props.testDetails.questions[props.testDetails.currentQuestion - 1].questionId, option.optionId)}
                >
                  {/* Custom Radio Button UI */}
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${option.selected ? 'border-navy' : 'border-slate-300'
                    }`}>
                    {option.selected && <div className="h-2.5 w-2.5 rounded-full bg-navy" />}
                  </div>

                  {/* Letter Indicator (A, B, C, D */}
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-bold text-navy">
                    {String.fromCodePoint(65 + props.testDetails.questions[props.testDetails.currentQuestion - 1].options.indexOf(option))}
                  </div>

                  {/* Answer Text */}
                  <span className="text-sm font-medium text-navy">{option.optionText}</span>
                </button>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button variant="outline" className="border-border text-navy hover:bg-muted"
                onClick={() => props.onNavigateQuestion(props.testDetails.currentQuestion - 1)} disabled={props.testDetails.currentQuestion === 1}>
                Previous Question
              </Button>
              <Button onClick={() => props.onNavigateQuestion(props.testDetails.currentQuestion + 1)} disabled={props.testDetails.currentQuestion === props.testDetails.questionsPerAttempt}>
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
              {Array.from({ length: props.testDetails.questionsPerAttempt }, (_, i) => i + 1).map((num) => {
                const isAnswered = props.isAnswered(num);
                const isCurrent = num === (props.testDetails.currentQuestion);

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

            <Button className="w-full">
              Submit Test
            </Button>
          </Card>
        </div>

      </div>
    </main>
  );
}