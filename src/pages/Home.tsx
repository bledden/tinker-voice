import { Mic, ArrowRight } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="h-full bg-background overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-text-primary mb-4 tracking-tight">
            Fine-tune models with your voice
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Describe your ML task, generate training data, and launch fine-tuning — all through natural conversation.
          </p>
        </div>

        {/* Main CTA */}
        <div className="flex flex-col items-center mb-20">
          <button
            onClick={onStart}
            className="group relative w-24 h-24 rounded-full bg-accent flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg mb-6"
          >
            <Mic className="w-10 h-10 text-white" />
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
        <div className="mb-16">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-8 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <Step number={1} title="Describe" description="Tell us what you want to train" />
            <Step number={2} title="Generate" description="We create training data" />
            <Step number={3} title="Review" description="Validate your dataset" />
            <Step number={4} title="Train" description="Launch fine-tuning" />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6">
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
}

function Step({ number, title, description }: StepProps) {
  return (
    <div className="text-center">
      <div className="w-8 h-8 rounded-full bg-accent text-white text-sm font-medium flex items-center justify-center mx-auto mb-3">
        {number}
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}

interface FeatureProps {
  title: string;
  description: string;
}

function Feature({ title, description }: FeatureProps) {
  return (
    <div className="p-5 rounded-lg border border-border bg-surface">
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}
