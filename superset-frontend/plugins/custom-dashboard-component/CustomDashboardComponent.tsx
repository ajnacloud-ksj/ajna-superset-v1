import styled from '@emotion/styled';

const ChartWrapper = styled.div`
  width: 100%;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary.base};
`;

const ChartsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
`;

const IframeContainer = styled.div`
  width: 100%;
  height: 100%;
  iframe {
    width: 100%;
    height: 100%;
    min-height: 600px;
    border: none;
  }
`;

interface Filter {
  id: string;
  type: string;
  scope: {
    excluded: number[];
    rootPath: string[];
  };
}

interface ChartComponentProps {
  dateRange: string;
  filters: Filter[];
  selectedDashboard: string;
}

const CustomHistogramComponent: React.FC<ChartComponentProps> = ({ dateRange, filters, selectedDashboard }) => {

  let chartContent;
  switch (selectedDashboard) {
    case 'Parameterwise actual value histogram':
      chartContent = <IframeContainer>
        <iframe src="http://10.120.0.108:3000/" frameBorder="0"></iframe>
      </IframeContainer>
      break;
    case 'Parameterwise standardized value histogram':
      chartContent = <IframeContainer>
        <iframe src="http://10.120.0.108:3000/" frameBorder="0"></iframe>
      </IframeContainer>
      break;
    case 'none':
      chartContent = <div></div>
      break
    default:
      chartContent = <div>Error loading Dashboard</div>
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
