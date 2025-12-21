"use client";

import { useState } from "react";
import React from "react";
import { ConceptsTab } from "~/components/ConceptsTab";
import { LinksTab } from "~/components/LinksTab";
import { TextInputTab } from "~/components/TextInputTab";
import { CapsulesTab } from "~/components/CapsulesTab";
import { SettingsTab } from "~/components/SettingsTab";
import { ConfigTab } from "~/components/ConfigTab";
import { Dashboard } from "~/components/Dashboard";
import { ErrorBoundary } from "~/components/ErrorBoundary";

type Tab = "dashboard" | "concepts" | "links" | "text-input" | "capsules" | "settings" | "config";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "concepts", label: "Concepts" },
    { id: "links", label: "Links" },
    { id: "text-input", label: "Input" },
    { id: "capsules", label: "Capsules" },
    { id: "config", label: "Writing Config" },
    { id: "settings", label: "AI Settings" },
  ];

  // Keep all tabs mounted but hidden - this preserves their state
  const renderTab = (tabId: Tab, component: React.ReactNode) => {
    return (
      <div key={tabId} className={activeTab === tabId ? "" : "hidden"}>
        {component}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b-2 border-blue-100 px-8 py-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Thomas Writing Assistant
        </h1>
        <p className="text-base text-gray-600 mt-2">
          AI-powered writing assistant with Zettelkasten knowledge base
        </p>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex gap-1 mb-10 border-b-2 border-gray-300">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 font-bold transition-all ${
                activeTab === tab.id
                  ? "text-white bg-blue-600 border-b-4 border-blue-800 shadow-lg"
                  : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
              } rounded-t-lg`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {renderTab("dashboard", (
            <ErrorBoundary>
              <Dashboard onNavigate={(tab) => setActiveTab(tab as Tab)} />
            </ErrorBoundary>
          ))}
          {renderTab("concepts", (
            <ErrorBoundary>
              <ConceptsTab />
            </ErrorBoundary>
          ))}
          {renderTab("links", (
            <ErrorBoundary>
              <LinksTab />
            </ErrorBoundary>
          ))}
          {renderTab("text-input", (
            <ErrorBoundary>
              <TextInputTab />
            </ErrorBoundary>
          ))}
          {renderTab("capsules", (
            <ErrorBoundary>
              <CapsulesTab />
            </ErrorBoundary>
          ))}
          {renderTab("config", (
            <ErrorBoundary>
              <ConfigTab />
            </ErrorBoundary>
          ))}
          {renderTab("settings", (
            <ErrorBoundary>
              <SettingsTab />
            </ErrorBoundary>
          ))}
        </div>
      </div>
    </div>
  );
}

