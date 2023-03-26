import { v4 as uuid } from 'uuid';
import { RendererState } from './RendererState';
import { ElementState } from './ElementState';

export class Renderer {
  /**
   * Called when the plugin is ready for use. Do not use any of the functions of this instance prior to this event.
   *
   * @see ready
   */
  onReady?: () => void;

  /**
   * Called when the renderer is entering the 'loading' state. This occurs when an asset is downloading or buffering.
   */
  onLoad?: () => void;

  /**
   * Called when the renderer is exiting the 'loading' state.
   */
  onLoadComplete?: () => void;

  /**
   * Called when the video starts playing, either by calling 'play()' or the user pressing the play button in player mode.
   *
   * @see play()
   */
  onPlay?: () => void;

  /**
   * Called when the video stops playing, either by calling 'pause()', the user pressing the pause button in player mode,
   * or the renderer pauses playback temporarily while downloading or buffering.
   *
   * @see pause()
   */
  onPause?: () => void;

  /**
   * Called when the playback time of the video has changed.
   *
   * @param time The current playback time in seconds.
   * @see setTime()
   */
  onTimeChange?: (time: number) => void;

  /**
   * Called when the mouse tool has changed in interactive mode.
   *
   * @param tool Any of the available mouse tools; default, pen, text, ellipse, or rectangle.
   * @see setTool()
   */
  onToolChange?: (tool: 'default' | 'pen' | 'text' | 'ellipse' | 'rectangle') => void;

  /**
   * Called when the active elements have changed in interactive mode.
   *
   * @param elementIds The IDs of the elements that are currently selected.
   * @see setActiveElements()
   */
  onActiveElementsChange?: (elementIds: string[]) => void;

  /**
   * Called when the state of the renderer has changed.
   *
   * @param state The current state of the renderer.
   */
  onStateChange?: (state: RendererState) => void;

  /**
   * The current mode as set in the constructor or 'setMode()'.
   *
   * @see constructor
   * @see setMode()
   */
  mode: 'player' | 'interactive';

  /**
   * Whether the plugin is ready for use. Do no use any of the functions of this instance prior to the plugin is ready.
   *
   * @see onReady()
   */
  ready = false;

  /**
   * The current state of the renderer. Do not modify, this is a readonly property.
   * To change the state, use 'loadTemplate()', 'setSource()', 'setModifications()', or 'applyModifications()'.
   * Subscribe to the 'onStateChange()' event to be notified when the state changes.
   *
   * @see loadTemplate()
   * @see setSource()
   * @see onStateChange()
   */
  state?: RendererState;

  private readonly _iframe: HTMLIFrameElement;

  private _pendingPromises: Record<string, { resolve: (value: any) => void; reject: (reason: any) => void }> = {};

  /**
   * Sets up the Creatomate Web SDK plugin. You can choose between 'player' and 'interactive' modes.
   * - The player mode offers a static video player with a play button and time scrubber.
   * - In interactive mode, users can change the content by dragging and dropping, just like in Creatomate's template editor.
   *
   * @param element The HTML DIV element to use as a container. The renderer automatically adjusts the size of this element.
   * @param mode Choose 'player' or 'interactive'. When in doubt, choose 'player'.
   * @param publicToken Your project's public token. You can find your token in your Creatomate dashboard under project settings.
   */
  constructor(public element: HTMLDivElement, mode: 'player' | 'interactive', publicToken: string) {
    this.mode = mode;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '100%');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allow', 'autoplay');
    iframe.setAttribute('src', `https://creatomate.com/embed?mode=${mode}&token=${publicToken}`);
    iframe.style.border = 'none';
    iframe.style.display = 'none';

    element.innerHTML = '';
    element.style.overflow = 'hidden';
    element.append(iframe);

    window.addEventListener('message', this._handleMessage);

    this._iframe = iframe;
  }

  /**
   * Disposes the resources of this plugin. You can call this after you have finished using it.
   */
  dispose() {
    window.removeEventListener('message', this._handleMessage);

    this._iframe.parentNode?.removeChild(this._iframe);
    this._iframe.setAttribute('src', '');

    this._pendingPromises = {};
  }

  /**
   * Sets the mode. See the constructor for more information about these modes.
   *
   * @param mode 'player' or 'interactive' mode.
   */
  async setMode(mode: 'player' | 'interactive'): Promise<void> {
    await this._sendCommand({ message: 'setMode', mode }).catch((error) => {
      throw new Error(`Failed to set mode: ${error.message}`);
    });
  }

  /**
   * Loads a template from your project.
   * Make sure the template is located in the project from which you are using the public token.
   *
   * @param templateId The ID of the template.
   */
  async loadTemplate(templateId: string): Promise<void> {
    await this._sendCommand({ message: 'setTemplate', templateId }).catch((error) => {
      throw new Error(`Failed to load template: ${error.message}`);
    });

    // Show iframe
    this._iframe.style.display = '';
  }

  /**
   * Sets the JSON source of the video or image that is being displayed.
   *
   * @param source The source of the video or image.
   * @param createUndoPoint Set to 'true' if you wish to add an undo point to be used later with 'undo()' and 'redo()'.
   * @see https://creatomate.com/docs/json/introduction
   * @see undo()
   * @see redo()
   */
  async setSource(source: Record<string, any>, createUndoPoint = false): Promise<void> {
    await this._sendCommand({ message: 'setSource', source, createUndoPoint }).catch((error) => {
      throw new Error(`Failed to set source: ${error.message}`);
    });

    // Show iframe
    this._iframe.style.display = '';
  }

  /**
   * Gets the source JSON of an element, or the full source of the video/image if no element is provided.
   *
   * @param state Optional. The state from which to extract the source JSON. Defaults to 'this.state'.
   * @return The source JSON.
   * @see https://creatomate.com/docs/json/introduction
   */
  getSource(
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): Record<string, any> {
    if (!state) {
      return {};
    } else if (state.elements) {
      return {
        ...state.source,
        elements: state.elements.map((element) => this.getSource(element)),
      };
    } else {
      return state.source;
    }
  }

  /**
   * Gets all nested elements of an element recursively, or all elements of the video/image if no element is provided.
   *
   * @param state Optional. The state from which to retrieve the elements. Defaults to 'this.state'.
   * @return The elements in an array.
   */
  getElements(
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): ElementState[] {
    const elements = [];
    if (state) {
      if (state.source.type) {
        elements.push(state as ElementState);
      }

      if (Array.isArray(state.elements)) {
        for (const nestedElement of state.elements) {
          elements.push(...this.getElements(nestedElement));
        }
      }
    }
    return elements;
  }

  /**
   * Finds an element by a predicate recursively.
   *
   * @param predicate Predicate function that is called for each element until 'true' is returned.
   * @param state Optional. The state to scan for an element. Defaults to 'this.state'.
   * @return The state of the element found, or 'undefined' when the predicate returned 'false' for all elements.
   */
  findElement(
    predicate: (element: ElementState) => boolean,
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): ElementState | undefined {
    if (state?.elements) {
      for (const element of state.elements) {
        if (predicate(element)) {
          return element;
        }

        if (element.elements) {
          const foundNestedElement = this.findElement(predicate, element);
          if (foundNestedElement) {
            return foundNestedElement;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Sets the modifications that are applied to the video or image source.
   * Unlike 'applyModifications()', this function does not mutate the source set by 'loadTemplate()' or 'setSource()'.
   *
   * How do I know when to use 'setModifications' or 'applyModifications'?
   * - If you use the 'player' mode and wish to replace the content of dynamic elements, 'setModifications()' is probably what you need.
   * - If you use the 'interactive' mode and want to make a definitive change to any element, you'll probably want to use 'applyModifications()' instead.
   *
   * @param modifications A modifications object.
   * @see https://creatomate.com/docs/api/rest-api/the-modifications-object
   * @see applyModifications()
   * @see loadTemplate()
   * @see setSource()
   */
  async setModifications(modifications: Record<string, any>): Promise<void> {
    return await this._sendCommand({ message: 'setModifications', modifications }).catch((error) => {
      throw new Error(`Failed to set modifications: ${error.message}`);
    });
  }

  /**
   * Applies modifications to the source. An undo point is created automatically.
   * The difference between this and 'setModifications()' is that this function modifies the source JSON.
   *
   * @param modifications A modifications object.
   * @see https://creatomate.com/docs/api/rest-api/the-modifications-object
   * @see setModifications()
   * @see undo()
   * @see redo()
   */
  async applyModifications(modifications: Record<string, any>): Promise<void> {
    return this._sendCommand({ message: 'applyModifications', modifications }).catch((error) => {
      throw new Error(`Failed to apply modifications: ${error.message}`);
    });
  }

  /**
   * Reverts the last changes made by 'setSource()', 'applyModifications()', or the user when in interactive mode.
   *
   * @see setSource()
   * @see applyModifications()
   */
  async undo(): Promise<void> {
    return this._sendCommand({ message: 'undo' }).catch((error) => {
      throw new Error(`Failed to undo: ${error.message}`);
    });
  }

  /**
   * Reapplies the changes from the redo stack. This function won't have any effect if 'undo()' has not been called previously.
   *
   * @see undo()
   */
  async redo(): Promise<void> {
    return this._sendCommand({ message: 'redo' }).catch((error) => {
      throw new Error(`Failed to redo: ${error.message}`);
    });
  }

  /**
   * Sets the current mouse tool.
   *
   * @param tool Any of the available mouse tools; default, pen, text, ellipse, or rectangle.
   * @see onToolChange()
   */
  async setTool(tool: 'default' | 'pen' | 'text' | 'ellipse' | 'rectangle') {
    await this._sendCommand({ message: 'setTool', tool }).catch((error) => {
      throw new Error(`Failed to set tool: ${error.message}`);
    });
  }

  /**
   * Sets the currently selected elements when in interactive mode.
   *
   * @param elementIds The IDs of the elements to select.
   * @see onActiveElementsChange()
   */
  async setActiveElements(elementIds: string[]): Promise<void> {
    await this._sendCommand({ message: 'setActiveElements', elementIds }).catch((error) => {
      throw new Error(`Failed to set active elements: ${error.message}`);
    });
  }

  /**
   * Seeks to the provided playback time.
   *
   * @param time Playback time in seconds.
   * @see onTimeChange()
   */
  async setTime(time: number): Promise<void> {
    return this._sendCommand({ message: 'setTime', time }).catch((error) => {
      throw new Error(`Failed to set time: ${error.message}`);
    });
  }

  /**
   * Starts playing the video.
   *
   * @see onPlay()
   */
  async play(): Promise<void> {
    return this._sendCommand({ message: 'play' }).catch((error) => {
      throw new Error(`Failed to play: ${error.message}`);
    });
  }

  /**
   * Pauses the video.
   *
   * @see onPause()
   */
  async pause(): Promise<void> {
    return this._sendCommand({ message: 'pause' }).catch((error) => {
      throw new Error(`Failed to pause: ${error.message}`);
    });
  }

  /**
   * Ensures that an asset can be used immediately as a source for a video, image, or audio element by caching it.
   * As a result, the file is immediately available without waiting for the upload to complete.
   *
   * @param url The URL of the file. This URL won't be requested because the Blob should provide the file content already.
   * @param blob The content of the file. Make sure that the file is available at the URL eventually,
   *             as there is no guarantee that it will remain cached.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Blob
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
   */
  cacheAsset(url: string, blob: Blob): Promise<void> {
    return this._sendCommand({ message: 'cacheAsset', url }, { blob }).catch((error) => {
      throw new Error(`Failed to cache asset: ${error.message}`);
    });
  }

  private _sendCommand(message: Record<string, any>, payload?: Record<string, any>): Promise<any> {
    if (!this.ready) {
      throw new Error('The SDK is not yet ready. Please wait for the onReady event before calling any methods.');
    }

    const id = uuid();
    this._iframe.contentWindow?.postMessage({ id, ...JSON.parse(JSON.stringify(message)), ...payload }, '*');

    // Create pending promise
    return new Promise((resolve, reject) => (this._pendingPromises[id] = { resolve, reject }));
  }

  // Defined as arrow function to make it bound to this instance when used with window.addEventListener above.
  private _handleMessage = (e: MessageEvent<any>) => {
    if (!e.data || typeof e.data !== 'object') {
      return;
    }

    const { id, message, error, ...args } = e.data;

    if (id) {
      // Resolve pending promise
      const pendingPromise = this._pendingPromises[id];
      if (pendingPromise) {
        if (error) {
          pendingPromise.reject(new Error(error));
        } else {
          pendingPromise.resolve(args);
        }

        // Clean up
        delete this._pendingPromises[id];
      }
    } else {
      switch (message) {
        case 'onReady':
          // The component is ready to use
          this.ready = true;

          // Set the mode as provided in the constructor
          this.setMode(this.mode).then();

          if (this.onReady) {
            this.onReady();
          }
          break;

        case 'onLoad':
          if (this.onLoad) {
            this.onLoad();
          }
          break;

        case 'onLoadComplete':
          if (this.onLoadComplete) {
            this.onLoadComplete();
          }
          break;

        case 'onPlay':
          if (this.onPlay) {
            this.onPlay();
          }
          break;

        case 'onPause':
          if (this.onPause) {
            this.onPause();
          }
          break;

        case 'onTimeChange':
          if (this.onTimeChange) {
            this.onTimeChange(args.time);
          }
          break;

        case 'onToolChange':
          if (this.onToolChange) {
            this.onToolChange(args.tool);
          }
          break;

        case 'onActiveElementsChange':
          if (this.onActiveElementsChange) {
            this.onActiveElementsChange(args.elementIds);
          }
          break;

        case 'onStateChange':
          this.state = args.state;
          if (this.onStateChange) {
            this.onStateChange(args.state);
          }
          break;
      }
    }
  };
}
