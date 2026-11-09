"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

type ListPlacement = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

function matches(option: StaffComboOption, needle: string) {
  if (!needle) return true;
  const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function measurePlacement(input: HTMLElement): ListPlacement {
  const rect = input.getBoundingClientRect();
  const gap = 4;
  const preferred = 16 * 16;
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - 8);
  const spaceAbove = Math.max(0, rect.top - gap - 8);
  const openUp =
    spaceBelow < Math.min(preferred, 12 * 16) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    8 * 16,
    Math.min(preferred, openUp ? spaceAbove : spaceBelow),
  );

  if (openUp) {
    return {
      left: rect.left,
      width: rect.width,
      maxHeight,
      bottom: window.innerHeight - rect.top + gap,
    };
  }

  return {
    left: rect.left,
    width: rect.width,
    maxHeight,
    top: rect.bottom + gap,
  };
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
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = options.find((option) => option.value === defaultValue) ?? null;
  const [query, setQuery] = useState(initial?.label ?? "");
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<ListPlacement | null>(null);
  const [mounted, setMounted] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => matches(option, needle)).slice(0, maxOptions);
  }, [options, query, maxOptions]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) {
      setPlacement(null);
      return;
    }

    function sync() {
      if (!inputRef.current) return;
      setPlacement(measurePlacement(inputRef.current));
    }

    sync();
    window.addEventListener("resize", sync);
    document.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      document.removeEventListener("scroll", sync, true);
    };
  }, [open, filtered.length, query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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
    // Don't refocus immediately when clearing — focus would reopen an empty list
    // and make the pick look like it failed. Keep focus when the label stays.
    if (!clearOnSelect) {
      inputRef.current?.focus();
    }
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

  const activeOptionId =
    open && filtered[active] ? `${listId}-opt-${filtered[active]!.value}` : undefined;

  const list =
    open && mounted && placement ? (
      <ul
        className="staff-combo__list staff-combo__list--portal"
        id={listId}
        ref={listRef}
        role="listbox"
        style={{
          left: placement.left,
          width: placement.width,
          maxHeight: placement.maxHeight,
          top: placement.top,
          bottom: placement.bottom,
        }}
      >
        {emptyLabel && !query.trim() ? (
          <li
            aria-selected={false}
            className="staff-combo__option"
            id={`${listId}-opt-empty`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(null)}
            role="option"
          >
            {emptyLabel}
          </li>
        ) : null}
        {filtered.length ? (
          filtered.map((option, index) => (
            <li
              aria-selected={index === active}
              className={[
                "staff-combo__option",
                index === active ? "staff-combo__option--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              id={`${listId}-opt-${option.value}`}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              role="option"
            >
              {option.label}
            </li>
          ))
        ) : (
          <li className="staff-combo__empty" role="status">
            No matches
          </li>
        )}
      </ul>
    ) : null;

  return (
    <div className="staff-combo" ref={rootRef}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      {persistValue && name ? (
        <input name={name} required={required} type="hidden" value={value} />
      ) : null}
      <input
        aria-activedescendant={activeOptionId}
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
      {list ? createPortal(list, document.body) : null}
    </div>
  );
}
