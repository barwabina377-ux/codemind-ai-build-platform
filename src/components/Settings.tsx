import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Server,
  ArrowRightLeft,
  Zap,
} from "lucide-react";

interface ProviderConfig {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  isTested: boolean;
  models: string[];
}

export function Settings() {
  const [providers, setProviders] = useState<ProviderConfig[]>([
    {
      id: "google",
      name: "Google Gemini",
      key: "",
      isActive: false,
      isTested: false,
      models: ["gemini-2.5-flash", "gemini-1.5-pro"],
    },
    {
      id: "openai",
      name: "OpenAI",
      key: "",
      isActive: false,
      isTested: false,
      models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      key: "",
      isActive: false,
      isTested: false,
      models: ["claude-3-5-sonnet", "claude-3-opus"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      key: "",
      isActive: false,
      isTested: false,
      models: ["openrouter/auto"],
    },
    {
      id: "groq",
      name: "Groq",
      key: "",
      isActive: false,
      isTested: false,
      models: ["llama3-70b-8192", "mixtral-8x7b-32768"],
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      key: "",
      isActive: false,
      isTested: false,
      models: ["deepseek-coder", "deepseek-chat"],
    },
  ]);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    type: "success" | "error";
  } | null>(null);

  const [routingRules, setRoutingRules] = useState<{
    mode: 'strict' | 'smart' | 'manual';
    complex: string;
    fast: string;
    manualProvider: string;
  }>({
    mode: 'strict',
    complex: 'gemini-1.5-pro',
    fast: 'gemini-2.5-flash',
    manualProvider: 'google',
  });

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("codemind_api_keys");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProviders((prev) =>
          prev.map((p) => {
            const savedProvider = parsed.find((sp: any) => sp.id === p.id);
            return savedProvider
              ? {
                  ...p,
                  key: savedProvider.key,
                  isActive: savedProvider.isActive,
                  isTested: savedProvider.isTested,
                }
              : p;
          }),
        );
      } catch (e) {
        console.error("Failed to parse saved keys", e);
      }
    }

    const savedRules = localStorage.getItem("codemind_routing_rules");
    if (savedRules) {
      try {
        setRoutingRules(JSON.parse(savedRules));
      } catch (e) {
        console.error("Failed to parse saved routing rules", e);
      }
    }
  }, []);

  const saveKeys = (newProviders: ProviderConfig[]) => {
    localStorage.setItem("codemind_api_keys", JSON.stringify(newProviders));
    localStorage.setItem(
      "codemind_routing_rules",
      JSON.stringify(routingRules),
    );
    setProviders(newProviders);
    setToastMessage({ title: "Settings saved successfully", type: "success" });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleKeyChange = (id: string, value: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, key: value, isTested: false } : p,
      ),
    );
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testConnection = async (provider: ProviderConfig) => {
    if (!provider.key.trim()) {
      setToastMessage({ title: "Please enter an API key for " + provider.name, type: "error" });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setTestingId(provider.id);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codebase: "", message: "test", history: [], apiKeys: [{ id: provider.id, key: provider.key, isActive: true }], routingRules: { complex: "gemini-2.5-flash", fast: "gemini-2.5-flash" } }),
      });
      if (res.ok) {
        const newProviders = providers.map(p => p.id === provider.id ? { ...p, isTested: true, isActive: true } : p);
        saveKeys(newProviders);
        setToastMessage({ title: provider.name + " connection verified", type: "success" });
      } else {
        const err = await res.json().catch(() => ({}));
        setToastMessage({ title: provider.name + " test failed: " + (err.error || res.statusText), type: "error" });
        saveKeys(providers.map(p => p.id === provider.id ? { ...p, isTested: false, isActive: false } : p));
      }
    } catch (e: any) {
      setToastMessage({ title: "Connection error: " + e.message, type: "error" });
      saveKeys(providers.map(p => p.id === provider.id ? { ...p, isTested: false, isActive: false } : p));
    } finally {
      setTestingId(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar h-full bg-gray-50/50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Settings
            </h2>
            <p className="text-gray-500 mt-1">
              Manage API keys, models, and smart routing preferences.
            </p>
          </div>
          <button
            onClick={() => saveKeys(providers)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Save size={18} /> Save All
          </button>
        </div>

        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg flex items-center gap-3 ${toastMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={20} className="text-emerald-500" />
            ) : (
              <AlertCircle size={20} className="text-red-500" />
            )}
            <span className="font-medium">{toastMessage.title}</span>
          </motion.div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Key size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">API Key Manager</h3>
              <p className="text-sm text-gray-500">
                Securely store your keys locally. Keys never leave your browser
                except to make direct requests.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div className="w-full md:w-1/3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {provider.name}
                      {provider.isTested && (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports {provider.models.length} models
                    </p>
                  </div>
                  <div className="w-full md:w-2/3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[provider.id] ? "text" : "password"}
                        value={provider.key}
                        onChange={(e) =>
                          handleKeyChange(provider.id, e.target.value)
                        }
                        placeholder={`Enter ${provider.name} API Key`}
                        className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                      />
                      <button
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={testingId === provider.id || !provider.key}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {testingId === provider.id ? (
                        <RefreshCw
                          size={16}
                          className="animate-spin text-blue-500"
                        />
                      ) : (
                        "Test"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ArrowRightLeft size={20} /></div>
            <div><h3 className="font-semibold text-gray-900">Model Router</h3><p className="text-sm text-gray-500">Control how CodeMind routes AI requests.</p></div>
          </div>
          <div className="p-5 space-y-6">
            <div><h4 className="font-medium text-gray-900 mb-3 text-sm">Routing Mode</h4>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setRoutingRules(prev => ({ ...prev, mode: 'strict' }))} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all " + (routingRules.mode === 'strict' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}><Shield size={18} /><span className="text-xs font-semibold">Strict</span><span className="text-[10px] opacity-70">No fallback</span></button>
                <button onClick={() => setRoutingRules(prev => ({ ...prev, mode: 'smart' }))} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all " + (routingRules.mode === 'smart' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}><Zap size={18} /><span className="text-xs font-semibold">Smart Auto</span><span className="text-[10px] opacity-70">Auto fallback</span></button>
                <button onClick={() => setRoutingRules(prev => ({ ...prev, mode: 'manual' }))} className={"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all " + (routingRules.mode === 'manual' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}><Server size={18} /><span className="text-xs font-semibold">Manual</span><span className="text-[10px] opacity-70">Single provider</span></button>
              </div>
            </div>
            {routingRules.mode === 'strict' && (<><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="border border-gray-200 rounded-xl p-4 bg-gray-50"><h4 className="font-medium text-gray-900 mb-2 text-sm">Complex Tasks</h4><select value={routingRules.complex} onChange={e => setRoutingRules(prev => ({ ...prev, complex: e.target.value }))} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"><option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option><option value="gpt-4o">GPT-4o</option><option value="gemini-1.5-pro">Gemini 1.5 Pro</option></select></div><div className="border border-gray-200 rounded-xl p-4 bg-gray-50"><h4 className="font-medium text-gray-900 mb-2 text-sm">Fast Tasks</h4><select value={routingRules.fast} onChange={e => setRoutingRules(prev => ({ ...prev, fast: e.target.value }))} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="llama3-70b-8192">Llama-3-70b</option><option value="deepseek-coder">DeepSeek Coder</option></select></div></div><div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm"><Shield className="shrink-0 mt-0.5" size={18} /><p><strong>Strict Mode:</strong> Requests will never silently fallback. If the selected provider fails, you will be notified.</p></div></>)}
            {routingRules.mode === 'smart' && (<><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="border border-gray-200 rounded-xl p-4 bg-gray-50"><h4 className="font-medium text-gray-900 mb-2 text-sm">Primary Provider</h4><select value={routingRules.complex} onChange={e => setRoutingRules(prev => ({ ...prev, complex: e.target.value }))} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"><option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option><option value="gpt-4o">GPT-4o</option><option value="gemini-1.5-pro">Gemini 1.5 Pro</option></select></div><div className="border border-gray-200 rounded-xl p-4 bg-gray-50"><h4 className="font-medium text-gray-900 mb-2 text-sm">Fallback Provider</h4><select value={routingRules.fast} onChange={e => setRoutingRules(prev => ({ ...prev, fast: e.target.value }))} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="llama3-70b-8192">Llama-3-70b</option><option value="deepseek-coder">DeepSeek Coder</option></select></div></div><div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm"><Zap className="shrink-0 mt-0.5" size={18} /><p><strong>Smart Auto:</strong> Automatically falls back to the fallback provider if the primary fails.</p></div></>)}
            {routingRules.mode === 'manual' && (<><div className="border border-gray-200 rounded-xl p-4 bg-gray-50"><h4 className="font-medium text-gray-900 mb-2 text-sm">Selected Provider</h4><select value={routingRules.manualProvider} onChange={e => setRoutingRules(prev => ({ ...prev, manualProvider: e.target.value }))} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"><option value="google">Google Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="groq">Groq</option><option value="deepseek">DeepSeek</option></select></div><div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm"><Server className="shrink-0 mt-0.5" size={18} /><p><strong>Manual Mode:</strong> All requests use only the selected provider. No routing or fallback.</p></div></>)}
          </div>
        </div>
      </div>
    </div>
  );
}
