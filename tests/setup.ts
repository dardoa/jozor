import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});

// Mock web worker
class WorkerMock {
    url: string;
    onmessage: ((ev: MessageEvent) => any) | null = null;

    constructor(stringUrl: string) {
        this.url = stringUrl;
    }

    postMessage(msg: any) { }

    terminate() { }
}

global.Worker = WorkerMock as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { }, // Deprecated
        removeListener: () => { }, // Deprecated
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});

// Mock SVG methods missing in JSDOM for D3
// @ts-expect-error - SVG methods missing in JSDOM
global.SVGElement.prototype.getBBox = () => ({
    x: 0, y: 0, width: 0, height: 0,
    bottom: 0, left: 0, right: 0, top: 0,
    toJSON: () => { },
});

// @ts-expect-error - SVG methods missing in JSDOM
global.SVGElement.prototype.getScreenCTM = () => ({
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    multiply: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    translate: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    scale: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    scaleNonUniform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    rotate: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    rotateFromVector: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    flipX: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    flipY: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    skewX: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    skewY: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
});

// @ts-expect-error - SVG methods missing in JSDOM
global.SVGElement.prototype.createSVGMatrix = () => ({
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    multiply: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    translate: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    scale: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    scaleNonUniform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    rotate: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    rotateFromVector: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    flipX: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    flipY: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    skewX: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    skewY: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
});

// @ts-expect-error - SVG methods missing in JSDOM
global.SVGElement.prototype.getComputedTextLength = () => 0;
