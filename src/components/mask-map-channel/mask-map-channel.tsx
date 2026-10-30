import { Component, Event, EventEmitter, h, Prop, State } from '@stencil/core';

@Component({
	tag: 'mask-map-channel',
	styleUrl: 'mask-map-channel.css',
	shadow: true
})
export class MaskMapChannel {
	@Prop() label!: string;
	@Prop() letter!: string;
	@Prop() enabled!: boolean;
	@Prop() hasImage!: boolean;
	@Prop() image!: HTMLImageElement | null;
	@State() loading = false;

	@Event() channelToggle!: EventEmitter<void>;
	@Event() imageChange!: EventEmitter<HTMLImageElement>;
	@Event() imageRemove!: EventEmitter<void>;
	@Event() imageError!: EventEmitter<string>;

	fileInput!: HTMLInputElement;

	async handleUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files && input.files[0];

		if (!file) {
			return;
		}

		this.loading = true;

		try {
			const image = await this.loadImage(file);
			this.imageChange.emit(image);
		} catch (error) {
			this.imageError.emit(error instanceof Error ? error.message : 'Unable to load this image.');
			input.value = '';
		} finally {
			this.loading = false;
		}
	}

	loadImage(file: File): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onerror = () => reject(new Error('Unable to read the selected image.'));
			reader.onload = () => {
				if (typeof reader.result !== 'string') {
					reject(new Error('The selected file could not be read as an image.'));
					return;
				}

				const image = new Image();
				image.onerror = () => reject(new Error('The selected file is not a supported image.'));
				image.onload = () => resolve(image);
				image.src = reader.result;
			};
			reader.readAsDataURL(file);
		});
	}

	removeImage() {
		this.fileInput.value = '';
		this.imageRemove.emit();
	}

	render() {
		return (
			<section class="channel">
				<div class="channel-heading">
					<label class="channel-toggle">
						<input
							type="checkbox"
							checked={this.enabled}
							onChange={() => this.channelToggle.emit()}
						/>
						<span class="channel-name">{this.label}</span>
					</label>
					<span class="channel-letter">{this.letter}</span>
				</div>
				<div class="file-row">
					{this.hasImage && this.image && (
						<img class="image-preview" src={this.image.src} alt={`${this.label} texture preview`} />
					)}
					<label class="file-picker">
						<span>{this.loading ? 'Loading image…' : this.hasImage ? 'Replace image' : 'Choose image'}</span>
						<input
							ref={(element) => {
								if (element) {
									this.fileInput = element;
								}
							}}
							type="file"
							accept="image/*"
							disabled={this.loading}
							onChange={(event) => this.handleUpload(event)}
						/>
					</label>
					{this.hasImage && (
						<button class="remove-button" type="button" onClick={() => this.removeImage()}>
							Remove
						</button>
					)}
				</div>
			</section>
		);
	}
}
