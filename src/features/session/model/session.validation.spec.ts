import { describe, expect, it } from "vitest"

import { parseSessionSnapshot } from "@/features/session"

describe("session validation", () => {
  it("accepts a slim snapshot and supplies missing editor state", () => {
    const result = parseSessionSnapshot({
      version: 1,
      activeTabId: "draft",
      recentFiles: [],
      tabs: [
        {
          id: "draft",
          title: "Untitled",
          filePath: null,
          pathKey: null,
          draftContent: "changed",
          mode: "source",
        },
        {
          id: "saved-file",
          title: "README.md",
          filePath: "/repo/README.md",
          pathKey: "/repo/readme.md",
          draftContent: null,
          mode: "editor",
        },
      ],
    })

    expect(result?.tabs).toHaveLength(2)
    expect(result?.tabs[0]).toMatchObject({
      id: "draft",
      draftContent: "changed",
      editorState: { source: { scrollTop: 0 } },
    })
    expect(result?.tabs[1]).toMatchObject({
      id: "saved-file",
      filePath: "/repo/README.md",
      draftContent: null,
    })
  })

  it("rejects mismatched filePath and pathKey or untitled tabs without draftContent", () => {
    expect(
      parseSessionSnapshot({
        version: 1,
        activeTabId: "bad",
        recentFiles: [],
        tabs: [{
          id: "bad",
          title: "Broken",
          filePath: "/docs/a.md",
          pathKey: null,
          draftContent: null,
          mode: "editor",
        }],
      }),
    ).toBeNull()

    expect(
      parseSessionSnapshot({
        version: 1,
        activeTabId: "bad-untitled",
        recentFiles: [],
        tabs: [{
          id: "bad-untitled",
          title: "Untitled",
          filePath: null,
          pathKey: null,
          draftContent: null,
          mode: "editor",
        }],
      }),
    ).toBeNull()
  })

  it("deduplicates tabs by id and pathKey", () => {
    const result = parseSessionSnapshot({
      version: 1,
      activeTabId: "first",
      recentFiles: [],
      tabs: [
        {
          id: "first",
          title: "notes.md",
          filePath: "/docs/notes.md",
          pathKey: "/docs/notes.md",
          draftContent: null,
          mode: "editor",
        },
        {
          id: "second",
          title: "notes.md",
          filePath: "/docs/notes.md",
          pathKey: "/docs/notes.md",
          draftContent: "duplicate pathKey",
          mode: "editor",
        },
      ],
    })

    expect(result?.tabs).toHaveLength(1)
    expect(result?.tabs[0]?.id).toBe("first")
  })

  it("rejects unknown schema versions", () => {
    expect(parseSessionSnapshot({ version: 2, tabs: [] })).toBeNull()
  })

  it("parses valid theme preferences and ignores invalid theme fields without rejecting the session", () => {
    const withValidTheme = parseSessionSnapshot({
      version: 1,
      activeTabId: null,
      recentFiles: [],
      tabs: [],
      theme: { mode: "dark", preset: "forest" },
    })
    expect(withValidTheme?.theme).toEqual({ mode: "dark", preset: "forest" })

    const withInvalidTheme = parseSessionSnapshot({
      version: 1,
      activeTabId: null,
      recentFiles: [],
      tabs: [],
      theme: { mode: "neon", preset: "unknown" },
    })
    expect(withInvalidTheme).not.toBeNull()
    expect(withInvalidTheme?.theme).toBeUndefined()
  })
})
