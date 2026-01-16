import { Mic, ArrowRight, MessageSquare, Sparkles, CheckCircle, Zap } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="h-full bg-background overflow-auto">
      {/* Hero section - centered in available space */}
      <div className="min-h-full flex items-center justify-center px-6 md:px-12 py-12 md:py-20">
        <div className="w-full max-w-4xl mx-auto">
          {/* Hero text - centered */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-text-primary mb-5 md:mb-6 tracking-tight leading-tight">
              Fine-tune models with your voice
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-text-secondary max-w-lg mx-auto leading-relaxed">
              Describe your ML task, generate training data, and launch fine-tuning — all through natural conversation.
            </p>
          </div>

          {/* Main CTA - with proper spacing */}
          <div className="flex flex-col items-center gap-6 md:gap-8 mb-16 md:mb-24">
            <button
              onClick={onStart}
              className="group relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-accent flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:shadow-accent/20"
            >
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
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
          <div className="mb-12 md:mb-16">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-8 md:mb-10 text-center">
              How it works
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Step
                number={1}
                title="Describe"
                description="Tell us what you want to train"
                icon={<MessageSquare className="w-5 h-5" />}
              />
              <Step
                number={2}
                title="Generate"
                description="We create training data"
                icon={<Sparkles className="w-5 h-5" />}
              />
              <Step
                number={3}
                title="Review"
                description="Validate your dataset"
                icon={<CheckCircle className="w-5 h-5" />}
              />
              <Step
                number={4}
                title="Train"
                description="Launch fine-tuning"
                icon={<Zap className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
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
    <div className="relative pt-6 pb-5 px-4 rounded-xl border border-border bg-surface flex flex-col items-center text-center">
      {/* Step number badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shadow-sm">
        {number}
      </div>
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

interface FeatureProps {
  title: string;
  description: string;
}

function Feature({ title, description }: FeatureProps) {
  return (
    <div className="p-6 rounded-xl border border-border bg-surface">
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
