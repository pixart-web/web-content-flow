"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import styles from "./studio.module.css";

export type StudioCommand = {
  id: string;
  group: string;
  label: string;
  detail?: string;
  href: string;
};

// The universal command bar of the Studio prototype. Today it only navigates
// to real projects, modules and settings; free-form AI tasks are a later
// stage of the proposal and are not offered here.
export function CommandBar({ commands }: { commands: StudioCommand[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const titleId = useId();

  const results = useMemo(() => {
    const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return commands;
    return commands.filter((command) => {
      const text =
        `${command.label} ${command.detail ?? ""} ${command.group}`.toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }, [commands, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function run(command: StudioCommand | undefined) {
    if (!command) return;
    close();
    router.push(command.href);
  }

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === "Tab") {
      // The input is the only focusable element: keep focus in the dialog.
      event.preventDefault();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={styles.commandTrigger}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Search aria-hidden size={18} />
        <span>Search projects, modules and settings</span>
        <span aria-hidden className={styles.kbd}>
          ⌘K
        </span>
      </button>
      {open ? (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.palette}
            role="dialog"
          >
            <h2 className="sr-only" id={titleId}>
              Command bar
            </h2>
            <input
              aria-activedescendant={
                results[active] ? `${listId}-${results[active].id}` : undefined
              }
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded="true"
              aria-label="Search commands"
              className={styles.paletteInput}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              placeholder="Type a project, a module or a setting…"
              ref={inputRef}
              role="combobox"
              value={query}
            />
            <ul className={styles.paletteList} id={listId} role="listbox">
              {results.map((command, index) => {
                const heading =
                  results[index - 1]?.group !== command.group
                    ? command.group
                    : null;
                return (
                  <li key={command.id} role="presentation">
                    {heading ? (
                      <div aria-hidden className={styles.paletteGroup}>
                        {heading}
                      </div>
                    ) : null}
                    <div
                      aria-selected={index === active}
                      className={`${styles.paletteOption} ${index === active ? styles.paletteOptionActive : ""}`}
                      id={`${listId}-${command.id}`}
                      onClick={() => run(command)}
                      onMouseMove={() => setActive(index)}
                      role="option"
                    >
                      <span>{command.label}</span>
                      {command.detail ? (
                        <span className={styles.sectionMeta}>
                          {command.detail}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!results.length ? (
              <p className={styles.paletteFoot} role="status">
                Nothing matches “{query}”.
              </p>
            ) : (
              <p className={styles.paletteFoot}>
                ↑↓ to move · Enter to open · Esc to close. Asking the local AI
                for a task from here is a later stage.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
