import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const tauriRoot = join(projectRoot, "src-tauri")
const launcherRoot = join(tauriRoot, "launcher")
const args = ["build", "--release"]
const rawTarget = (
  process.env.CARGO_BUILD_TARGET
  || process.env.TAURI_ENV_TARGET_TRIPLE
  || ""
).trim()
const target = rawTarget.length > 0 ? rawTarget : undefined
const platform = process.env.TAURI_ENV_PLATFORM
  ?? (process.platform === "darwin" ? "macos" : process.platform)
if (target) args.push("--target", target)

const childEnv = { ...process.env }
if (!target) {
  delete childEnv.CARGO_BUILD_TARGET
}

const build = spawnSync("cargo", args, {
  cwd: launcherRoot,
  env: childEnv,
  stdio: "inherit",
})
if (build.status !== 0) process.exit(build.status ?? 1)

const windows = platform === "windows" || platform === "win32"
const executableName = windows ? "emditor.exe" : "emditor"
const workspaceOutputDirectory = target
  ? join(tauriRoot, "target", target, "release")
  : join(tauriRoot, "target", "release")
const packageOutputDirectory = target
  ? join(launcherRoot, "target", target, "release")
  : join(launcherRoot, "target", "release")
const workspaceSource = join(workspaceOutputDirectory, executableName)
const source = existsSync(workspaceSource)
  ? workspaceSource
  : join(packageOutputDirectory, executableName)
const staging = join(tauriRoot, "binaries")
mkdirSync(staging, { recursive: true })

for (const name of windows
  ? ["emditor.exe", "emd.exe"]
  : ["emditor", "emd"]) {
  const destination = join(staging, name)
  copyFileSync(source, destination)
  if (!windows) chmodSync(destination, 0o755)
}
