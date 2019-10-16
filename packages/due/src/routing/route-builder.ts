import { Provider, Newable, executeProvider, isStringOrNull, isFunctionOrNull, isFunction, isObjectOrNull, isObject, isString } from '../tools';
import { Routable } from './routable';
import { RouteDeclaration, LayoutRouteDeclaration, PageRouteDeclaration, PageProvider } from './route-declaration';

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

interface RoutedPage<TPage extends Routable = Routable> {
	name: string;
	url: string;
	page: PageProvider<TPage>;
}

interface RoutedLayout<TPage extends Routable = Routable> {
	name?: string | null;
	url?: string | null;
	page?: PageProvider<TPage>;
}

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout<TPage extends Routable>(config: RoutedLayout<TPage>, children: BuildRouteDelegate): RouteBuilder;
	layout<TPage extends Routable>(name: string | null, url: string | null, page: PageProvider<TPage> | null, children: BuildRouteDelegate): RouteBuilder;
	layout(...args: unknown[]): RouteBuilder {
		if (args.length === 2) {
			const [config, children] = args;
			if (!isObject<RoutedLayout>(config)) {
				throw new Error('Route config must be an object');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.layout(config.name || null, config.url || null, config.page || null, children);
		} else {
			const [name, url, page, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(url)) {
				throw new Error('Route url must be a string or null');
			}
			if (!isFunctionOrNull<PageProvider>(page)) {
				throw new Error('Route page must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.actions.push(parent => {
				const childrenBuilder = new RouteBuilder();
				children(childrenBuilder);
				return new LayoutRouteDeclaration(name, url, page, parent, (parent) => childrenBuilder.build(parent));
			});
		}

		return this;
	}

	page<TPage extends Routable>(config: RoutedPage<TPage>): RouteBuilder;
	page<TPage extends Routable>(name: string, url: string, page: PageProvider<TPage>): RouteBuilder;
	page(...args: unknown[]): RouteBuilder {
		if (args.length === 1) {
			const [config] = args;
			if (!isObject<RoutedPage>(config)) {
				throw new Error('Route config must be an object');
			}

			this.page(config.name, config.url, config.page);
		} else {
			const [name, url, page] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isString(url)) {
				throw new Error('Route url must be a string');
			}
			if (!isFunction<PageProvider>(page)) {
				throw new Error('Route page must be a function');
			}
			
			this.actions.push(parent => new PageRouteDeclaration(name, url, page, parent));
		}
		return this;
	}

	build(parent: RouteDeclaration): RouteDeclaration[] {
		return this.actions.map(action => action(parent));
	}
}
