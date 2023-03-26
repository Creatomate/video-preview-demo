import { ElementState } from './ElementState';

export interface RendererState {
  /**
   * Width of the video in pixels.
   */
  width: number;

  /**
   * Height of the video in pixels.
   */
  height: number;

  /**
   * Duration of the video in seconds.
   */
  duration: number;

  /**
   * When the renderer's state can be reversed, it is 'true'. See the renderer's undo and redo functions.
   */
  undo: boolean;

  /**
   * When the renderer's state can be reapplied, it is 'true'. See the renderer's undo and redo functions.
   */
  redo: boolean;

  /**
   * The source JSON of the video/image without the 'elements' property.
   */
  source: Record<string, any>;

  /**
   * The elements in this video/image
   */
  elements: ElementState[];
}
