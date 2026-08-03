import { describe, expect, it } from "vitest"

import { parseSessionSnapshot } from "@/features/session"

describe("session validation", () => {
  it("accepts a versioned full-draft snapshot and supplies missing editor state", () => {
    const result = parseSessionSnapshot({
      version: 1,
      activeTabId: "draft",
      recentFiles: [],
      tabs: [{
        id: "draft",
        title: "Untitled",
        filePath: null,
        pathKey: null,
        content: "changed",
        lastSavedContent: "",
        mode: "source",
      }],
    })

    expect(result?.tabs[0]).toMatchObject({
      id: "draft",
      content: "changed",
      lastSavedContent: "",
      editorState: { source: { scrollTop: 0 } },
    })
  })

  it("rejects unknown schema versions", () => {
    expect(parseSessionSnapshot({ version: 2, tabs: [] })).toBeNull()
  })
})
