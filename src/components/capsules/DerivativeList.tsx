"use client";

import type { RepurposedContent } from "~/types/database";
import { DerivativeItem } from "./DerivativeItem";

interface DerivativeListProps {
  derivatives: RepurposedContent[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function DerivativeList({
  derivatives,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: DerivativeListProps) {
  // Group derivatives by type
  const groupedByType = Array.isArray(derivatives) ? derivatives.reduce(
    (acc: Record<string, RepurposedContent[]>, item: RepurposedContent) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type]!.push(item);
      return acc;
    },
    {} as Record<string, RepurposedContent[]>,
  ) : {};

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      social_post: "Social Posts",
      email: "Email",
      lead_magnet: "Lead Magnet",
      pinterest_pin: "Pinterest Pins",
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  const getRowsForType = (type: string): number => {
    const rows: Record<string, number> = {
      social_post: 4,
      email: 8,
      lead_magnet: 6,
      pinterest_pin: 4,
    };
    return rows[type] || 4;
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedByType).map(([type, items]) => (
        <div key={type}>
          <h5 className="text-sm font-semibold text-gray-900 mb-2">
            {getTypeLabel(type)} {type === "social_post" || type === "pinterest_pin" ? `(${items.length})` : ""}
          </h5>
          <div className="space-y-2">
            {Array.isArray(items) && items.map((item) => (
              <DerivativeItem
                key={item.id}
                item={item}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                rows={getRowsForType(type)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

