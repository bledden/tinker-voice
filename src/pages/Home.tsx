import { Mic, Sparkles, Database, Zap, ArrowRight, Play } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="min-h-screen bg-background gradient-mesh-bg overflow-auto">
      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-8 py-16">
        {/* Badge */}
        <div className="animate-fade-in opacity-0 mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted text-accent text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Fine-Tuning
          </span>
        </div>

        {/* Hero text */}
        <div className="text-center mb-12 max-w-3xl animate-fade-in opacity-0 animate-stagger-1">
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight tracking-tight">
            Fine-tune models with
            <span className="gradient-text block mt-2">your voice</span>
          </h1>
          <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
            Describe your ML task naturally, generate synthetic training data,
            and launch fine-tuning jobs — all through conversation.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 animate-fade-in opacity-0 animate-stagger-2">
          <button
            onClick={onStart}
            className="group btn btn-lg btn-primary"
          >
            <Play className="w-5 h-5" />
            Start Voice Session
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button className="btn btn-lg btn-secondary">
            View Documentation
          </button>
        </div>

        {/* Voice visualization */}
        <div className="relative mb-20 animate-fade-in opacity-0 animate-stagger-3">
          <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl scale-150" />
          <button
            onClick={onStart}
            className="relative w-32 h-32 rounded-full gradient-bg flex items-center justify-center cursor-pointer glow-pulse transition-transform hover:scale-105"
          >
            <Mic className="w-12 h-12 text-white" />
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full animate-fade-in opacity-0 animate-stagger-4">
          <FeatureCard
            icon={<Mic className="w-6 h-6" />}
            iconBg="bg-accent-muted"
            iconColor="text-accent"
            title="Voice-First Interface"
            description="Speak naturally to describe your training intent. No forms, no configs — just conversation."
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            iconBg="bg-success-muted"
            iconColor="text-success"
            title="Synthetic Data Generation"
            description="Automatically generate high-quality training data tailored to your specific use case."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            iconBg="bg-warning-muted"
            iconColor="text-warning"
            title="Smart Configuration"
            description="AI recommends optimal hyperparameters based on your task, domain, and dataset size."
          />
        </div>

        {/* How it works */}
        <div className="mt-24 max-w-4xl w-full">
          <h2 className="text-2xl font-semibold text-text-primary text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Step number={1} title="Describe" description="Tell us what you want your model to do" />
            <Step number={2} title="Generate" description="We create synthetic training data" />
            <Step number={3} title="Review" description="Validate and refine your dataset" />
            <Step number={4} title="Train" description="Launch fine-tuning with optimal settings" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, iconBg, iconColor, title, description }: FeatureCardProps) {
  return (
    <div className="card card-hover p-8">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${iconBg} ${iconColor} mb-6`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-3">
        {title}
      </h3>
      <p className="text-text-secondary leading-relaxed">
        {description}
      </p>
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
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full gradient-bg text-white font-bold text-lg mb-4">
        {number}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}
