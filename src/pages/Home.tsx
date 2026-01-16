import { Mic, ArrowRight, MessageSquare, Sparkles, CheckCircle, Zap } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="h-full bg-background overflow-auto">
      {/* Main content - fluid centering */}
      <div className="page-fluid">
        <div className="content-fluid">
          {/* Hero section */}
          <div className="layout-centered mb-fluid-xl">
            <h1 className="text-fluid-3xl font-semibold text-text-primary mb-fluid-sm tracking-tight leading-tight">
              Fine-tune models with your voice
            </h1>
            <p className="text-fluid-base text-text-secondary max-w-lg leading-relaxed">
              Describe your ML task, generate training data, and launch fine-tuning — all through natural conversation.
            </p>
          </div>

          {/* CTA section */}
          <div className="layout-centered mb-fluid-2xl">
            <button
              onClick={onStart}
              className="group relative w-[clamp(5rem,12vw,8rem)] h-[clamp(5rem,12vw,8rem)] rounded-full bg-accent flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:shadow-accent/20 mb-fluid-md"
            >
              <Mic className="w-[clamp(2rem,5vw,3.5rem)] h-[clamp(2rem,5vw,3.5rem)] text-white" />
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
          <div className="mb-fluid-xl">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-fluid-lg text-center">
              How it works
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 grid-fluid-lg">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 grid-fluid-lg">
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
    <div className="card-fluid relative flex flex-col items-center text-center pt-[clamp(1.5rem,3vw,2rem)]">
      {/* Step number badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center shadow-sm">
        {number}
      </div>
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-fluid-sm">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-fluid-xs">{title}</h3>
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
    <div className="card-fluid-lg">
      <h3 className="text-sm font-semibold text-text-primary mb-fluid-xs">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}
