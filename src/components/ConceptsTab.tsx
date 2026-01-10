"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "~/hooks/useIPC";
import { ConceptEditor } from "./ConceptEditor";
import { ConceptViewer } from "./ConceptViewer";
import { ConceptEnrichmentStudio } from "./enrichment/ConceptEnrichmentStudio";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { ContextualHelp } from "./ui/ContextualHelp";
import type { ConceptListItem } from "~/types/database";
import { ConceptCreateForm } from "./ConceptCreateForm";
import { ConceptList } from "./ConceptList";
import { ConceptActions } from "./ConceptActions";
import { ConfirmDialog } from "./ui/ConfirmDialog";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type SortField = "title" | "createdAt" | "updatedAt" | "linkCount" | "creator" | "source" | "year";
type SortOrder = "asc" | "desc";

interface Filters {
  linkCountRange: "all" | "0" | "1-5" | "5-10" | "10+";
  creator: string[];
  source: string[];
  year: string[];
  dateRange: { start: string; end: string } | null;
  zeroLinksOnly: boolean;
}

export function ConceptsTab() {
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    linkCountRange: "all",
    creator: [],
    source: [],
    year: [],
    dateRange: null,
    zeroLinksOnly: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCreateConceptForm, setShowCreateConceptForm] = useState<boolean>(false);

  // Clear all tab state
  const handleClear = () => {
    setSearch("");
    setShowTrash(false);
    setSortBy("createdAt");
    setSortOrder("desc");
    setShowFilters(false);
    setFilters({
      linkCountRange: "all",
      creator: [],
      source: [],
      year: [],
      dateRange: null,
      zeroLinksOnly: false,
    });
    setEditingId(null);
    setViewingId(null);
    setEnrichingId(null);
    setDeleteConfirm(null);
    setPurgeConfirm(false);
    setShowCreateConceptForm(false);
    addToast("Tab cleared", "success");
  };

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const {
    data: conceptsData,
    isLoading: conceptsLoading,
    error: conceptsError,
    refetch,
  } = api.concept.list.useQuery({
    includeTrash: showTrash,
    search: search || undefined,
  });

  const { data: linkCountsData } = api.link.getCountsByConcept.useQuery();

  // Create link counts map
  const linkCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (linkCountsData && Array.isArray(linkCountsData)) {
      linkCountsData.forEach((item) => {
        map.set(item.conceptId, item.count);
      });
    }
    return map;
  }, [linkCountsData]);

  const getLinkCount = (conceptId: string) => linkCountsMap.get(conceptId) ?? 0;

  // Get all unique values for filters
  const allConcepts = (conceptsData && Array.isArray(conceptsData)) ? conceptsData : [];
  const uniqueCreators = useMemo(() => {
    const creators = new Set<string>();
    allConcepts.forEach((c) => {
      if (c.creator) creators.add(c.creator);
    });
    return Array.from(creators).sort();
  }, [allConcepts]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    allConcepts.forEach((c) => {
      if (c.source) sources.add(c.source);
    });
    return Array.from(sources).sort();
  }, [allConcepts]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    allConcepts.forEach((c) => {
      if (c.year) years.add(c.year);
    });
    return Array.from(years).sort();
  }, [allConcepts]);

  // Filter and sort concepts
  const filteredAndSortedConcepts = useMemo(() => {
    let result = [...allConcepts];

    // Apply filters
    if (filters.zeroLinksOnly) {
      result = result.filter((c) => getLinkCount(c.id) === 0);
    }

    if (filters.linkCountRange !== "all") {
      result = result.filter((c) => {
        const count = getLinkCount(c.id);
        switch (filters.linkCountRange) {
          case "0":
            return count === 0;
          case "1-5":
            return count >= 1 && count <= 5;
          case "5-10":
            return count > 5 && count <= 10;
          case "10+":
            return count > 10;
          default:
            return true;
        }
      });
    }

    if (filters.creator.length > 0) {
      result = result.filter((c) => filters.creator.includes(c.creator));
    }

    if (filters.source.length > 0) {
      result = result.filter((c) => filters.source.includes(c.source));
    }

    if (filters.year.length > 0) {
      result = result.filter((c) => filters.year.includes(c.year));
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      result = result.filter((c) => {
        const created = new Date(c.createdAt);
        return created >= start && created <= end;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          aVal = new Date(a.updatedAt || a.createdAt).getTime();
          bVal = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case "linkCount":
          aVal = getLinkCount(a.id);
          bVal = getLinkCount(b.id);
          break;
        case "creator":
          aVal = a.creator.toLowerCase();
          bVal = b.creator.toLowerCase();
          break;
        case "source":
          aVal = a.source.toLowerCase();
          bVal = b.source.toLowerCase();
          break;
        case "year":
          aVal = a.year;
          bVal = b.year;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allConcepts, filters, sortBy, sortOrder, linkCountsMap]);

  const concepts = filteredAndSortedConcepts;

  const createMutation = api.concept.create.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Concept created successfully", "success");
      setShowCreateConceptForm(false);
    },
    onError: (error) => {
      addToast(error.message || "Failed to create concept", "error");
    },
  });

  const deleteMutation = api.concept.delete.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Concept deleted", "success");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete concept", "error");
      setDeleteConfirm(null);
    },
  });

  const restoreMutation = api.concept.restore.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Concept restored", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to restore concept", "error");
    },
  });

  const purgeMutation = api.concept.purgeTrash.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Trash purged successfully", "success");
      setPurgeConfirm(false);
    },
    onError: (error) => {
      addToast(error.message || "Failed to purge trash", "error");
      setPurgeConfirm(false);
    },
  });

  const { data: viewingConcept } = api.concept.getById.useQuery(
    { id: viewingId ?? "" },
    { enabled: !!viewingId },
  );

  const handleCreateConcept = (data: {
    title: string;
    description: string;
    content: string;
    creator: string;
    source: string;
    year: string;
  }) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex justify-end mb-2">
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          title="Clear all selections and forms"
        >
          Clear
        </button>
      </div>
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                Create New Concept
              </h2>
              <ContextualHelp
                title="Creating Concepts"
                content="Concepts are the building blocks of your knowledge base. Each concept represents a core idea, principle, or piece of knowledge. Include a clear title, description for searchability, and full content. Add metadata (creator, source, year) to track where ideas came from."
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateConceptForm(!showCreateConceptForm)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {showCreateConceptForm ? "Hide Form" : "Show Form"}
            </button>
          </div>
          {showCreateConceptForm && (
            <ConceptCreateForm
              onSubmit={handleCreateConcept}
              isPending={createMutation.isLoading}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Concepts</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search concepts (title, description, content)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 w-64"
                />
              </div>
              <ConceptActions
                showTrash={showTrash}
                onToggleTrash={setShowTrash}
                onPurgeTrash={() => purgeMutation.mutate({ daysOld: 30 })}
                purgeConfirm={purgeConfirm}
                onSetPurgeConfirm={setPurgeConfirm}
                isPurging={purgeMutation.isLoading}
              />
            </div>
          </div>

          {/* Sort and Filter Controls */}
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="title">Title</option>
                  <option value="createdAt">Date Created</option>
                  <option value="updatedAt">Date Modified</option>
                  <option value="linkCount">Link Count</option>
                  <option value="creator">Creator</option>
                  <option value="source">Source</option>
                  <option value="year">Year</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                {showFilters ? "Hide" : "Show"} Filters
              </button>
              {(filters.linkCountRange !== "all" ||
                filters.creator.length > 0 ||
                filters.source.length > 0 ||
                filters.year.length > 0 ||
                filters.dateRange !== null ||
                filters.zeroLinksOnly) && (
                <button
                  onClick={() =>
                    setFilters({
                      linkCountRange: "all",
                      creator: [],
                      source: [],
                      year: [],
                      dateRange: null,
                      zeroLinksOnly: false,
                    })
                  }
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Count
                    </label>
                    <select
                      value={filters.linkCountRange}
                      onChange={(e) =>
                        setFilters({ ...filters, linkCountRange: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">All</option>
                      <option value="0">0 links</option>
                      <option value="1-5">1-5 links</option>
                      <option value="5-10">5-10 links</option>
                      <option value="10+">10+ links</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Creator
                    </label>
                    <select
                      multiple
                      value={filters.creator}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setFilters({ ...filters, creator: selected });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      size={4}
                    >
                      {uniqueCreators.map((creator) => (
                        <option key={creator} value={creator}>
                          {creator}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <select
                      multiple
                      value={filters.source}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setFilters({ ...filters, source: selected });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      size={4}
                    >
                      {uniqueSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <select
                      multiple
                      value={filters.year}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setFilters({ ...filters, year: selected });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      size={4}
                    >
                      {uniqueYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range (Created)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.dateRange?.start || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            dateRange: {
                              start: e.target.value,
                              end: filters.dateRange?.end || "",
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="date"
                        value={filters.dateRange?.end || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            dateRange: {
                              start: filters.dateRange?.start || "",
                              end: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="zero-links-only"
                      checked={filters.zeroLinksOnly}
                      onChange={(e) =>
                        setFilters({ ...filters, zeroLinksOnly: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="zero-links-only"
                      className="ml-2 text-sm font-medium text-gray-700"
                    >
                      Show only concepts with zero links
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ConceptList
            concepts={concepts}
            isLoading={conceptsLoading}
            error={conceptsError ? new Error(conceptsError.message) : null}
            showTrash={showTrash}
            linkCounts={linkCountsMap}
            onView={(id) => setViewingId(id)}
            onEdit={(id) => setEditingId(id)}
            onEnrich={(id) => setEnrichingId(id)}
            onDelete={(id) => setDeleteConfirm(id)}
            onRestore={(id) => restoreMutation.mutate({ id })}
          />
        </div>

        {editingId && (
          <ConceptEditor
            conceptId={editingId}
            onClose={() => setEditingId(null)}
            onSave={() => {
              refetch();
              setEditingId(null);
            }}
          />
        )}

        {viewingId && viewingConcept && typeof viewingConcept === "object" && "id" in viewingConcept && (
          <ConceptViewer
            concept={viewingConcept as ConceptListItem}
            onClose={() => setViewingId(null)}
          />
        )}

        {enrichingId && (
          <ConceptEnrichmentStudio
            conceptId={enrichingId}
            onClose={() => setEnrichingId(null)}
            onSave={() => {
              refetch();
              setEnrichingId(null);
              addToast("Concept enriched and saved successfully", "success");
            }}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirm !== null}
          title="Delete Concept"
          message="Are you sure you want to delete this concept? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            if (deleteConfirm) {
              deleteMutation.mutate({ id: deleteConfirm });
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />

        <ConfirmDialog
          isOpen={purgeConfirm}
          title="Purge Trash"
          message="Are you sure you want to permanently delete all concepts in trash older than 30 days? This action cannot be undone."
          confirmText="Purge"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            purgeMutation.mutate({ daysOld: 30 });
          }}
          onCancel={() => setPurgeConfirm(false)}
        />
      </div>
    </>
  );
}
