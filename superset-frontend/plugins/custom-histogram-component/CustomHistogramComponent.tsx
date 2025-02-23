import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import axios from 'axios';

const ChartWrapper = styled.div`
  width: 100%;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary.base};
`;

const ChartImage = styled.img`
  max-width: 100%;
  height: auto;
  background-color: white;
`;

const ChartsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
`;


const ChartContainer = styled.div`
  flex: 1 1 49%;
  max-width: 49%;
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
}

const CustomHistogramComponent: React.FC<ChartComponentProps> = ({ dateRange, filters }) => {
  const [chartUrl1, setChartUrl1] = useState<string | null>(null);
  const [chartUrl2, setChartUrl2] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChart = async (setChartUrl: React.Dispatch<React.SetStateAction<string | null>>) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('https://quickchart.io/chart', {
          params: {
            c: JSON.stringify({
              type: 'bar',
              data: {
                labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                datasets: [
                  {
                    label: 'Dataset 1',
                    backgroundColor: 'rgb(255, 99, 132)',
                    data: [52, -93, -25, -67, 51, -97, 9],
                  },
                  {
                    label: 'Dataset 2',
                    backgroundColor: 'rgb(54, 162, 235)',
                    data: [17, 13, -38, 89, -10, 75, -52],
                  },
                  {
                    label: 'Dataset 3',
                    backgroundColor: 'rgb(75, 192, 192)',
                    data: [-84, 33, 80, 75, -83, -34, -50],
                  },
                ],
              },
              options: {
                title: {
                  display: true,
                  text: 'Chart.js Bar Chart - Stacked',
                },
                scales: {
                  xAxes: [
                    {
                      stacked: true,
                    },
                  ],
                  yAxes: [
                    {
                      stacked: true,
                    },
                  ],
                },
              },
            }),
            dateRange,
          },
          responseType: 'blob', // Important to handle the response as a blob
        });
        const imageUrl = URL.createObjectURL(response.data);
        setChartUrl(imageUrl);
      } catch (err) {
        setError('Failed to fetch chart: ' + err);
      } finally {
        setLoading(false);
      }
    };

    fetchChart(setChartUrl1);
    fetchChart(setChartUrl2);
  }, [dateRange]);

  if (loading) {
    return <ChartWrapper>Loading...</ChartWrapper>;
  }

  if (error) {
    return <ChartWrapper>{error}</ChartWrapper>;
  }

  return (
    <ChartWrapper>
      <div>Filters:</div>
      <ul>
        {filters.map(filter => (
          <li key={filter.id}>
            <strong>ID:</strong> {filter.id} <br />
            <strong>Type:</strong> {filter.type} <br />
            <strong>Scope:</strong> Excluded: {filter.scope.excluded.join(', ')}, Root Path: {filter.scope.rootPath.join(', ')}
          </li>
        ))}
      </ul>
      <ChartsContainer>
        <ChartContainer>
          {chartUrl1 ? <ChartImage src={chartUrl1} alt="Chart 1" /> : 'No chart available for date range: ' + dateRange}
        </ChartContainer>
        <ChartContainer>
          {chartUrl2 ? <ChartImage src={chartUrl2} alt="Chart 2" /> : 'No chart available for date range: ' + dateRange}
        </ChartContainer>
      </ChartsContainer>
    </ChartWrapper>
  );
};

export default CustomHistogramComponent;