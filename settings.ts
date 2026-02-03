import { App, PluginSettingTab, Setting } from 'obsidian';
import NotebookAgentPlugin from './main';

export interface NotebookAgentSettings {
	openaiApiKey: string;
	anthropicApiKey: string;
	geminiApiKey: string;
	activeProvider: 'openai' | 'anthropic' | 'gemini';
	openaiModel: string;
    anthropicModel: string;
    geminiModel: string;
}

export const DEFAULT_SETTINGS: NotebookAgentSettings = {
	openaiApiKey: '',
	anthropicApiKey: '',
	geminiApiKey: '',
	activeProvider: 'openai',
	openaiModel: 'gpt-4o',
    anthropicModel: 'claude-3-5-sonnet-20240620',
    geminiModel: 'gemini-1.5-pro'
}

export class NotebookAgentSettingTab extends PluginSettingTab {
	plugin: NotebookAgentPlugin;

	constructor(app: App, plugin: NotebookAgentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Notebook Agent Settings'});

        new Setting(containerEl)
            .setName('Active Provider')
            .setDesc('Choose which AI provider to use.')
            .addDropdown(dropdown => dropdown
                .addOption('openai', 'OpenAI')
                .addOption('anthropic', 'Anthropic')
                .addOption('gemini', 'Google Gemini')
                .setValue(this.plugin.settings.activeProvider)
                .onChange(async (value) => {
                    this.plugin.settings.activeProvider = value as any;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show relevant model settings
                }));

        if (this.plugin.settings.activeProvider === 'openai') {
            new Setting(containerEl)
                .setName('OpenAI API Key')
                .setDesc('Enter your OpenAI API key.')
                .addText(text => text
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.openaiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiApiKey = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('OpenAI Model')
                .setDesc('Model to use (e.g. gpt-4o, gpt-3.5-turbo)')
                .addText(text => text
                    .setPlaceholder('gpt-4o')
                    .setValue(this.plugin.settings.openaiModel)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiModel = value;
                        await this.plugin.saveSettings();
                    }));
        }

        if (this.plugin.settings.activeProvider === 'anthropic') {
            new Setting(containerEl)
                .setName('Anthropic API Key')
                .setDesc('Enter your Anthropic API key.')
                .addText(text => text
                    .setPlaceholder('sk-ant-...')
                    .setValue(this.plugin.settings.anthropicApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicApiKey = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Anthropic Model')
                .setDesc('Model to use')
                .addText(text => text
                    .setValue(this.plugin.settings.anthropicModel)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicModel = value;
                        await this.plugin.saveSettings();
                    }));
        }

        if (this.plugin.settings.activeProvider === 'gemini') {
            new Setting(containerEl)
                .setName('Gemini API Key')
                .setDesc('Enter your Google Gemini API key.')
                .addText(text => text
                    .setPlaceholder('AIza...')
                    .setValue(this.plugin.settings.geminiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiApiKey = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Gemini Model')
                .setDesc('Model to use')
                .addText(text => text
                    .setValue(this.plugin.settings.geminiModel)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiModel = value;
                        await this.plugin.saveSettings();
                    }));
        }
	}
}
