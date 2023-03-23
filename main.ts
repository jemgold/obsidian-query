import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import { YoutubeLoader } from "./loaders/youtubeLoader";
import { OpenAI } from "langchain/llms";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { loadSummarizationChain } from "langchain/chains";
import { ArticleLoader } from "./loaders/articleLoader";

interface ObsidianSummarizerSettings {
	openAIApiKey: string;
}

const DEFAULT_SETTINGS: ObsidianSummarizerSettings = {
	openAIApiKey: "",
};

function extractYouTubeVideoId(url: string): string | null {
	const pattern =
		/^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
	const match = url.match(pattern);

	if (match) {
		return match[1];
	} else {
		return null;
	}
}

export default class ObsidianSummarizer extends Plugin {
	settings: ObsidianSummarizerSettings;

	async onload() {
		await this.loadSettings();

		const settings = this.settings;

		this.addCommand({
			id: "summarize-webpage",
			name: "Summarize webpage",

			async editorCallback(editor: Editor, view: MarkdownView) {
				const settingFilled = settings.openAIApiKey.trim() !== "";

				if (!settingFilled) {
					return new Notice("Please fill in your Open AI API Key");
				}

				const loader = new ArticleLoader(editor.getSelection().trim());

				const splitter = new RecursiveCharacterTextSplitter({
					chunkSize: 2000,
					chunkOverlap: 0,
				});

				const docs = await loader.loadAndSplit(splitter);

				console.log(docs);

				const llm = new OpenAI({
					temperature: 0,
					openAIApiKey: settings.openAIApiKey,
				});

				const chain = await loadSummarizationChain(llm, {
					type: "map_reduce",
				});

				const result = await chain.call({
					input_documents: docs,
				});

				const trimmedText = result.text.trim();

				console.log(trimmedText);

				const cursor = editor.getCursor();
				cursor.line++;
				cursor.ch = 0;

				editor.replaceRange(trimmedText, cursor);

				cursor.ch = trimmedText.length;
				editor.setCursor(cursor);
			},
		});

		this.addCommand({
			id: "summarize-youtube-video",
			name: "Summarize YouTube video",

			async editorCallback(editor: Editor, view: MarkdownView) {
				const settingFilled = settings.openAIApiKey.trim() !== "";

				if (!settingFilled) {
					return new Notice("Please fill in your Open AI API Key");
				}

				const videoId = extractYouTubeVideoId(editor.getSelection());

				if (!videoId) {
					return new Notice("Please select a YouTube video URL");
				}

				const loader = new YoutubeLoader(videoId, false, "en");
				let transcript;

				try {
					transcript = await loader.load();
				} catch (err) {
					return new Notice("Error loading video");
				}

				const llm = new OpenAI({
					temperature: 0,
					openAIApiKey: settings.openAIApiKey,
				});

				const chain = await loadSummarizationChain(llm, {
					type: "stuff",
				});

				const result = await chain.call({
					input_documents: transcript,
				});

				const trimmedText = result.text.trim();

				const cursor = editor.getCursor();
				cursor.line++;
				cursor.ch = 0;

				editor.replaceRange(trimmedText, cursor);

				cursor.ch = trimmedText.length;
				editor.setCursor(cursor);
			},
		});

		this.addSettingTab(new SummarizerSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		console.log("load settings");
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SummarizerSettingTab extends PluginSettingTab {
	plugin: ObsidianSummarizer;

	constructor(app: App, plugin: ObsidianSummarizer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Open AI API Key")
			.setDesc("For the magic")
			.addText((text) =>
				text
					.setPlaceholder("sk-1234")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
