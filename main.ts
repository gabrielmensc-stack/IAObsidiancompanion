import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import { NotebookAgentSettings, DEFAULT_SETTINGS, NotebookAgentSettingTab } from './settings';
import { NotebookAgentView, VIEW_TYPE_NOTEBOOK } from './view';

export default class NotebookAgentPlugin extends Plugin {
	settings: NotebookAgentSettings;

	async onload() {
		console.log('Loading Notebook Agent Plugin');

		await this.loadSettings();

        this.registerView(
            VIEW_TYPE_NOTEBOOK,
            (leaf) => new NotebookAgentView(leaf, this)
        );

        this.addRibbonIcon('bot', 'Open Notebook Agent', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-notebook-agent',
            name: 'Open Notebook Agent Chat',
            callback: () => {
                this.activateView();
            }
        });

		this.addSettingTab(new NotebookAgentSettingTab(this.app, this));
	}

	async onunload() {
		console.log('Unloading Notebook Agent Plugin');
	}

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOK);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                 await leaf.setViewState({ type: VIEW_TYPE_NOTEBOOK, active: true });
            }
        }

        if (leaf) {
             workspace.revealLeaf(leaf);
        }
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
