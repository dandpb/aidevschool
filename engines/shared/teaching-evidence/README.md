# @aidevschool/evidence

Public TypeScript package for teaching-game evidence envelopes, validation and dual-channel
emission. Pixel and Voxel link this package from their engine-local pnpm workspaces; the repository
root remains package-manager agnostic.

Use the package name `@aidevschool/evidence`. Engine-local adapters may add
typed metrics or review context, but they must not reimplement envelope
validation, browser-global publication, or the `EVIDENCE <json>` console channel.
