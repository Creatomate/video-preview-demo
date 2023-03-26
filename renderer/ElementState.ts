import { CompositionState } from './CompositionState';
import { TextState } from './TextState';
import { VideoState } from './VideoState';
import { AudioState } from './AudioState';

export interface ElementState extends CompositionState, TextState, VideoState, AudioState {
  /**
   * This element's track number.
   */
  track: number;

  /**
   * This element's appearance time in relation to its composition.
   *
   * @deprecated Use 'localTime' instead. This property will be removed in a later version of the SDK.
   */
  time: number;

  /**
   * This element's appearance time in relation to its composition.
   */
  localTime: number;

  /**
   * This element's appearance time in relation to the entire video.
   */
  globalTime: number;

  /**
   * This element's duration in seconds.
   */
  duration: number;

  /**
   * Exit transition duration in seconds, i.e. how long the next element overlaps it.
   *
   * @deprecated Use 'exitDuration' instead. This property will be removed in a later version of the SDK.
   */
  exit: number;

  /**
   * Exit transition duration in seconds, i.e. how long the next element overlaps it.
   */
  exitDuration: number;

  /**
   * The source JSON of the element without the 'elements' property.
   */
  source: Record<string, any>;
}
