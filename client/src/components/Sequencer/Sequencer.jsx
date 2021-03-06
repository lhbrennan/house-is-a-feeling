import React from 'react';
import styled from 'styled-components';

import InstrumentsList from '../TrackSettings';
import Grid from '../Grid';

const Section = styled.section`
  display: flex;
  padding: 0 0 0 50px;
  justify-content: flex-start;
  min-width: 1295px;
`;

const Sequencer = () => (
  <Section>
    <InstrumentsList />
    <Grid />
  </Section>
);

export default Sequencer;
