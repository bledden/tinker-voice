import { useState, useCallback, useEffect } from "react";
import { Mic, Database, Activity, Home as HomeIcon, Key, FileText } from "lucide-react";

// Import pages
import { Home } from "./pages/Home";
import { Conversation } from "./pages/Conversation";
import { DataReview } from "./pages/DataReview";
import { TrainingPage } from "./pages/Training";
import { Settings } from "./pages/Settings";

// Import hooks
import { useVoice } from "./hooks/useVoice";
import { useAgents } from "./hooks/useAgents";
import { useTraining } from "./hooks/useTraining";

// Import types
import {
  TrainingIntent,
  DataSet,
  ValidationReport,
  TrainingConfig,
  ApiKeysStatus,
  DataRow,
} from "./types";

type AppPage = "home" | "conversation" | "data-review" | "training" | "settings";

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: "main" | "bottom";
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: HomeIcon, section: "main" },
  { id: "conversation", label: "Voice", icon: Mic, section: "main" },
  { id: "data-review", label: "Data", icon: Database, section: "main" },
  { id: "training", label: "Training runs", icon: Activity, section: "main" },
  { id: "settings", label: "API keys", icon: Key, section: "bottom" },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>("home");

  // Hooks for functionality
  const voice = useVoice();
  const agents = useAgents();
  const training = useTraining();

  // Application state
  const [intent, setIntent] = useState<TrainingIntent | null>(null);
  const [dataset, setDataset] = useState<DataSet | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig | null>(null);
  const [apiKeysStatus, setApiKeysStatus] = useState<ApiKeysStatus>({
    elevenlabs: false,
    anthropic: false,
    tonic: false,
    yutori: false,
    tinker: false,
  });

  // Parse intent when voice transcript changes
  useEffect(() => {
    const lastEntry = voice.transcript[voice.transcript.length - 1];
    if (lastEntry && lastEntry.role === "user" && !agents.isParsingIntent && !intent) {
      agents.parseIntent(lastEntry.text).then((parsedIntent) => {
        if (parsedIntent) {
          setIntent(parsedIntent);
        }
      });
    }
  }, [voice.transcript, agents.isParsingIntent, intent]);

  // Generate recommended config when dataset and intent are ready
  useEffect(() => {
    if (intent && dataset && validationReport && !trainingConfig && !agents.isRecommendingConfig) {
      agents.recommendConfig(intent, dataset).then((config) => {
        if (config) {
          setTrainingConfig(config);
        }
      });
    }
  }, [intent, dataset, validationReport, trainingConfig, agents.isRecommendingConfig]);

  // Handlers for DataReview page
  const handleGenerateData = useCallback(async () => {
    if (!intent) return;
    const data = await agents.generateSyntheticData(intent);
    if (data) {
      setDataset(data);
      setValidationReport(null);
    }
  }, [intent, agents]);

  const handleUploadFile = useCallback(async (file: File) => {
    // Parse CSV/JSONL file
    const text = await file.text();
    const rows: DataRow[] = [];

    if (file.name.endsWith(".jsonl")) {
      const lines = text.split("\n").filter((line) => line.trim());
      lines.forEach((line, index) => {
        try {
          const data = JSON.parse(line);
          rows.push({
            id: `row-${index}`,
            input: data.input || data.prompt || "",
            output: data.output || data.completion || data.response || "",
          });
        } catch {
          console.error("Failed to parse JSONL line:", index);
        }
      });
    } else if (file.name.endsWith(".csv")) {
      const lines = text.split("\n").filter((line) => line.trim());
      // Skip header
      lines.slice(1).forEach((line, index) => {
        const parts = line.split(",");
        if (parts.length >= 2) {
          rows.push({
            id: `row-${index}`,
            input: parts[0].trim().replace(/^"|"$/g, ""),
            output: parts.slice(1).join(",").trim().replace(/^"|"$/g, ""),
          });
        }
      });
    }

    const newDataset: DataSet = {
      id: `dataset-${Date.now()}`,
      name: file.name,
      rows,
      format: file.name.endsWith(".jsonl") ? "jsonl" : "csv",
      createdAt: new Date(),
      source: "upload",
    };

    setDataset(newDataset);
    setValidationReport(null);
  }, []);

  const handleValidateData = useCallback(async () => {
    if (!dataset) return;
    const report = await agents.validateData(dataset);
    if (report) {
      setValidationReport(report);
    }
  }, [dataset, agents]);

  // Handler for Training page
  const handleStartTraining = useCallback(async () => {
    if (!trainingConfig || !dataset) return;
    const run = await training.createRun(trainingConfig, dataset.id);
    if (run) {
      await training.startRun(run.id);
    }
  }, [trainingConfig, dataset, training]);

  // Handlers for Settings page
  const handleSaveApiKey = useCallback(async (service: keyof ApiKeysStatus, _key: string): Promise<boolean> => {
    setApiKeysStatus((prev) => ({ ...prev, [service]: true }));
    return true;
  }, []);

  const handleTestConnection = useCallback(async (_service: keyof ApiKeysStatus): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }, []);

  // Navigation helpers
  const goToConversation = useCallback(() => setCurrentPage("conversation"), []);
  const goToDataReview = useCallback(() => setCurrentPage("data-review"), []);
  const goToTraining = useCallback(() => setCurrentPage("training"), []);
  const goToHome = useCallback(() => setCurrentPage("home"), []);

  const renderPage = useCallback(() => {
    switch (currentPage) {
      case "home":
        return <Home onStart={goToConversation} />;
      case "conversation":
        return (
          <Conversation
            voice={voice}
            intent={intent}
            onProceed={goToDataReview}
            isParsingIntent={agents.isParsingIntent}
          />
        );
      case "data-review":
        return (
          <DataReview
            intent={intent!}
            dataset={dataset}
            validationReport={validationReport}
            isGenerating={agents.isGeneratingData}
            isValidating={agents.isValidating}
            onGenerateData={handleGenerateData}
            onUploadFile={handleUploadFile}
            onValidate={handleValidateData}
            onProceed={goToTraining}
            onBack={goToConversation}
          />
        );
      case "training":
        return (
          <TrainingPage
            config={trainingConfig}
            dataset={dataset}
            activeRun={training.activeRun}
            runs={training.runs}
            isLoadingConfig={agents.isRecommendingConfig}
            isCreating={training.isCreating}
            onStartTraining={handleStartTraining}
            onCancelTraining={() => training.activeRun && training.cancelRun(training.activeRun.id)}
            onSelectRun={training.setActiveRun}
            onBack={goToDataReview}
          />
        );
      case "settings":
        return (
          <Settings
            apiKeysStatus={apiKeysStatus}
            onSaveApiKey={handleSaveApiKey}
            onTestConnection={handleTestConnection}
            onBack={goToHome}
          />
        );
      default:
        return <Home onStart={goToConversation} />;
    }
  }, [
    currentPage,
    voice,
    intent,
    dataset,
    validationReport,
    trainingConfig,
    agents,
    training,
    apiKeysStatus,
    goToConversation,
    goToDataReview,
    goToTraining,
    goToHome,
    handleGenerateData,
    handleUploadFile,
    handleValidateData,
    handleStartTraining,
    handleSaveApiKey,
    handleTestConnection,
  ]);

  const mainNavItems = navItems.filter((item) => item.section !== "bottom");
  const bottomNavItems = navItems.filter((item) => item.section === "bottom");

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation - Tinker style */}
      <nav className="w-52 bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-text-primary">TinkerVoice</span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 py-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`
                  w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm
                  transition-colors duration-150
                  ${
                    isActive
                      ? "bg-sidebar-active text-sidebar-text-active font-medium"
                      : "text-sidebar-text hover:bg-sidebar-hover"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border py-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`
                  w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm
                  transition-colors duration-150
                  ${
                    isActive
                      ? "bg-sidebar-active text-sidebar-text-active font-medium"
                      : "text-sidebar-text hover:bg-sidebar-hover"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          {/* Docs link */}
          <a
            href="https://docs.tinkervoice.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors duration-150"
          >
            <FileText className="w-4 h-4" />
            Docs
          </a>
        </div>

        {/* User section */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-muted rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-accent">U</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">User</p>
              <p className="text-xs text-text-muted truncate">user@example.com</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-background">{renderPage()}</main>
    </div>
  );
}
