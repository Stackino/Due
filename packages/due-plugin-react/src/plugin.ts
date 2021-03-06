import { Plugin, RenderServiceTag, ServiceCollection } from '@stackino/due';
import { ReactRenderService, ReactRenderServiceOptions, ReactRenderServiceOptionsTag } from './render-service';

export interface ReactPluginOptions {
	output: string | HTMLElement | ((html: string) => void);
}

export class ReactPlugin extends Plugin {
	constructor(options: ReactPluginOptions) {
		super();
		
		let output = options.output;

		if (typeof output === 'string') {
			const foundContainers = document.querySelectorAll(output);
			if (foundContainers.length !== 1) {
				throw new Error('Exactly one container element is required');
			}

			const foundContainer = foundContainers.item(0);
			if (!(foundContainer instanceof HTMLElement)) {
				throw new Error('Exactly one container element of type HTMLElement is required');
			}

			output = foundContainer;
		} else if (typeof output !== 'function' && !(output instanceof HTMLElement)) {
			throw new Error('Invalid output. It can be ID of existing DOM node, DOM node or function accepting html (server rendering).');
		}

		if (!output) {
			throw new Error('Output is required. It can be ID of existing DOM node, DOM node or function accepting html (server rendering).');
		}

		this.options = {
			output,
		};
	}

	private options: ReactRenderServiceOptions;

	configureServices(services: ServiceCollection): void | Promise<void> {
		services.bind(ReactRenderServiceOptionsTag).toValue(this.options).inSingletonLifetime();
		services.bind(RenderServiceTag).toClass(ReactRenderService).inSingletonLifetime();
	}
}
