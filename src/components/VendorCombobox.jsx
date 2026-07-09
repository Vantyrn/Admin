"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Searchable vendor picker. Renders a hidden <input name={name}> holding the
 * selected vendor id so it still works inside a native <form> (FormData).
 * Dependency-free (no cmdk/popover needed).
 */
export default function VendorCombobox({
  name,
  vendors = [],
  value,
  onChange,
  placeholder = "Select vendor",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = vendors.find((v) => v.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? vendors.filter((v) => (v.businessName || "").toLowerCase().includes(q))
    : vendors;

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value || ""} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 sm:h-12 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 text-sm font-bold outline-none focus:border-swiggy-orange transition-colors"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground font-medium")}>
          {selected ? selected.businessName : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendors..."
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs font-medium text-zinc-400">No vendors found.</p>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold hover:bg-zinc-50 transition-colors"
                >
                  <span className="truncate">{v.businessName}</span>
                  {v.id === value && <Check className="w-4 h-4 text-swiggy-orange shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
