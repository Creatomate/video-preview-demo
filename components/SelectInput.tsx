import React from 'react';
import styled from 'styled-components';

export const SelectInput = styled.select`
  display: block;
  margin: 5px 0;
  padding: 10px 15px;
  width: 100%;
  background-color: #fff;
  border: 1px solid #b3bfcc;
  border-radius: 5px;
  outline: none;

  // Arrow
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'%3E%3Cpath d='m0.993 2.02 5.25 5.25c0.966 0.966 2.534 0.966 3.5-0l5.264-5.264' fill='none' stroke='%23000' stroke-width='2px'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px top 50%;
  background-size: 16px auto;

  &:focus {
    background-color: #e9f4fc;
    border-color: #005aff;
  }
`;
