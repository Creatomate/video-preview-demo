import React from 'react';
import styled from 'styled-components';

export const ImageOption = styled.div<{ url: string }>`
  margin: 0 10px;
  width: 65px;
  height: 65px;
  border-radius: 5px;
  background: url('${(props) => props.url}');
  background-size: cover;
  cursor: pointer;
`;
