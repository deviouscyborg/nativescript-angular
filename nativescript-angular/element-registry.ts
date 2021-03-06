import { View } from "tns-core-modules/ui/core/view";
import { LayoutBase } from "tns-core-modules/ui/layouts/layout-base";
import { Page } from "tns-core-modules/ui/page";
import { Frame } from "tns-core-modules/ui/frame";

export type NgView = (View & ViewExtensions);

export interface ViewExtensions {
    meta: ViewClassMeta;
    nodeType: number;
    nodeName: string;
    parentNode: NgView;
    nextSibling: NgView;
    firstChild: NgView;
    lastChild: NgView;
    ngCssClasses: Map<string, boolean>;
}

export interface ViewClass {
    new(): View;
}

export abstract class InvisibleNode extends View implements NgView {
    meta: { skipAddToDom: boolean };
    nodeType: number;
    nodeName: string;
    parentNode: NgView;
    nextSibling: NgView;
    firstChild: NgView;
    lastChild: NgView;
    ngCssClasses: Map<string, boolean>;

    constructor() {
        super();

        this.nodeType = 1;
        this.nodeName = getClassName(this);
    }

    toString() {
        return `${this.nodeName}(${this.id})`;
    }
}

export class CommentNode extends InvisibleNode {
    protected static id = 0;

    constructor() {
        super();

        this.meta = {
            skipAddToDom: true,
        };
        this.id = CommentNode.id.toString();
        CommentNode.id += 1;
    }
}

export class TextNode extends InvisibleNode {
    protected static id = 0;

    constructor() {
        super();

        this.meta = {
            skipAddToDom: true,
        };
        this.id = TextNode.id.toString();
        TextNode.id += 1;
    }
}

const getClassName = instance => instance.constructor.name;

export interface ViewClassMeta {
    skipAddToDom?: boolean;
    insertChild?: (parent: any, child: any, next?: any) => void;
    removeChild?: (parent: any, child: any) => void;
}

export function isDetachedElement(element): boolean {
    return (element && element.meta && element.meta.skipAddToDom);
}

export function isView(view: any): view is NgView {
    return view instanceof View;
}

export function isInvisibleNode(view: any): view is InvisibleNode {
    return view instanceof InvisibleNode;
}

export type ViewResolver = () => ViewClass;

const elementMap = new Map<string, { resolver: ViewResolver, meta?: ViewClassMeta }>();
const camelCaseSplit = /([a-z0-9])([A-Z])/g;
const defaultViewMeta: ViewClassMeta = { skipAddToDom: false };

export function registerElement(
    elementName: string,
    resolver: ViewResolver,
    meta?: ViewClassMeta
): void {
    const entry = { resolver: resolver, meta: meta };
    elementMap.set(elementName, entry);
    elementMap.set(elementName.toLowerCase(), entry);
    elementMap.set(elementName.replace(camelCaseSplit, "$1-$2").toLowerCase(), entry);
}

export function getViewClass(elementName: string): ViewClass {
    const entry = elementMap.get(elementName) ||
        elementMap.get(elementName.toLowerCase());
    if (!entry) {
        throw new TypeError(`No known component for element ${elementName}.`);
    }

    try {
        return entry.resolver();
    } catch (e) {
        throw new TypeError(`Could not load view for: ${elementName}.${e}`);
    }
}

export function getViewMeta(nodeName: string): ViewClassMeta {
    const entry = elementMap.get(nodeName) || elementMap.get(nodeName.toLowerCase());
    return (entry && entry.meta) || defaultViewMeta;
}

export function isKnownView(elementName: string): boolean {
    return elementMap.has(elementName) ||
        elementMap.has(elementName.toLowerCase());
}

export function getSingleViewRecursive(nodes: Array<any>, nestLevel: number): View {
    const actualNodes = nodes.filter(node => !(node instanceof InvisibleNode));

    if (actualNodes.length === 0) {
        throw new Error(`No suitable views found in list template! ` +
            `Nesting level: ${nestLevel}`);
    } else if (actualNodes.length > 1) {
        throw new Error(`More than one view found in list template!` +
            `Nesting level: ${nestLevel}`);
    }

    const rootLayout = actualNodes[0];
    if (!rootLayout) {
        return getSingleViewRecursive(rootLayout.children, nestLevel + 1);
    }

    const parentLayout = rootLayout.parent;
    if (parentLayout instanceof LayoutBase) {
        let node = rootLayout.parentNode;
        parentLayout.removeChild(rootLayout);
        rootLayout.parentNode = node;
    }

    return rootLayout;
}

const frameMeta: ViewClassMeta = {
    insertChild: (parent: Frame, child: NgView, next: any) => {
        // Page cannot be added to Frame with _addChildFromBuilder (trows "use defaultPage" error)
        if (isInvisibleNode(child)) {
            return;
        } else if (child instanceof Page) {
            parent.navigate({ create: () => child });
        } else {
            throw new Error("Only a Page can be a child of Frame");
        }
    }
};

// Register default NativeScript components
// Note: ActionBar related components are registerd together with action-bar directives.
registerElement("AbsoluteLayout", () => require("tns-core-modules/ui/layouts/absolute-layout").AbsoluteLayout);
registerElement("ActivityIndicator", () => require("tns-core-modules/ui/activity-indicator").ActivityIndicator);
registerElement("Border", () => require("tns-core-modules/ui/border").Border);
registerElement("BottomNavigation", () => require("tns-core-modules/ui/bottom-navigation").BottomNavigation);
registerElement("Button", () => require("tns-core-modules/ui/button").Button);
registerElement("ContentView", () => require("tns-core-modules/ui/content-view").ContentView);
registerElement("DatePicker", () => require("tns-core-modules/ui/date-picker").DatePicker);
registerElement("DockLayout", () => require("tns-core-modules/ui/layouts/dock-layout").DockLayout);
registerElement("Frame", () => require("tns-core-modules/ui/frame").Frame, frameMeta);
registerElement("GridLayout", () => require("tns-core-modules/ui/layouts/grid-layout").GridLayout);
registerElement("HtmlView", () => require("tns-core-modules/ui/html-view").HtmlView);
registerElement("Image", () => require("tns-core-modules/ui/image").Image);
// Parse5 changes <Image> tags to <img>. WTF!
registerElement("img", () => require("tns-core-modules/ui/image").Image);
registerElement("Label", () => require("tns-core-modules/ui/label").Label);
registerElement("ListPicker", () => require("tns-core-modules/ui/list-picker").ListPicker);
registerElement("ListView", () => require("tns-core-modules/ui/list-view").ListView);
registerElement("Page", () => require("tns-core-modules/ui/page").Page);
registerElement("Placeholder", () => require("tns-core-modules/ui/placeholder").Placeholder);
registerElement("Progress", () => require("tns-core-modules/ui/progress").Progress);
registerElement("ProxyViewContainer", () => require("tns-core-modules/ui/proxy-view-container").ProxyViewContainer);
registerElement("Repeater", () => require("tns-core-modules/ui/repeater").Repeater);
registerElement("ScrollView", () => require("tns-core-modules/ui/scroll-view").ScrollView);
registerElement("SearchBar", () => require("tns-core-modules/ui/search-bar").SearchBar);
registerElement("SegmentedBar", () => require("tns-core-modules/ui/segmented-bar").SegmentedBar);
registerElement("SegmentedBarItem", () => require("tns-core-modules/ui/segmented-bar").SegmentedBarItem);
registerElement("Slider", () => require("tns-core-modules/ui/slider").Slider);
registerElement("StackLayout", () => require("tns-core-modules/ui/layouts/stack-layout").StackLayout);
registerElement("FlexboxLayout", () => require("tns-core-modules/ui/layouts/flexbox-layout").FlexboxLayout);
registerElement("Switch", () => require("tns-core-modules/ui/switch").Switch);
registerElement("TabView", () => require("tns-core-modules/ui/tab-view").TabView);
registerElement("TabStrip", () => require("tns-core-modules/ui/tab-navigation-base/tab-strip").TabStrip);
registerElement("TabStripItem", () => require("tns-core-modules/ui/tab-navigation-base/tab-strip-item").TabStripItem);
registerElement("TabContentItem",
    () => require("tns-core-modules/ui/tab-navigation-base/tab-content-item").TabContentItem);
registerElement("Tabs", () => require("tns-core-modules/ui/tabs").Tabs);
registerElement("TextField", () => require("tns-core-modules/ui/text-field").TextField);
registerElement("TextView", () => require("tns-core-modules/ui/text-view").TextView);
registerElement("TimePicker", () => require("tns-core-modules/ui/time-picker").TimePicker);
registerElement("WebView", () => require("tns-core-modules/ui/web-view").WebView);
registerElement("WrapLayout", () => require("tns-core-modules/ui/layouts/wrap-layout").WrapLayout);
registerElement("FormattedString", () => require("tns-core-modules/text/formatted-string").FormattedString);
registerElement("Span", () => require("tns-core-modules/text/span").Span);

registerElement("DetachedContainer", () => require("tns-core-modules/ui/proxy-view-container").ProxyViewContainer,
    { skipAddToDom: true });

registerElement("page-router-outlet", () => require("tns-core-modules/ui/frame").Frame);
