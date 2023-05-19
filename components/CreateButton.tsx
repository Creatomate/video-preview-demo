import React, { useState } from 'react';
import styled from 'styled-components';
import { Preview } from '@creatomate/preview';
import { Button } from './Button';

interface CreateButtonProps {
  preview: Preview;
}

export const CreateButton: React.FC<CreateButtonProps> = (props) => {
  const [isRendering, setIsRendering] = useState(false);
  const [render, setRender] = useState<any>();

  if (isRendering) {
    return <Component style={{ background: '#e67e22' }}>Rendering...</Component>;
  }

  if (render) {
    return (
      <Component
        style={{ background: '#2ecc71' }}
        onClick={() => {
          window.open(render.url, '_blank');
          setRender(undefined);
        }}
      >
        Download
      </Component>
    );
  }

  return (
    <Component
      style={{ display: 'block', marginLeft: 'auto' }}
      onClick={async () => {
        setIsRendering(true);

        try {
          const render = await finishVideo(props.preview);
          if (render.status === 'succeeded') {
            setRender(render);
          } else {
            window.alert(`Rendering failed: ${render.errorMessage}`);
          }
        } catch (error) {
          window.alert(error);
        } finally {
          setIsRendering(false);
        }
      }}
    >
      Create Video
    </Component>
  );
};

const Component = styled(Button)`
  display: block;
  margin-left: auto;
`;

const finishVideo = async (preview: Preview) => {
  const response = await fetch('/api/videos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: preview.getSource(),
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('No API key was provided. Please refer to the README.md for instructions.');
    } else {
      throw new Error(`The request failed with status code ${response.status}`);
    }
  }

  return await response.json();
};
