"use client";

import { useState, useCallback } from "react";
import { api } from "~/hooks/useIPC";
import { ToastContainer, useToast } from "./ui/Toast";

interface CreateOfferFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

function CreateOfferForm({ onSuccess, onError }: CreateOfferFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const createMutation = api.offer.create.useMutation({
    onSuccess: () => {
      onSuccess();
      setName("");
      setDescription("");
      setIsOpen(false);
    },
    onError: (error) => {
      onError(error.message || "Failed to create offer");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      onError("Offer name is required");
      return;
    }
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        + New Offer
      </button>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Offer Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Premium Coaching Package"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this offer..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={createMutation.isLoading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {createMutation.isLoading ? "Creating..." : "Create Offer"}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface OfferCardProps {
  offer: {
    id: string;
    name: string;
    description: string | null;
    capsuleCount: number;
    capsules?: Array<{ id: string; title: string }>;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onManageCapsules: (id: string) => void;
}

function OfferCard({ offer, onEdit, onDelete, onManageCapsules }: OfferCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Validation indicator: 4-6 capsules is recommended
  const capsuleStatus = 
    offer.capsuleCount === 0 ? "empty" :
    offer.capsuleCount < 4 ? "low" :
    offer.capsuleCount <= 6 ? "optimal" : "high";

  const statusColors = {
    empty: "bg-gray-100 text-gray-600",
    low: "bg-yellow-100 text-yellow-700",
    optimal: "bg-green-100 text-green-700",
    high: "bg-orange-100 text-orange-700",
  };

  const statusText = {
    empty: "No capsules",
    low: `${offer.capsuleCount} capsule${offer.capsuleCount !== 1 ? 's' : ''} (add more)`,
    optimal: `${offer.capsuleCount} capsules ✓`,
    high: `${offer.capsuleCount} capsules (consider reducing)`,
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{offer.name}</h3>
          {offer.description && (
            <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
          )}
          <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${statusColors[capsuleStatus]}`}>
            {statusText[capsuleStatus]}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onManageCapsules(offer.id)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Capsules
          </button>
          <button
            onClick={() => onEdit(offer.id)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      
      {offer.capsules && offer.capsules.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? "▼ Hide capsules" : "▶ Show capsules"}
          </button>
          {isExpanded && (
            <ul className="mt-2 space-y-1">
              {offer.capsules.map((capsule) => (
                <li key={capsule.id} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                  {capsule.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function OfferManager() {
  const { toasts, addToast, removeToast } = useToast();
  const { data: offersData, refetch } = api.offer.list.useQuery();
  const { data: unassignedCapsulesData, refetch: refetchUnassigned } = api.offer.getUnassignedCapsules.useQuery();
  const offers = (offersData && Array.isArray(offersData)) ? offersData : undefined;
  const unassignedCapsules = (unassignedCapsulesData && Array.isArray(unassignedCapsulesData)) ? unassignedCapsulesData : undefined;
  
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [managingCapsules, setManagingCapsules] = useState<string | null>(null);

  const deleteMutation = api.offer.delete.useMutation({
    onSuccess: (result) => {
      addToast(`Offer deleted. ${result.unassignedCapsules} capsule(s) unassigned.`, "success");
      refetch();
      refetchUnassigned();
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete offer", "error");
    },
  });

  const assignMutation = api.offer.assignCapsule.useMutation({
    onSuccess: () => {
      addToast("Capsule assigned successfully", "success");
      refetch();
      refetchUnassigned();
    },
    onError: (error) => {
      addToast(error.message || "Failed to assign capsule", "error");
    },
  });

  const handleDelete = useCallback((id: string) => {
    if (confirm("Delete this offer? Assigned capsules will be unassigned.")) {
      deleteMutation.mutate({ id });
    }
  }, [deleteMutation]);

  const handleAssignCapsule = useCallback((capsuleId: string, offerId: string | null) => {
    assignMutation.mutate({ capsuleId, offerId });
  }, [assignMutation]);

  const managingOffer = offers?.find(o => o.id === managingCapsules);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Offer Manager</h2>
              <p className="text-sm text-gray-500 mt-1">
                Organize capsules into offers (recommended: 4-6 capsules per offer)
              </p>
            </div>
          </div>
          <CreateOfferForm 
            onSuccess={() => {
              addToast("Offer created successfully", "success");
              refetch();
            }}
            onError={(msg) => addToast(msg, "error")}
          />
        </div>

        {/* Capsule Assignment Modal */}
        {managingCapsules && managingOffer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Manage Capsules for: {managingOffer.name}
              </h3>
              
              {/* Currently assigned capsules */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Assigned Capsules ({managingOffer.capsules?.length || 0})
                </h4>
                {managingOffer.capsules?.length ? (
                  <ul className="space-y-2">
                    {managingOffer.capsules.map((c: any) => (
                      <li key={c.id} className="flex items-center justify-between bg-green-50 p-2 rounded">
                        <span className="text-sm">{c.title}</span>
                        <button
                          onClick={() => handleAssignCapsule(c.id, null)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No capsules assigned yet.</p>
                )}
              </div>

              {/* Unassigned capsules */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Available Capsules ({unassignedCapsules?.length || 0})
                </h4>
                {unassignedCapsules?.length ? (
                  <ul className="space-y-2">
                    {unassignedCapsules.map((c: any) => (
                      <li key={c.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{c.title}</span>
                        <button
                          onClick={() => handleAssignCapsule(c.id, managingCapsules)}
                          className="text-xs text-emerald-600 hover:text-emerald-800"
                        >
                          + Add
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">All capsules are assigned.</p>
                )}
              </div>

              <button
                onClick={() => setManagingCapsules(null)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Offers List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Your Offers ({offers?.length || 0})</h3>
          {offers && offers.length > 0 ? (
            <div className="space-y-4">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onEdit={setEditingOfferId}
                  onDelete={handleDelete}
                  onManageCapsules={setManagingCapsules}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No offers yet. Create one to get started.</p>
          )}
        </div>

        {/* Unassigned Capsules */}
        {unassignedCapsules && unassignedCapsules.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Unassigned Capsules ({unassignedCapsules.length})
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              These capsules are not associated with any offer yet.
            </p>
            <ul className="space-y-2">
              {unassignedCapsules.map((capsule: any) => (
                <li key={capsule.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <span>{capsule.title}</span>
                  <span className="text-xs text-gray-400">Unassigned</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

