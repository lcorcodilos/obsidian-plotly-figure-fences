import type { App, TFile } from "obsidian";

/**
 * Thin boundary around the Obsidian API: resolving a figure's basename to a
 * vault file, and reading it. `figure` is a basename (§2), resolved against
 * the whole vault the same way Obsidian resolves wikilinks ("shortest path
 * when possible"), so the same reference works from notes in any folder.
 */
export function findFigureFile(app: App, basename: string, sourcePath: string): TFile | null {
	return app.metadataCache.getFirstLinkpathDest(basename, sourcePath);
}

export function readFigureFile(app: App, file: TFile): Promise<string> {
	return app.vault.cachedRead(file);
}
