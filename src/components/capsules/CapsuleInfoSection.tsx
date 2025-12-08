"use client";

import { useState } from "react";

export function CapsuleInfoSection() {
  const [showInfo, setShowInfo] = useState<boolean>(false);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Capsule Content Method</h2>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showInfo ? "Hide Info" : "Show Info"}
        </button>
      </div>
      {showInfo && (
        <div className="mt-4 space-y-4 text-sm text-gray-700 border-t pt-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About the Capsule Method</h3>
            <p className="mb-3">
              This system follows Jana Osofsky's high-leverage content strategy. Each capsule represents a core topic that maps to one of your main offers. From each capsule, you create anchor posts (evergreen, conversion-ready blog posts) that are then repurposed into multiple derivative formats.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Capsule Structure</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>4-6 capsules</strong> total (12-20 over time) mapping to main offers</li>
              <li>Each capsule has a <strong>Title/Topic</strong>, <strong>Promise</strong> (value delivered), and <strong>CTA</strong> (call-to-action)</li>
              <li>Each capsule contains <strong>anchor posts</strong> (evergreen blog posts)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Anchor Posts</h4>
            <p className="mb-2">Anchor posts are comprehensive, conversion-ready blog posts that include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Title</strong> - Clear, compelling headline</li>
              <li><strong>Content</strong> - Full blog post content</li>
              <li><strong>Pain Points</strong> - Problems your audience faces</li>
              <li><strong>Solution Steps</strong> - How your solution addresses those problems</li>
              <li><strong>Proof</strong> - Evidence, testimonials, or case studies (optional)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Derivative Content Rules</h4>
            <p className="mb-2">Each anchor post is automatically repurposed into:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>5-10 Social Posts</strong> - Concise, engaging, platform-agnostic content</li>
              <li><strong>1 Email</strong> - Pain → Promise → CTA structure</li>
              <li><strong>1 Lead Magnet</strong> - Downloadable resource description</li>
              <li><strong>2-3 Pinterest Pins</strong> - Descriptions optimized for Pinterest</li>
            </ul>
            <p className="mt-3 text-xs text-gray-600 italic">
              Each derivative shows the guidance/rule used to generate it. This metadata is read-only and helps you understand why each piece of content was created.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Best Practices</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create anchor posts from your best-performing or most comprehensive content</li>
              <li>Review and refine derivatives to match your voice and style</li>
              <li>Use the rotation system to resurface and republish content systematically</li>
              <li>Each derivative can be edited individually while preserving the original guidance metadata</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

