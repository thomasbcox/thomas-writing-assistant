/**
 * Tests for BlogPostsTab component
 * Tests form rendering, concept selection, blog post generation, and display
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockConcepts = [
  { id: "c1", title: "Concept 1", description: "Description 1" },
  { id: "c2", title: "Concept 2", description: "Description 2" },
  { id: "c3", title: "Concept 3", description: null },
];

const mockGeneratedPost = {
  title: "Generated Blog Post Title",
  introduction: "This is the introduction.",
  body: "This is the body content.",
  conclusion: "This is the conclusion.",
  cta: "Call to action text",
  metadata: {
    estimatedWordCount: 1500,
    tone: "conversational",
    conceptsReferenced: ["c1", "c2"],
  },
};

const mockUseConceptList = jest.fn(() => ({
  data: mockConcepts,
  isLoading: false,
}));

const mockGenerateMutation = {
  mutateAsync: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockGeneratedPost),
  isLoading: false,
};

const mockUseGenerateBlogPost = jest.fn<() => typeof mockGenerateMutation>(() => mockGenerateMutation);

// Mock useIPC hooks - useIPCMutation is used by useGenerateBlogPost
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  useIPCMutation: jest.fn(() => mockGenerateMutation),
  api: {
    concept: {
      list: {
        useQuery: mockUseConceptList,
      },
    },
  },
}));

jest.unstable_mockModule("../../lib/api/concepts", () => ({
  useConceptList: mockUseConceptList,
}));

jest.unstable_mockModule("../../lib/api/blog-posts", () => ({
  useGenerateBlogPost: mockUseGenerateBlogPost,
}));

jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

jest.unstable_mockModule("../../components/ui/ContextualHelp", () => ({
  ContextualHelp: () => <div data-testid="contextual-help" />,
}));

jest.unstable_mockModule("../../components/ui/LoadingSpinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading</div>,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as any),
  },
});

describe("BlogPostsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConceptList.mockReturnValue({
      data: mockConcepts,
      isLoading: false,
    });
    mockGenerateMutation.isLoading = false;
    (mockGenerateMutation.mutateAsync as jest.MockedFunction<any>).mockResolvedValue(mockGeneratedPost);
  });

  it("should render form with all inputs", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      expect(screen.getByText("Generate Blog Post")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e.g., 'How to build effective writing habits'/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Leave empty to let AI generate a title/i)).toBeInTheDocument();
      expect(screen.getByText("Generate Blog Post")).toBeInTheDocument();
    });
  });

  it("should display concepts for selection", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      expect(screen.getByText("Concept 1")).toBeInTheDocument();
      expect(screen.getByText("Concept 2")).toBeInTheDocument();
      expect(screen.getByText("Concept 3")).toBeInTheDocument();
    });
  });

  it("should toggle concept selection when checkbox is clicked", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      const concept1Checkbox = checkboxes.find((cb) => 
        cb.closest("label")?.textContent?.includes("Concept 1")
      );
      expect(concept1Checkbox).toBeDefined();
      if (concept1Checkbox) {
        fireEvent.click(concept1Checkbox);
        expect(concept1Checkbox).toBeChecked();
      }
    });
  });

  it("should update topic when input changes", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      const topicInput = screen.getByPlaceholderText(/e.g., 'How to build effective writing habits'/i);
      fireEvent.change(topicInput, { target: { value: "Test Topic" } });
      expect(topicInput).toHaveValue("Test Topic");
    });
  });

  it("should update target length when radio button is selected", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    const longRadio = await screen.findByLabelText(/long/i);
    fireEvent.click(longRadio);
    expect(longRadio).toBeChecked();
  });

  it("should update tone when select changes", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    // Find select by its options
    const toneSelect = await screen.findByRole("combobox");
    fireEvent.change(toneSelect, { target: { value: "authoritative" } });
    expect(toneSelect).toHaveValue("authoritative");
  });

  it("should show CTA input when includeCTA checkbox is checked", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    const ctaCheckbox = await screen.findByLabelText(/Include Call-to-Action/i);
    fireEvent.click(ctaCheckbox);
    expect(await screen.findByPlaceholderText(/Custom CTA text/i)).toBeInTheDocument();
  });

  it("should disable generate button when topic is empty", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    const generateButton = await screen.findByText("Generate Blog Post");
    expect(generateButton).toBeDisabled();
  });

  it("should disable generate button when no concepts are selected", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    const topicInput = await screen.findByPlaceholderText(/e.g., 'How to build effective writing habits'/i);
    fireEvent.change(topicInput, { target: { value: "Test Topic" } });
    const generateButton = await screen.findByText("Generate Blog Post");
    expect(generateButton).toBeDisabled();
  });

  it("should call generateMutation when form is submitted with valid data", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    // Fill in topic
    const topicInput = await screen.findByPlaceholderText(/e.g., 'How to build effective writing habits'/i);
    fireEvent.change(topicInput, { target: { value: "Test Topic" } });

    // Select a concept
    const checkboxes = await screen.findAllByRole("checkbox");
    const concept1Checkbox = checkboxes.find((cb) => 
      cb.closest("label")?.textContent?.includes("Concept 1")
    );
    if (concept1Checkbox) {
      fireEvent.click(concept1Checkbox);
    }

    // Click generate
    const generateButton = await screen.findByText("Generate Blog Post");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockGenerateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "Test Topic",
          conceptIds: expect.arrayContaining(["c1"]),
        })
      );
    });
  });

  it("should display generated blog post after successful generation", async () => {
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    // Fill in topic
    const topicInput = await screen.findByPlaceholderText(/e.g., 'How to build effective writing habits'/i);
    fireEvent.change(topicInput, { target: { value: "Test Topic" } });

    // Select a concept
    const checkboxes = await screen.findAllByRole("checkbox");
    const concept1Checkbox = checkboxes.find((cb) => 
      cb.closest("label")?.textContent?.includes("Concept 1")
    );
    if (concept1Checkbox) {
      fireEvent.click(concept1Checkbox);
    }

    // Click generate
    const generateButton = await screen.findByText("Generate Blog Post");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Generated Blog Post Title")).toBeInTheDocument();
      expect(screen.getByText("This is the introduction.")).toBeInTheDocument();
      expect(screen.getByText("This is the body content.")).toBeInTheDocument();
      expect(screen.getByText("This is the conclusion.")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show loading state when generating", async () => {
    mockGenerateMutation.isLoading = true;
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });
  });

  it("should show empty state when no concepts are available", async () => {
    mockUseConceptList.mockReturnValue({
      data: [],
      isLoading: false,
    });
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      expect(screen.getByText(/No concepts available/i)).toBeInTheDocument();
    });
  });

  it("should show loading spinner when concepts are loading", async () => {
    mockUseConceptList.mockReturnValue({
      data: [] as typeof mockConcepts,
      isLoading: true,
    });
    const { BlogPostsTab } = await import("../../components/BlogPostsTab");
    render(<BlogPostsTab />);

    await waitFor(() => {
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });
});
