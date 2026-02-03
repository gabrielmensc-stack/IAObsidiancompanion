import { App, TFile, TFolder, Notice } from "obsidian";

export class ToolExecutor {
    constructor(private app: App) {}

    async execute(toolName: string, params: any): Promise<string> {
        console.log(`Executing tool: ${toolName} with params:`, params);

        try {
            switch (toolName) {
                case 'create_note':
                    return await this.createNote(params.path, params.content);
                case 'update_note':
                    return await this.updateNote(params.path, params.content, params.mode);
                case 'list_files':
                    return await this.listFiles(params.path);
                default:
                    return `Error: Tool '${toolName}' not found.`;
            }
        } catch (error) {
            console.error(`Tool execution error:`, error);
            return `Error executing '${toolName}': ${error.message}`;
        }
    }

    private async createNote(path: string, content: string): Promise<string> {
        // Ensure path ends in .md
        if (!path.endsWith('.md')) path += '.md';

        // check if exists
        const exists = this.app.vault.getAbstractFileByPath(path);
        if (exists) {
            return `Error: File '${path}' already exists. Use update_note instead.`;
        }

        // Ensure folders exist
        await this.ensureFolders(path);

        await this.app.vault.create(path, content);
        new Notice(`Created note: ${path}`);
        return `Successfully created note: ${path}`;
    }

    private async updateNote(path: string, content: string, mode: 'append' | 'replace'): Promise<string> {
         if (!path.endsWith('.md')) path += '.md';

         const file = this.app.vault.getAbstractFileByPath(path);
         if (!file || !(file instanceof TFile)) {
             return `Error: File '${path}' not found.`;
         }

         if (mode === 'replace') {
             await this.app.vault.modify(file, content);
             new Notice(`Updated (replaced) note: ${path}`);
             return `Successfully replaced content of ${path}`;
         } else {
             // append
             const currentContent = await this.app.vault.read(file);
             await this.app.vault.modify(file, currentContent + "\n" + content);
             new Notice(`Updated (appended) note: ${path}`);
             return `Successfully appended to ${path}`;
         }
    }

    private async listFiles(path: string): Promise<string> {
        // path can be "" for root
        let folder: TFolder | null = null;

        if (!path || path === "/" || path === ".") {
             folder = this.app.vault.getRoot();
        } else {
            const abstract = this.app.vault.getAbstractFileByPath(path);
            if (abstract instanceof TFolder) {
                folder = abstract;
            }
        }

        if (!folder) {
            return `Error: Folder '${path}' not found.`;
        }

        const files = folder.children.map(child => {
            const type = child instanceof TFolder ? "Folder" : "File";
            return `- ${child.name} (${type})`;
        }).join("\n");

        return `Files in '${path || '/'}':\n${files}`;
    }

    private async ensureFolders(path: string) {
        // Check directory structure and create if needed
        const parts = path.split('/');
        if (parts.length <= 1) return;

        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath += (i > 0 ? "/" : "") + parts[i];
            const folder = this.app.vault.getAbstractFileByPath(currentPath);
            if (!folder) {
                await this.app.vault.createFolder(currentPath);
            }
        }
    }
}
