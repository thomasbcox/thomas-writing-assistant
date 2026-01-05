/**
 * Manual mock for openai SDK
 * Centralized mock factory for OpenAI provider tests
 */

import { jest } from "@jest/globals";

// Mock methods that can be controlled in tests
export const mockChatCompletionsCreate = jest.fn() as jest.MockedFunction<any>;
export const mockEmbeddingsCreate = jest.fn() as jest.MockedFunction<any>;

const OpenAI = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockChatCompletionsCreate,
    },
  },
  embeddings: {
    create: mockEmbeddingsCreate,
  },
}));

export default OpenAI;

// Helper to reset mocks between tests
export const _resetMocks = () => {
  mockChatCompletionsCreate.mockReset();
  mockEmbeddingsCreate.mockReset();
};

// Helper to set default successful responses
export const _setDefaultSuccess = (content: string = "Mock response") => {
  mockChatCompletionsCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  } as any);
  mockEmbeddingsCreate.mockResolvedValue({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  } as any);
};

