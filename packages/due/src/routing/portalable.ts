import { Tag, inject } from 'ioc';
import { RouterTag, Container, PromiseCompletitionSource } from '..';
import { delay } from 'tools';
import { observable, when } from 'mobx';
import { Router } from './router';

export class PortalLifecycle {
	constructor(
		container: Container,
		portalClass: new (controller: PortalController<unknown, unknown>) => Portal<unknown, unknown>,
		private input: unknown
	) {
		this.controller = new PortalController(this, input);
		container.inject(this.controller);

		this.instance = new portalClass(this.controller);
		container.inject(this.instance);
	}

	readonly controller: PortalController<unknown, unknown>;
	readonly instance: Portal<unknown, unknown>;

	private finishedSource = new PromiseCompletitionSource<void>();
	get finished(): Promise<void> { return this.finishedSource.promise; }

	async open(): Promise<void> {
		if (this.instance.onOpening) {
			const commit = await this.instance.onOpening();

			if (typeof commit === 'function') {
				commit();
			}
		}
		this.controller.status = 'open';
		if (this.instance.onOpened) {
			const commit = await this.instance.onOpened();

			if (typeof commit === 'function') {
				commit();
			}
		}
	}

	async close(animate: boolean = true): Promise<void> {
		this.controller.status = 'closing';
		if (this.instance.onClosing) {
			const commit = await this.instance.onClosing();

			if (typeof commit === 'function') {
				commit();
			}
		}

		if (animate) {
			await when(() => this.controller.status === 'closed');
		} else {
			this.controller.status = 'closed';
		}

		if (this.instance.onClosed) {
			const commit = await this.instance.onClosed();

			if (typeof commit === 'function') {
				commit();
			}
		}

		this.finishedSource.tryResolve();
	}
}

export type PortalStatus = 'opening' | 'open' | 'closing' | 'closed';

export class PortalController<TInput, TOutput> {
	constructor(lifecycle: PortalLifecycle, input: TInput) {
		this.lifecycle = lifecycle;
		this.input = input;
		this.output = null;
	}

	// state
	private readonly lifecycle: PortalLifecycle;

	@observable
	status: PortalStatus = 'opening';
	@observable
	input: TInput;
	@observable
	output: TOutput | null;

	/**
	 * Close portal.
	 * @param output Output value to be presented to portal opener.
	 * @param animate If true set status to `closing` and wait for `closed` call. If false set status directly to `closed`. Default `true`;
	 */
	close(output: TOutput | null, animate: boolean = true) {
		if (this.status !== 'open') {
			console.warn(`Attempt to close portal, but status is '${this.status}', expected 'open'`);
			return;
		}

		this.output = output;
		this.lifecycle.close(animate);
	}

	/**
	 * Finish closing portal. Expected to be called after `close` when `animate` is set to `true`.
	 */
	closed() {
		if (this.status !== 'closing') {
			if (this.status !== 'closed') {
				console.warn(`Attempt to finish closing portal, but status is '${this.status}', expected 'closing'`);
			}
			return;
		}

		this.status = 'closed';
	}
}

export abstract class Portal<TInput, TOutput> {
	constructor(controller: PortalController<TInput, TOutput>) {
		this.controller = controller;
	}

	protected readonly controller: PortalController<TInput, TOutput>;

	onOpening?(): void | Promise<void | (() => void)>;
	onOpened?(): void | Promise<void | (() => void)>;
	onClosing?(): void | Promise<void | (() => void)>;
	onClosed?(): void | Promise<void | (() => void)>;
}

// abstract class PortalBuilder {
// 	abstract dependency<TDependency>(tag: Tag<TDependency>): TDependency;

// 	abstract whenEntered<THandler extends () => void>(handler: THandler): THandler;
// 	abstract whenExiting<THandler extends () => Promise<void>>(handler: THandler): THandler;
// 	abstract whenExited<THandler extends () => void>(handler: THandler): THandler;

// 	abstract handler<THandler extends () => Promise<void>>(handler: THandler): THandler;
// }

// function createModal(factory: (factory: PortalBuilder) => Promise<void>) {

// }

// const MyModal = createModal(async _ => {
// 	// dependencies
// 	const router = _.dependency(RouterTag);

// 	// initial state
// 	let state = _.state({
// 		loaded: false,
// 		transitions: router.pendingTransitions,
// 	});

// 	// lifecycle
// 	_.whenEntered(async () => {
// 		await delay(1000);

// 		state.loaded = true;
// 	});

// 	// handlers
// 	const handleTableChange = _.handler(async () => {
		
// 	});

// 	// templates
// 	_.view('', () => {
// 		if (!state.loaded) {
// 			return <div>Loading..</div>;
// 		}

// 		return <div>This is my modal!</div>;
// 	});
// });