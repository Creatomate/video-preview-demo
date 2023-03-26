import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { Renderer } from '../renderer/Renderer';
import { useWindowWidth } from '../utility/useWindowWidth';
import { RendererState } from '../renderer/RendererState';
import { SettingsPanel } from './SettingsPanel';

const App: React.FC = () => {
  // React Hook to update the component when the window width changes
  const windowWidth = useWindowWidth();

  // Video aspect ratio that can be calculated once the video is loaded
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>();

  // Reference to the Creatomate Renderer
  const rendererRef = useRef<Renderer>();

  // Current state of the Renderer
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentState, setCurrentState] = useState<RendererState>();

  // This sets up the video player in the provided HTML DIV element
  const setUpRenderer = (htmlElement: HTMLDivElement) => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = undefined;
    }

    // Initialize a Creatomate Renderer
    const renderer = new Renderer(htmlElement, 'player', process.env.NEXT_PUBLIC_VIDEO_PLAYER_TOKEN!);

    // Once the Renderer is ready, load a template from our project
    renderer.onReady = async () => {
      await renderer.loadTemplate(process.env.NEXT_PUBLIC_TEMPLATE_ID!);
      setIsReady(true);
    };

    renderer.onLoad = () => {
      setIsLoading(true);
    };

    renderer.onLoadComplete = () => {
      setIsLoading(false);
    };

    // Listen for state changes of the Renderer
    renderer.onStateChange = (state) => {
      setCurrentState(state);
      setVideoAspectRatio(state.width / state.height);
    };

    rendererRef.current = renderer;
  };

  return (
    <Component>
      <Preview>
        <Container
          ref={(htmlElement) => {
            if (htmlElement && htmlElement !== rendererRef.current?.element) {
              setUpRenderer(htmlElement);
            }
          }}
          style={{
            height:
              videoAspectRatio && windowWidth && windowWidth < 768 ? window.innerWidth / videoAspectRatio : undefined,
          }}
        />
      </Preview>

      <Panel>
        {isReady && (
          <PanelContent id="panel">
            <SettingsPanel renderer={rendererRef.current!} currentState={currentState} />
          </PanelContent>
        )}
      </Panel>

      {isLoading && <LoadIndicator>Loading...</LoadIndicator>}
    </Component>
  );
};

export default App;

const Component = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const Preview = styled.div`
  display: flex;

  @media (min-width: 768px) {
    flex: 1;
    padding: 20px;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
  max-width: 720px;
  max-height: 720px;
  margin: auto;
`;

const Panel = styled.div`
  flex: 1;
  position: relative;
  background: #fff;
  box-shadow: rgba(0, 0, 0, 0.1) 0 6px 15px 0;

  @media (min-width: 768px) {
    flex: initial;
    margin: 50px;
    width: 400px;
    border-radius: 15px;
  }
`;

const PanelContent = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow: auto;
`;

const LoadIndicator = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 15px;
  background: #fff;
  box-shadow: rgba(0, 0, 0, 0.1) 0 6px 15px 0;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 600;

  @media (min-width: 768px) {
    top: 50px;
    left: calc((100% - 400px) / 2);
  }
`;
