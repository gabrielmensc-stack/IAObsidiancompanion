import { App, TFile, TFolder, Notice } from "obsidian";

export class ContextManager {
    constructor(private app: App) {}

    async getContext(type: 'file' | 'folder' | 'vault'): Promise<string> {
        const activeFile = this.app.workspace.getActiveFile();

        if (type === 'file') {
            if (!activeFile) {
                return "No active file selected.";
            }
            return await this.getFileContent(activeFile);
        }

        if (type === 'folder') {
            if (!activeFile) {
                // If no file active, maybe try root or just say no active folder
                return "No active file to determine folder context.";
            }
            const parent = activeFile.parent;
            if (!parent) return "File has no parent folder.";

            return await this.getFolderContent(parent);
        }

        if (type === 'vault') {
            return await this.getVaultContent();
        }

        return "";
    }

    private async getFileContent(file: TFile): Promise<string> {
        if (file.extension !== 'md') return ""; // Skip non-md files for now
        const content = await this.app.vault.read(file);
        return `\n--- START FILE: ${file.path} ---\n${content}\n--- END FILE: ${file.path} ---\n`;
    }

    private async getFolderContent(folder: TFolder): Promise<string> {
        let fullContent = "";
        for (const child of folder.children) {
            if (child instanceof TFile) {
                fullContent += await this.getFileContent(child);
            }
            // Recurse into subfolders
            if (child instanceof TFolder) {
                fullContent += await this.getFolderContent(child);
            }
        }
        return fullContent;
    }

    private async getVaultContent(): Promise<string> {
        const files = this.app.vault.getFiles();
        let fullContent = "";

        // LIMITATION: Reading entire vault can be huge.
        // For MVP, let's limit to maybe 50 files
        const MAX_FILES = 50;

        for (let i = 0; i < Math.min(files.length, MAX_FILES); i++) {
            fullContent += await this.getFileContent(files[i]);
        }

        if (files.length > MAX_FILES) {
            fullContent += `\n... (Truncated. ${files.length - MAX_FILES} more files in vault) ...\n`;
        }

        return fullContent;
    }
}
