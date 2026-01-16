import { Mic, ArrowRight, MessageSquare, Sparkles, CheckCircle, Zap } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="h-full bg-background overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-3 tracking-tight leading-tight">
            Fine-tune models with your voice
          </h1>
          <p className="text-base md:text-lg text-text-secondary max-w-lg mx-auto leading-relaxed">
            Describe your ML task, generate training data, and launch fine-tuning — all through natural conversation.
          </p>
        </div>

        {/* Main CTA */}
        <div className="flex flex-col items-center mb-14">
          <button
            onClick={onStart}
            className="group relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-accent flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg mb-5"
          >
            <Mic className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </button>
          <button
            onClick={onStart}
            className="btn btn-primary btn-lg"
          >
            Start Voice Session
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* How it works */}
        <div className="mb-12">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-6 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <Step
              number={1}
              title="Describe"
              description="Tell us what you want to train"
              icon={<MessageSquare className="w-4 h-4" />}
            />
            <Step
              number={2}
              title="Generate"
              description="We create training data"
              icon={<Sparkles className="w-4 h-4" />}
            />
            <Step
              number={3}
              title="Review"
              description="Validate your dataset"
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <Step
              number={4}
              title="Train"
              description="Launch fine-tuning"
              icon={<Zap className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature
            title="Voice-First"
            description="Speak naturally to describe your training intent"
          />
          <Feature
            title="Synthetic Data"
            description="Generate quality training examples with AI"
          />
          <Feature
            title="Smart Config"
            description="Optimized hyperparameters for your task"
          />
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function Step({ number, title, description, icon }: StepProps) {
  return (
    <div className="relative p-4 rounded-lg border border-border bg-surface text-center">
      {/* Step number badge */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-accent text-white text-xs font-medium flex items-center justify-center">
        {number}
      </div>
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-accent-muted text-accent flex items-center justify-center mx-auto mb-2 mt-1">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-0.5">{title}</h3>
      <p className="text-xs text-text-muted leading-snug">{description}</p>
    </div>
  );
}

interface FeatureProps {
  title: string;
  description: string;
}

function Feature({ title, description }: FeatureProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-surface">
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
