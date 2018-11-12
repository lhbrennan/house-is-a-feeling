import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-flow: row;
`;

// const Button = styled.button`
//   background: ${({ visible }) => {
//     if (visible) { return 'orange'; }
//     return 'grey';
//   }};
//   margin: 5px; 
//   border-radius: 10px;
//   height: 40px;
//   width: 40px;
// `;
const Button = styled.button`
  display: flex;
  overflow: hidden;
  justify-content: center;
  align-items: center;
  flex: 0 0 40px;
  height: 40px;
  margin: 0px 4px;

  cursor: pointer;
  user-select: none;
  transition: all 150ms linear;
  text-align: center;
  white-space: nowrap;
  text-decoration: none;
  text-transform: none;

  background: ${({ visible }) => {
    if (visible) { return '#FFEB95'; }
    return '#5f7e97';
  }};
  border: 0 none;
  border-radius: 4px;

  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;

  -webkit-appearance: none;
  -moz-appearance:    none;
  appearance:         none;
 
  
  box-shadow: 2px 5px 10px var(--color-smoke);

  &:hover {
    transition: all 150ms linear;

    opacity: .85;
  }
  
  &:active {
    transition: all 150ms linear;
    opacity: .75;
  }
  
  &:focus {
    outline: 1px dotted #959595;
    outline-offset: -4px;
  }
`;

const BarsSelector = ({ bars, visibleBar, selectBar }) => {
  // create range from 1 to bars
  const range = Array.from(new Array(bars), (_, index) => index + 1);

  return (
    <Wrapper>
      {range.length > 1
      && range.map(elem => (
        <Button key={elem} visible={elem === visibleBar} onClick={() => selectBar(elem)}>
          {elem}
        </Button>))
      }
    </Wrapper>
  );
};

export default BarsSelector;