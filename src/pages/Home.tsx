import { Mic, Sparkles, Database, Cpu, ArrowRight } from 'lucide-react';

export interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">Home</h1>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-6">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-semibold text-text-primary mb-3">
            Voice-Controlled Fine-Tuning
          </h2>
          <p className="text-base text-text-secondary max-w-md">
            Describe your ML task, generate training data, and fine-tune models — all through natural conversation.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-12">
          <div className="p-5 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-success-muted mb-4">
              <Sparkles className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1.5">
              Voice-First Interface
            </h3>
            <p className="text-sm text-text-secondary">
              Speak your training intent naturally
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent-muted mb-4">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1.5">
              Synthetic Data Generation
            </h3>
            <p className="text-sm text-text-secondary">
              Auto-generate quality training data
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-info-muted mb-4">
              <Cpu className="w-5 h-5 text-info" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1.5">
              Smart Configurations
            </h3>
            <p className="text-sm text-text-secondary">
              AI-optimized training settings
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Mic className="w-4 h-4" />
          Start Voice Session
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Footer hint */}
        <p className="mt-6 text-sm text-text-muted">
          Click to begin your voice-controlled training workflow
        </p>
      </div>
    </div>
  );
}
