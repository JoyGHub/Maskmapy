export const CHANNELS = [
	{ key: 'metallic', label: 'Metallic', letter: 'R' },
	{ key: 'ao', label: 'Ambient Occlusion', letter: 'G' },
	{ key: 'detail', label: 'Detail Mask', letter: 'B' },
	{ key: 'smoothness', label: 'Smoothness', letter: 'A' }
] as const;

export type ChannelType = typeof CHANNELS[number]['key'];

export interface ChannelState {
	image: HTMLImageElement | null;
	enabled: boolean;
	defaultValue: number;
}

export type ChannelStates = Record<ChannelType, ChannelState>;

export function getMaskMapDimensions(channels: ChannelStates): { width: number; height: number } {
	const sourceImage = CHANNELS
		.map(({ key }) => channels[key].image)
		.find((image) => image !== null);

	return {
		width: sourceImage ? sourceImage.width : 512,
		height: sourceImage ? sourceImage.height : 512
	};
}

export function writeChannel(
	output: Uint8ClampedArray,
	channelOffset: number,
	source: Uint8ClampedArray | null,
	defaultValue: number
) {
	const fallback = Math.round(Math.min(1, Math.max(0, defaultValue)) * 255);

	for (let pixel = channelOffset; pixel < output.length; pixel += 4) {
		output[pixel] = source ? source[pixel - channelOffset] : fallback;
	}
}

export function composeMaskMap(
	context: CanvasRenderingContext2D,
	channels: ChannelStates
): { width: number; height: number } {
	const { width, height } = getMaskMapDimensions(channels);
	const imageData = context.createImageData(width, height);
	const sourceCanvas = document.createElement('canvas');
	sourceCanvas.width = width;
	sourceCanvas.height = height;
	const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });

	if (!sourceContext) {
		throw new Error('Unable to initialize the image processing canvas.');
	}

	CHANNELS.forEach(({ key }, channelIndex) => {
		const channel = channels[key];
		const channelOffset = channelIndex;

		if (!channel.enabled || !channel.image) {
			writeChannel(imageData.data, channelOffset, null, channel.defaultValue);
			return;
		}

		sourceContext.clearRect(0, 0, width, height);
		sourceContext.drawImage(channel.image, 0, 0, width, height);
		const sourceData = sourceContext.getImageData(0, 0, width, height).data;
		writeChannel(imageData.data, channelOffset, sourceData, channel.defaultValue);
	});

	context.canvas.width = width;
	context.canvas.height = height;
	context.putImageData(imageData, 0, 0);

	return { width, height };
}
