"use client";

import { useState, useEffect } from "react";
import { Save, Server, Download, Search, Wifi, WifiOff } from "lucide-react";

interface Config {
  abs_url: string;
  abs_api_token: string;
  jackett_url: string;
  jackett_api_key: string;
  transmission_url: string;
  transmission_username: string;
  transmission_password: string;
}

interface TestResult {
  status: string;
  message: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    abs_url: "",
    abs_api_token: "",
    jackett_url: "",
    jackett_api_key: "",
    transmission_url: "",
    transmission_username: "admin",
    transmission_password: "admin",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingAbs, setTestingAbs] = useState(false);
  const [testingJackett, setTestingJackett] = useState(false);
  const [testingTransmission, setTestingTransmission] = useState(false);
  const [absResult, setAbsResult] = useState<TestResult | null>(null);
  const [jackettResult, setJackettResult] = useState<TestResult | null>(null);
  const [transmissionResult, setTransmissionResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (result: TestResult | null) => {
    if (!result) return "bg-gray-600";
    return result.status === "success" ? "bg-green-500" : result.status === "warning" ? "bg-blue-500" : "bg-red-500";
  };

  const getStatusText = (result: TestResult | null) => {
    if (!result) return "Not tested";
    return result.status === "success" ? "Connected" : result.status === "warning" ? "Warning" : "Error";
  };

  const testAbs = async () => {
    setTestingAbs(true);
    setAbsResult(null);
    try {
      const res = await fetch("/api/test/abs");
      const data = await res.json();
      setAbsResult(data);
    } catch (error) {
      setAbsResult({ status: "error", message: String(error) });
    } finally {
      setTestingAbs(false);
    }
  };

  const testJackett = async () => {
    setTestingJackett(true);
    setJackettResult(null);
    try {
      const res = await fetch("/api/test/jackett");
      const data = await res.json();
      setJackettResult(data);
    } catch (error) {
      setJackettResult({ status: "error", message: String(error) });
    } finally {
      setTestingJackett(false);
    }
  };

  const testTransmission = async () => {
    setTestingTransmission(true);
    setTransmissionResult(null);
    try {
      const res = await fetch("/api/test/transmission");
      const data = await res.json();
      setTransmissionResult(data);
    } catch (error) {
      setTransmissionResult({ status: "error", message: String(error) });
    } finally {
      setTestingTransmission(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="max-w-2xl space-y-8">
        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold">Audiobookshelf</h3>
            <span className={`ml-auto w-3 h-3 rounded-full ${getStatusColor(absResult)}`} title={getStatusText(absResult)}></span>
            <button
              onClick={testAbs}
              disabled={testingAbs}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {testingAbs ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Test"
              )}
            </button>
          </div>
          {absResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              absResult.status === "success" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
            }`}>
              {absResult.message}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input
                type="text"
                value={config.abs_url}
                onChange={(e) => setConfig({ ...config, abs_url: e.target.value })}
                placeholder="http://audiobookshelf:80"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Token</label>
              <input
                type="password"
                value={config.abs_api_token}
                onChange={(e) => setConfig({ ...config, abs_api_token: e.target.value })}
                placeholder="Enter your Audiobookshelf API token"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate an API token in your Audiobookshelf user settings
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold">Jackett</h3>
            <span className={`ml-auto w-3 h-3 rounded-full ${getStatusColor(jackettResult)}`} title={getStatusText(jackettResult)}></span>
            <button
              onClick={testJackett}
              disabled={testingJackett}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {testingJackett ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Test"
              )}
            </button>
          </div>
          {jackettResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              jackettResult.status === "success" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
            }`}>
              {jackettResult.message}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input
                type="text"
                value={config.jackett_url}
                onChange={(e) => setConfig({ ...config, jackett_url: e.target.value })}
                placeholder="http://jackett:9117"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Key</label>
              <input
                type="password"
                value={config.jackett_api_key}
                onChange={(e) => setConfig({ ...config, jackett_api_key: e.target.value })}
                placeholder="Enter your Jackett API key"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold">Transmission</h3>
            <span className={`ml-auto w-3 h-3 rounded-full ${getStatusColor(transmissionResult)}`} title={getStatusText(transmissionResult)}></span>
            <button
              onClick={testTransmission}
              disabled={testingTransmission}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {testingTransmission ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Test"
              )}
            </button>
          </div>
          {transmissionResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              transmissionResult.status === "success" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
            }`}>
              {transmissionResult.message}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input
                type="text"
                value={config.transmission_url}
                onChange={(e) => setConfig({ ...config, transmission_url: e.target.value })}
                placeholder="http://transmission:9091"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={config.transmission_username}
                  onChange={(e) => setConfig({ ...config, transmission_username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={config.transmission_password}
                  onChange={(e) => setConfig({ ...config, transmission_password: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : saved ? (
            <>
              <Save className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
