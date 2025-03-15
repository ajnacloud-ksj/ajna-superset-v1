import React, { useState } from 'react';
import styled from '@emotion/styled';

const ChartWrapper = styled.div`
  width: 100%;
  height: 90%;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary.base};
  display: flex;
  flex-direction: column;
`;

const ChartsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  height: 100%;
`;

const IframeContainer = styled.div`
  width: 100%;
  height: 100%;
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
`;

interface ChartComponentProps {
  selectedDashboard: string;
}

const CustomHistogramComponent: React.FC<ChartComponentProps> = ({selectedDashboard }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  let chartContent;
  if (selectedDashboard === 'none') {
    chartContent = <div></div>
  } else {
    const iframeLink = `http://10.120.0.108:3000/${selectedDashboard}`;
    chartContent =
      <IframeContainer>
        {isIframeLoading && <div>Loading...</div>}
        <iframe src={iframeLink} onLoad={() => setIsIframeLoading(false)}></iframe>
      </IframeContainer>
  }

  return (
    <ChartWrapper>
      <ChartsContainer>
        {chartContent}
      </ChartsContainer>
    </ChartWrapper>
  );
};

export default CustomHistogramComponent;
