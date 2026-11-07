"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type StaffComboOption = {
  value: string;
  label: string;
  keywords?: string;
};

type StaffComboProps = {
  id?: string;
  name?: string;
  label?: string;
  options: StaffComboOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Keep the chosen value in a hidden input (forms). Default true. */
  persistValue?: boolean;
  /** Clear the visible field after choosing. Default true. */
  clearOnSelect?: boolean;
  defaultValue?: string;
  emptyLabel?: string;
  maxOptions?: number;
  onSelect?: (option: StaffComboOption | null) => void;
};

function matches(option: StaffComboOption, needle: string) {
  if (!needle) return true;
  const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

export function StaffCombo({
  id,
  name,
  label,
  options,
  placeholder = "Type to search",
  required = false,
  disabled = false,
  persistValue = true,
  clearOnSelect = true,
  defaultValue = "",
  emptyLabel,
  maxOptions = 12,
  onSelect,
}: StaffComboProps) {
  const listId = useId();
  const inputId = id ?? listId;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = options.find((option) => option.value === defaultValue) ?? null;
  const [query, setQuery] = useState(initial?.label ?? "");
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => matches(option, needle)).slice(0, maxOptions);
  }, [options, query, maxOptions]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function choose(option: StaffComboOption | null) {
    if (option) {
      setValue(option.value);
      onSelect?.(option);
      if (clearOnSelect) {
        setQuery("");
        if (!persistValue) setValue("");
      } else {
        setQuery(option.label);
      }
    } else {
      setValue("");
      setQuery("");
      onSelect?.(null);
    }
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      const pick =
        open && filtered[active]
          ? filtered[active]
          : filtered.length === 1
            ? filtered[0]
            : null;
      if (pick) {
        event.preventDefault();
        choose(pick);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="staff-combo" ref={rootRef}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      {persistValue && name ? (
        <input name={name} required={required} type="hidden" value={value} />
      ) : null}
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (persistValue && !clearOnSelect) {
            setValue("");
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        type="search"
        value={query}
      />
      {open ? (
        <ul className="staff-combo__list" id={listId} role="listbox">
          {emptyLabel && !query.trim() ? (
            <li>
              <button
                className="staff-combo__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(null)}
                type="button"
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {filtered.length ? (
            filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  aria-selected={index === active}
                  className={[
                    "staff-combo__option",
                    index === active ? "staff-combo__option--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  type="button"
                >
                  {option.label}
                </button>
              </li>
            ))
          ) : (
            <li className="staff-combo__empty">No matches</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
