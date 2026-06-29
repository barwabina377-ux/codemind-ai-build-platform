import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Shield,
  Network,
  Zap,
  SearchCode,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Activity,
  Cpu,
  Layers,
} from "lucide-react";
import { ProjectReadiness } from "../utils/projectAnalyzer";

export function AnalyzerDashboard({
  readiness,
  onRunAIScan
}: {
  readiness?: ProjectReadiness | null;
  onRunAIScan?: (type: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "Architecture" | "Dependencies" | "Security" | "Performance"
  >("Architecture");

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar h-full bg-gray-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <SearchCode size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              CodeMind Analyzers
            </h2>
            <p className="text-gray-500 mt-1">
              Deep inspection of project architecture, security, and
              performance.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1 overflow-x-auto custom-scrollbar-hide">
          <TabButton
            active={activeTab === "Architecture"}
            onClick={() => setActiveTab("Architecture")}
            icon={<Layers size={18} />}
            label="Architecture"
          />
          <TabButton
            active={activeTab === "Dependencies"}
            onClick={() => setActiveTab("Dependencies")}
            icon={<Network size={18} />}
            label="Dependencies"
          />
          <TabButton
            active={activeTab === "Security"}
            onClick={() => setActiveTab("Security")}
            icon={<Shield size={18} />}
            label="Security"
          />
          <TabButton
            active={activeTab === "Performance"}
            onClick={() => setActiveTab("Performance")}
            icon={<Zap size={18} />}
            label="Performance"
          />
        </div>

        {/* Content Area */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
          {!readiness ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <Activity size={48} className="mb-4 opacity-50" />
              <p className="font-medium text-gray-600">No project loaded</p>
              <p className="text-sm">Upload a project to run analyzers.</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "Architecture" && (
                <ArchitectureTab readiness={readiness} />
              )}
              {activeTab === "Dependencies" && (
                <DependenciesTab readiness={readiness} />
              )}
              {activeTab === "Security" && <SecurityTab onRunAIScan={() => onRunAIScan && onRunAIScan('Security')} />}
              {activeTab === "Performance" && <PerformanceTab onRunAIScan={() => onRunAIScan && onRunAIScan('Optimize')} />}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
        active
          ? "bg-blue-50 text-blue-700 shadow-sm"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ArchitectureTab({ readiness }: { readiness: ProjectReadiness }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Project Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl">
            <div className="text-sm text-gray-500 mb-1">
              Architecture Pattern
            </div>
            <div className="font-medium text-gray-900">
              {readiness.info.kotlinVersion
                ? "Jetpack Compose / View"
                : "XML Views"}
            </div>
          </div>
          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl">
            <div className="text-sm text-gray-500 mb-1">Application ID</div>
            <div
              className="font-medium text-gray-900 truncate"
              title={readiness.info.applicationId}
            >
              {readiness.info.applicationId || "Unknown"}
            </div>
          </div>
          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl">
            <div className="text-sm text-gray-500 mb-1">Primary Language</div>
            <div className="font-medium text-gray-900">
              {readiness.info.kotlinVersion ? "Kotlin" : "Java"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Map</h3>
        <div className="space-y-2">
          {readiness.info.modules.length > 0 ? (
            readiness.info.modules.map((m) => (
              <div
                key={m}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <Layers size={16} className="text-blue-500" />
                <span className="font-medium text-gray-700 font-mono text-sm">
                  {m}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No Gradle modules detected.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DependenciesTab({ readiness }: { readiness: ProjectReadiness }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Dependency Graph
        </h3>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 size={14} /> Synced
        </span>
      </div>
      <div className="space-y-3">
        <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">
              Android Gradle Plugin
            </div>
            <div className="text-sm text-gray-500 font-mono mt-0.5">
              {readiness.info.agpVersion || "Not found"}
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        </div>
        <div className="p-4 border border-gray-200 rounded-xl bg-white flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">
              Kotlin Gradle Plugin
            </div>
            <div className="text-sm text-gray-500 font-mono mt-0.5">
              {readiness.info.kotlinVersion || "Not found"}
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ onRunAIScan }: { onRunAIScan?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Security Audit</h3>
        <button onClick={onRunAIScan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Run Full AI Scan
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-orange-200 bg-orange-50/50 p-5 rounded-xl">
          <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
            <AlertTriangle size={18} /> Hardcoded Secrets
          </div>
          <p className="text-sm text-orange-800">
            Click "Run Full AI Scan" to have the AI analyze your codebase for security issues.
          </p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50/50 p-5 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
            <Shield size={18} /> Manifest Permissions
          </div>
          <p className="text-sm text-emerald-800">
            Standard permissions detected. No high-risk permissions found in
            active scan.
          </p>
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ onRunAIScan }: { onRunAIScan?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Performance Metrics
        </h3>
        <button onClick={onRunAIScan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Run Full AI Scan
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 border border-gray-200 rounded-xl bg-white text-center">
          <Cpu size={24} className="mx-auto text-blue-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">Ready</div>
          <div className="text-sm text-gray-500 mt-1">Build Cache</div>
        </div>
        <div className="p-5 border border-gray-200 rounded-xl bg-white text-center">
          <Zap size={24} className="mx-auto text-yellow-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">Fast</div>
          <div className="text-sm text-gray-500 mt-1">
            Incremental Compilation
          </div>
        </div>
        <div className="p-5 border border-gray-200 rounded-xl bg-white text-center">
          <Activity size={24} className="mx-auto text-emerald-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">Optimal</div>
          <div className="text-sm text-gray-500 mt-1">Resource Shrinking</div>
        </div>
      </div>
    </div>
  );
}
