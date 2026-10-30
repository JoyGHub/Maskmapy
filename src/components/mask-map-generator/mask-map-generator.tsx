import { Component, h, State } from '@stencil/core';
import { CHANNELS, composeMaskMap, getMaskMapDimensions } from '../../utils/mask-map';
import type { ChannelState, ChannelStates, ChannelType } from '../../utils/mask-map';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

@Component({
	tag: 'mask-map-generator',
	styleUrl: 'mask-map-generator.css',
	shadow: true
})
export class MaskMapGenerator {
	@State() theme: Theme = 'light';
	themePreference: ThemePreference = 'system';
	@State() channels: ChannelStates = {
		metallic: { image: null, enabled: true, defaultValue: 0.5 },
		ao: { image: null, enabled: true, defaultValue: 0.5 },
		detail: { image: null, enabled: true, defaultValue: 0.5 },
		smoothness: { image: null, enabled: true, defaultValue: 0.5 }
	};
	@State() errorMessage = '';
	@State() dimensions!: { width: number; height: number };

	outputCanvas!: HTMLCanvasElement;
	context!: CanvasRenderingContext2D;
	colorSchemeQuery!: MediaQueryList;
	readonly handleSystemThemeChange = (event: MediaQueryListEvent) => {
		if (this.themePreference === 'system') {
			this.theme = event.matches ? 'dark' : 'light';
		}
	};

	loadThemePreference() {
		this.colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.colorSchemeQuery.addEventListener('change', this.handleSystemThemeChange);

		try {
			const storedPreference = window.localStorage.getItem('maskmapy-theme');

			if (storedPreference === 'light' || storedPreference === 'dark') {
				this.themePreference = storedPreference;
				this.theme = storedPreference;
				return;
			}
		} catch (error) {
			console.error('Unable to read the saved theme preference.', error);
		}

		this.themePreference = 'system';
		this.theme = this.colorSchemeQuery.matches ? 'dark' : 'light';
	}

	toggleTheme() {
		const preference: Theme = this.theme === 'dark' ? 'light' : 'dark';
		this.themePreference = preference;
		this.theme = preference;

		try {
			window.localStorage.setItem('maskmapy-theme', preference);
		} catch (error) {
			console.error('Unable to save the theme preference.', error);
		}
	}

	updateChannel(channel: ChannelType, updates: Partial<ChannelState>) {
		this.channels = {
			...this.channels,
			[channel]: { ...this.channels[channel], ...updates }
		};
		this.errorMessage = '';
		this.updateMaskMap();
	}

	toggleChannel(channel: ChannelType) {
		this.updateChannel(channel, { enabled: !this.channels[channel].enabled });
	}

	updateMaskMap() {
		if (!this.context) {
			this.errorMessage = 'The preview canvas could not be initialized.';
			return;
		}

		try {
			const dimensions = composeMaskMap(this.context, this.channels);

			if (dimensions.width !== this.dimensions.width || dimensions.height !== this.dimensions.height) {
				this.dimensions = dimensions;
			}
			this.errorMessage = '';
		} catch (error) {
			this.errorMessage = error instanceof Error ? error.message : 'Unable to generate the mask map.';
		}
	}

	componentWillLoad() {
		this.loadThemePreference();
		this.dimensions = getMaskMapDimensions(this.channels);
	}

	disconnectedCallback() {
		this.colorSchemeQuery?.removeEventListener('change', this.handleSystemThemeChange);
	}

	downloadMaskMap() {
		try {
			const link = document.createElement('a');
			const id = Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0');
			link.download = `maskmapy-${id}.png`;
			link.href = this.outputCanvas.toDataURL('image/png');
			link.click();
		} catch (error) {
			this.errorMessage = error instanceof Error ? error.message : 'Unable to download the mask map.';
		}
	}

	componentDidLoad() {
		const context = this.outputCanvas.getContext('2d');

		if (!context) {
			this.errorMessage = 'Your browser could not initialize the preview canvas.';
			return;
		}

		this.context = context;
		this.updateMaskMap();
	}

	render() {
		return (
			<main class="page" data-theme={this.theme}>
				<div class="shell">
					<header class="topbar">
						<div class="brand">
							<span class="brand-mark" aria-hidden="true">
								<svg viewBox="0 0 32 32" fill="none">
									<rect x="3" y="3" width="12" height="12" rx="3" fill="currentColor" />
									<rect x="17" y="3" width="12" height="12" rx="3" fill="currentColor" opacity=".66" />
									<rect x="3" y="17" width="12" height="12" rx="3" fill="currentColor" opacity=".42" />
									<rect x="17" y="17" width="12" height="12" rx="3" fill="currentColor" opacity=".2" />
								</svg>
							</span>
							<span>Maskmapy</span>
						</div>
						<button
							class="theme-button"
							type="button"
							aria-label={`Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`}
							title={`Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`}
							onClick={() => this.toggleTheme()}
						>
							{this.theme === 'dark' ? (
								<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
									<circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.6" />
									<path d="M10 2v1.5m0 13V18m8-8h-1.5M3.5 10H2m13.66-5.66-1.06 1.06M5.4 14.6l-1.06 1.06m11.32 0-1.06-1.06M5.4 5.4 4.34 4.34" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
								</svg>
							) : (
								<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
									<path d="M16.4 12.2A6.9 6.9 0 0 1 7.8 3.6a7 7 0 1 0 8.6 8.6Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							)}
						</button>
					</header>

					<section class="intro">
						<h1>Generate a mask map.<br /><span>Keep your workflow simple.</span></h1>
						<p class="intro-copy">
							Combine grayscale textures into one ready-to-use mask map. Your images stay on this device.
						</p>
					</section>

					<section class="workspace" aria-label="Mask map generator">
						<div class="controls-card">
							<div class="section-heading">
								<div>
									<h2>Texture channels</h2>
									<p>Add an image to each channel you want to pack.</p>
								</div>
							</div>
							<div class="channel-list">
								{CHANNELS.map(({ key, label, letter }) => (
									<mask-map-channel
										label={label}
										letter={letter}
										enabled={this.channels[key].enabled}
										hasImage={this.channels[key].image !== null}
										image={this.channels[key].image}
										onChannelToggle={() => this.toggleChannel(key)}
										onImageChange={(event) => this.updateChannel(key, { image: event.detail })}
										onImageRemove={() => this.updateChannel(key, { image: null })}
										onImageError={(event) => {
											this.errorMessage = event.detail;
										}}
									/>
								))}
							</div>
						</div>

						<div class="preview-card">
							<div class="section-heading preview-heading">
								<div>
									<h2>Live preview</h2>
									<p>Updates as you edit your channels.</p>
								</div>
								<span class="live-status"><span></span> LIVE</span>
							</div>
							<div class="preview-stage">
								<canvas
									ref={(element) => {
										if (element) {
											this.outputCanvas = element;
										}
									}}
									aria-label="Generated mask map preview"
								/>
							</div>
							<div class="preview-footer">
								<span>{this.dimensions.width} × {this.dimensions.height} px</span>
								<button class="download-button" type="button" onClick={() => this.downloadMaskMap()}>
									<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
										<path d="M10 2.5v9m0 0 3.5-3.5M10 11.5 6.5 8M3.5 13v3.5h13V13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
									Download PNG
								</button>
							</div>
							<div class="color-space-note">
								<span class="info-icon" aria-hidden="true">i</span>
								<span>Import the finished texture in Unity with <strong>sRGB disabled</strong>.</span>
							</div>
						</div>
					</section>

					{this.errorMessage && (
						<p class="error-message" role="alert">{this.errorMessage}</p>
					)}

				</div>
			</main>
		);
	}
}
