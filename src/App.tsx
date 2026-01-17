import { useState, useCallback, useEffect } from "react";
import { Mic, Database, Activity, Home as HomeIcon, Key, ExternalLink, Menu, X } from "lucide-react";

// Import pages
import { Home } from "./pages/Home";
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

type AppPage = "home" | "data-review" | "training" | "settings";

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "data-review", label: "Data", icon: Database },
  { id: "training", label: "Training", icon: Activity },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    openai: false,
    anthropic: false,
    anyscale: false,
    yutori: false,
  });
  const [dataSourceChoice, setDataSourceChoice] = useState<'generate' | 'upload' | null>(null);

  // Extract stable references from agents hook
  const { parseIntent, isParsingIntent, error: agentError } = agents;

  // Parse intent when voice transcript changes
  useEffect(() => {
    const lastEntry = voice.transcript[voice.transcript.length - 1];
    if (lastEntry && lastEntry.role === "user" && !isParsingIntent && !intent) {
      parseIntent(lastEntry.text).then((parsedIntent) => {
        if (parsedIntent) {
          setIntent(parsedIntent);
        }
      });
    }
  }, [voice.transcript, isParsingIntent, intent, parseIntent]);

  // Generate recommended config when dataset and intent are ready
  useEffect(() => {
    console.log('[App] Config trigger check:', {
      hasIntent: !!intent,
      hasDataset: !!dataset,
      hasValidationReport: !!validationReport,
      hasTrainingConfig: !!trainingConfig,
      isRecommendingConfig: agents.isRecommendingConfig
    });
    if (intent && dataset && validationReport && !trainingConfig && !agents.isRecommendingConfig) {
      console.log('[App] Triggering recommendConfig...');
      agents.recommendConfig(intent, dataset).then((config) => {
        console.log('[App] recommendConfig returned:', config);
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

  const handleStartTraining = useCallback(async () => {
    if (!trainingConfig || !dataset) return;
    // Pass the actual training data rows so they can be uploaded to Anyscale
    const run = await training.createRun(trainingConfig, dataset.id, dataset.rows);
    if (run) {
      await training.startRun(run.id);
    }
  }, [trainingConfig, dataset, training]);

  const handleSaveApiKey = useCallback(async (service: keyof ApiKeysStatus, _key: string): Promise<boolean> => {
    setApiKeysStatus((prev) => ({ ...prev, [service]: true }));
    return true;
  }, []);

  const handleTestConnection = useCallback(async (_service: keyof ApiKeysStatus): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }, []);

  // Navigation
  const goToDataReview = useCallback((dataSource: 'generate' | 'upload') => {
    setDataSourceChoice(dataSource);
    setCurrentPage("data-review");
  }, []);
  const goToTraining = useCallback(() => setCurrentPage("training"), []);
  const goToHome = useCallback(() => setCurrentPage("home"), []);

  // Start a new task - resets voice/intent state but keeps background processes running
  const handleNewTask = useCallback(() => {
    // Reset voice transcript
    voice.clearTranscript();
    // Reset intent and data choice (but dataset generation continues in background)
    setIntent(null);
    setDataSourceChoice(null);
    setValidationReport(null);
    setTrainingConfig(null);
    // Go back to home
    setCurrentPage("home");
  }, [voice]);

  const renderPage = useCallback(() => {
    switch (currentPage) {
      case "home":
        return (
          <Home
            voice={voice}
            intent={intent}
            isParsingIntent={isParsingIntent}
            isGenerating={agents.isGeneratingData}
            error={agentError}
            onProceed={goToDataReview}
            onNewTask={handleNewTask}
          />
        );
      case "data-review":
        return (
          <DataReview
            intent={intent}
            dataset={dataset}
            validationReport={validationReport}
            isGenerating={agents.isGeneratingData}
            isValidating={agents.isValidating}
            onGenerateData={handleGenerateData}
            onUploadFile={handleUploadFile}
            onValidate={handleValidateData}
            onProceed={goToTraining}
            onBack={() => setCurrentPage("home")}
            onNewTask={handleNewTask}
            autoGenerate={dataSourceChoice === 'generate'}
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
            onBack={() => setCurrentPage("data-review")}
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
        return (
          <Home
            voice={voice}
            intent={intent}
            isParsingIntent={isParsingIntent}
            error={agentError}
            onProceed={goToDataReview}
          />
        );
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
    dataSourceChoice,
    isParsingIntent,
    agentError,
    goToDataReview,
    goToTraining,
    goToHome,
    handleNewTask,
    handleGenerateData,
    handleUploadFile,
    handleValidateData,
    handleStartTraining,
    handleSaveApiKey,
    handleTestConnection,
  ]);

  const handleNavClick = (page: AppPage) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-text-primary">ChatMLE</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-surface-subtle transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`
        fixed md:relative inset-y-0 left-0 z-40
        w-[clamp(12rem,20vw,16rem)] bg-surface border-r border-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:transform-none
      `}>
        {/* Logo - hidden on mobile (shown in header) */}
        <div className="hidden md:block p-fluid-md border-b border-border">
          <div className="flex items-center gap-fluid-sm">
            <div className="w-[clamp(2rem,4vw,2.5rem)] h-[clamp(2rem,4vw,2.5rem)] bg-accent rounded-lg flex items-center justify-center">
              <Mic className="w-[clamp(1rem,2vw,1.25rem)] h-[clamp(1rem,2vw,1.25rem)] text-white" />
            </div>
            <span className="font-semibold text-text-primary text-fluid-base">ChatMLE</span>
          </div>
        </div>

        {/* Spacer for mobile header */}
        <div className="md:hidden h-14" />

        {/* Main Nav - centered vertically in available space */}
        <div className="flex-1 flex flex-col justify-center p-fluid-sm">
          <div className="stack-fluid-xs">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full px-fluid-sm py-fluid-xs flex items-center gap-fluid-sm rounded-lg text-left text-fluid-sm
                    transition-colors
                    ${isActive
                      ? "bg-sidebar-active text-sidebar-text-active font-medium"
                      : "text-sidebar-text hover:bg-sidebar-hover"
                    }
                  `}
                >
                  <Icon className="w-[clamp(1.1rem,2vw,1.35rem)] h-[clamp(1.1rem,2vw,1.35rem)]" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="border-t border-border p-fluid-sm stack-fluid-xs">
          <button
            onClick={() => handleNavClick("settings")}
            className={`
              w-full px-fluid-sm py-fluid-xs flex items-center gap-fluid-sm rounded-lg text-left text-fluid-sm
              transition-colors
              ${currentPage === "settings"
                ? "bg-sidebar-active text-sidebar-text-active font-medium"
                : "text-sidebar-text hover:bg-sidebar-hover"
              }
            `}
          >
            <Key className="w-[clamp(1.1rem,2vw,1.35rem)] h-[clamp(1.1rem,2vw,1.35rem)]" />
            API Keys
          </button>
          <a
            href="https://docs.chatmle.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-fluid-sm py-fluid-xs flex items-center gap-fluid-sm rounded-lg text-left text-fluid-sm text-sidebar-text hover:bg-sidebar-hover transition-colors"
          >
            <ExternalLink className="w-[clamp(1.1rem,2vw,1.35rem)] h-[clamp(1.1rem,2vw,1.35rem)]" />
            Documentation
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pt-14 md:pt-0">{renderPage()}</main>
    </div>
  );
}
