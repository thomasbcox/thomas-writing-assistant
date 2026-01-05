/**
 * Manual mock for @google/generative-ai SDK
 * Centralized mock factory for Gemini provider tests
 */

import { jest } from "@jest/globals";

// Mock methods that can be controlled in tests
export const mockGenerateContent = jest.fn() as jest.MockedFunction<any>;
export const mockEmbedContent = jest.fn() as jest.MockedFunction<any>;
export const mockGetGenerativeModel = jest.fn() as jest.MockedFunction<any>;

// Mock response structure matching real SDK
const createMockResponse = (text: string) => ({
  response: {
    text: jest.fn(() => text),
  },
});

const createMockModel = () => ({
  generateContent: mockGenerateContent,
  embedContent: mockEmbedContent,
});

mockGetGenerativeModel.mockReturnValue(createMockModel());

export const GoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

// Helper to reset mocks between tests
export const _resetMocks = () => {
  mockGenerateContent.mockReset();
  mockEmbedContent.mockReset();
  mockGetGenerativeModel.mockReset();
  mockGetGenerativeModel.mockReturnValue(createMockModel());
};

// Helper to set default successful responses
export const _setDefaultSuccess = (text: string = "Mock response") => {
  mockGenerateContent.mockResolvedValue(createMockResponse(text) as any);
};

