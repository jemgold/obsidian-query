import type { Document } from "langchain/document";
import { BaseDocumentLoader } from "langchain/document_loaders";
import { YoutubeTranscript } from "youtube-transcript";

export interface Metadata {
	source: string;
	title?: string;
	description?: string;
	view_count?: number;
	thumbnail_url?: string;
	publish_date?: Date;
	length?: number;
	author?: string;
}

export class YoutubeLoader extends BaseDocumentLoader {
	constructor(
		public videoId: string,
		public addVideoInfo: boolean = false,
		public language: string = "en"
	) {
		super();
	}

	public async load(): Promise<Document[]> {
		let metadata: Metadata = {
			source: this.videoId,
		};

		if (this.addVideoInfo) {
			const videoInfo = await this.getVideoInfo();
			metadata = { ...metadata, ...videoInfo };
		}

		let transcript;

		try {
			transcript = await YoutubeTranscript.fetchTranscript(this.videoId, {
				lang: this.language,
			});
		} catch (error) {
			console.log(error);

			throw error;
		}

		const combined = transcript.map((item) => item.text.trim()).join(" ");

		return [
			{
				pageContent: combined,
				metadata: metadata,
			},
		];
	}

	public async getVideoInfo(): Promise<Metadata> {
		return Promise.resolve({} as Metadata);
		// return new Promise((resolve, reject) => {
		// 	videoInfo.retrieve(this.videoId, (err, info) => {
		// 		if (err) {
		// 			reject(err);
		// 		} else {
		// 			resolve(info);
		// 		}
		// 	});
		// });
	}
}
