/**
 * MSW handlers for REST API endpoints
 */

import { http, HttpResponse } from "msw";

export const handlers = [
  // Concepts
  http.get("/api/concepts", () => {
    return HttpResponse.json([]);
  }),

  http.get("/api/concepts/:id", () => {
    return HttpResponse.json({
      id: "1",
      title: "Test Concept",
      description: "Test Description",
      content: "Test Content",
      creator: "Test Creator",
      source: "Test Source",
      year: "2024",
    });
  }),

  http.post("/api/concepts", () => {
    return HttpResponse.json({
      id: "1",
      title: "New Concept",
    }, { status: 201 });
  }),

  // Capsules
  http.get("/api/capsules", () => {
    return HttpResponse.json([]);
  }),

  // Links
  http.get("/api/links", () => {
    return HttpResponse.json([]);
  }),

  // Link names
  http.get("/api/link-names", () => {
    return HttpResponse.json(["references", "builds on"]);
  }),

  // Config
  http.get("/api/config/status", () => {
    return HttpResponse.json({
      styleGuide: { loaded: true, isEmpty: false },
      credo: { loaded: true, isEmpty: false },
      constraints: { loaded: true, isEmpty: false },
    });
  }),

  // AI settings
  http.get("/api/ai/settings", () => {
    return HttpResponse.json({
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      availableProviders: {
        openai: true,
        gemini: false,
      },
    });
  }),

  // Enrichment
  http.post("/api/enrichment/analyze", () => {
    return HttpResponse.json({
      suggestions: [],
      quickActions: [],
      initialMessage: "Test message",
    });
  }),
];
