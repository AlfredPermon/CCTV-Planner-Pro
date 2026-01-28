declare module 'html2canvas-pro' {
    export interface Options {
        allowTaint?: boolean;
        backgroundColor?: string | null;
        canvas?: any;
        foreignObjectRendering?: boolean;
        imageTimeout?: number;
        ignoreElements?: (element: Element) => boolean;
        logging?: boolean;
        onclone?: (doc: Document) => void;
        proxy?: string;
        removeContainer?: boolean;
        scale?: number;
        useCORS?: boolean;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        scrollX?: number;
        scrollY?: number;
        windowWidth?: number;
        windowHeight?: number;
    }

    function html2canvas(element: HTMLElement, options?: Partial<Options>): Promise<HTMLCanvasElement>;
    
    export default html2canvas;
}
