/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption } from 'echarts/charts';
import type { GridComponentOption } from 'echarts/components';
import type { CallbackDataParams } from 'echarts/types/src/util/types';
import { isEmpty } from 'lodash';
import {
  CategoricalColorNamespace,
  NumberFormats,
  getColumnLabel,
  getNumberFormatter,
  tooltipHtml,
} from '@superset-ui/core';
import { HistogramChartProps, HistogramTransformedProps } from './types';
import { LegendOrientation, LegendType, Refs } from '../types';
import { defaultGrid, defaultYAxis } from '../defaults';
import { getLegendProps } from '../utils/series';
import { getDefaultTooltip } from '../utils/tooltip';
import { getPercentFormatter } from '../utils/formatters';

function getColumnName(column: any): string {
  if (!column) return '';
  if (typeof column === 'string') return column;
  if (typeof column === 'object') {

    const possibleNames = [
      column.label,
      column.colname,
      column.columnName,
      column.column_name,
      column.name,
      column.value
    ];

    const columnName = possibleNames.find(name => name && typeof name === 'string');
    return columnName || '';
  }

  return '';
}

export default function transformProps(chartProps: HistogramChartProps): HistogramTransformedProps {
  const refs: Refs = {};
  let focusedSeries: number | undefined;
  const { formData, height, hooks, legendState = {}, queriesData, theme, width } = chartProps;
  const { onLegendStateChanged } = hooks;
  const {
    colorScheme,
    column,
    min_column,
    max_column,
    groupby = [],
    normalize,
    showLegend,
    showValue,
    sliceId,
    xAxisTitle,
    yAxisTitle,
  } = formData;



  const histogramData = queriesData[0].data;

  const specData = queriesData[1]?.data[0];

  let minColName = getColumnName(min_column);
  let maxColName = getColumnName(max_column);

  if (!minColName && specData) {
    const minKey = Object.keys(specData).find(key => key.toLowerCase().includes('min'));
    if (minKey) minColName = minKey;
  }
  if (!maxColName && specData) {
    const maxKey = Object.keys(specData).find(key => key.toLowerCase().includes('max'));
    if (maxKey) maxColName = maxKey;
  }


  // Extract spec values using the dynamic column names
  const rawMinValue = specData ? specData[minColName] : undefined;
  const rawMaxValue = specData ? specData[maxColName] : undefined;

  const minValue = rawMinValue !== undefined && !isNaN(Number(rawMinValue))
    ? Number(rawMinValue)
    : undefined;
  const maxValue = rawMaxValue !== undefined && !isNaN(Number(rawMaxValue))
    ? Number(rawMaxValue)
    : undefined;

  const colorFn = CategoricalColorNamespace.getScale(colorScheme);
  const formatter = getNumberFormatter(
    normalize ? NumberFormats.FLOAT_2_POINT : NumberFormats.INTEGER
  );
  const specFormatter = getNumberFormatter(NumberFormats.FLOAT_2_POINT);
  const percentFormatter = getPercentFormatter(NumberFormats.PERCENT_2_POINT);
  const groupbySet = new Set(groupby);

  const xAxisData: string[] = Object.keys(histogramData[0]).filter(
    key => !groupbySet.has(key) && key !== minColName && key !== maxColName,
  );
  console.log("xAxisData:", xAxisData);

  const findBin = (value: number, bins: string[]): string | null => {
    if (!value || !bins || bins.length === 0) return null;

    for (let i = 0; i < bins.length; i++) {
      const parts = bins[i].split('-').map(p => p.trim());
      if (parts.length === 2) {
        const binMin = Number(parts[0]);
        const binMax = Number(parts[1]);
        if (i < bins.length - 1) {
          if (value >= binMin && value < binMax) return bins[i];
        } else {
          if (value >= binMin && value <= binMax) return bins[i];
        }
      }
    }
    if (bins.length > 0) {
      const firstBin = bins[0].split('-').map(p => Number(p.trim()));
      const lastBin = bins[bins.length - 1].split('-').map(p => Number(p.trim()));
      if (value <= firstBin[0]) return bins[0];
      if (value >= lastBin[1]) return bins[bins.length - 1];
    }
    return null;
  };

  const computedMinBin = minValue !== undefined ? findBin(minValue, xAxisData) : null;
  const computedMaxBin = maxValue !== undefined ? findBin(maxValue, xAxisData) : null;

  let minBinIndex = computedMinBin ? xAxisData.findIndex(bin => bin === computedMinBin) : -1;
  let maxBinIndex = computedMaxBin ? xAxisData.findIndex(bin => bin === computedMaxBin) : -1;

  let minLinePos = minBinIndex;
  let maxLinePos = maxBinIndex;
  if (minBinIndex === maxBinIndex && minBinIndex >= 0) {
    minLinePos = minBinIndex - 0.2;
    maxLinePos = maxBinIndex + 0.2;
  }

  const barSeries: BarSeriesOption[] = histogramData.map(datum => {
    const seriesName =
      groupby.length > 0
        ? groupby.map(key => datum[getColumnLabel(key)]).join(', ')
        : getColumnLabel(column);
    const seriesData = Object.keys(datum)
      .filter(key => !groupbySet.has(key) && key !== minColName && key !== maxColName)
      .map(key => datum[key] as number);
    return {
      name: seriesName,
      type: 'bar',
      data: seriesData,
      barWidth: 40,
      itemStyle: {
        color: colorFn(seriesName, sliceId),
      },
      label: {
        show: showValue,
        position: 'top',
        formatter: params => formatter.format(params.value as number),
      },
    };
  });

  const dummyData = xAxisData.map(() => 0);
  const finalSeries = [...barSeries];

  if (minValue !== undefined && minLinePos >= 0) {
    const dummyMinSeries: BarSeriesOption = {
      name: 'Min Reference',
      type: 'bar',
      data: dummyData,
      silent: true,
      markLine: {
        symbol: 'none',
        data: [
          {
            xAxis: minLinePos,
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: `Min Spec: ${specFormatter.format(minValue)}`,
            },
            lineStyle: { color: 'green', width: 2 },
          },
        ],
      },
    };
    const originalSeries = finalSeries.pop();
    finalSeries.push(dummyMinSeries);
    finalSeries.push(originalSeries as BarSeriesOption);
  }

  if (maxValue !== undefined && maxLinePos >= 0) {
    const dummyMaxSeries: BarSeriesOption = {
      name: 'Max Reference',
      type: 'bar',
      data: dummyData,
      silent: true,
      markLine: {
        symbol: 'none',
        data: [
          {
            xAxis: maxLinePos,
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: `Max Spec: ${specFormatter.format(maxValue)}`,
            },
            lineStyle: { color: 'red', width: 2 },
          },
        ],
      },
    };
    finalSeries.push(dummyMaxSeries);
  }

  const legendOptions = finalSeries.map(series => series.name as string);
  if (isEmpty(legendState)) {
    legendOptions.forEach(legend => {
      legendState[legend] = true;
    });
  }

  const tooltipFormatter = (params: CallbackDataParams[]) => {
    const title = params[0].name;
    const rows = params.map(param => {
      const { seriesName, value } = param;

      let customMarker;
      if (seriesName === 'Min Reference') {
        customMarker = '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:green;"></span>';
      } else if (seriesName === 'Max Reference') {
        customMarker = '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:red;"></span>';
      } else {
        customMarker = param.marker;
      }

      if (seriesName === 'Min Reference') {
        return [`${customMarker}${seriesName}`, specFormatter.format(minValue || 0)];
      }
      if (seriesName === 'Max Reference') {
        return [`${customMarker}${seriesName}`, specFormatter.format(maxValue || 0)];
      }

      return [`${customMarker}${seriesName || ''}`, formatter.format(value as number)];
    });

    if (groupby.length > 0) {
      const total = params
        .filter(param => {
          const name = param.seriesName || '';
          return !['Min Reference', 'Max Reference'].includes(name);
        })
        .reduce((acc, param) => acc + (param.value as number), 0);

      if (!normalize) {
        rows
          .filter(row => !row[0].includes('Reference'))
          .forEach((row, i) => {
            const value = params[i].value as number;
            row.push(percentFormatter.format(value / (total || 1)));
          });
      }
      const totalRow = ['Total', formatter.format(total)];
      if (!normalize) {
        totalRow.push(percentFormatter.format(1));
      }
      rows.push(totalRow);
    }
    return tooltipHtml(rows, title, focusedSeries);
  };

  const onFocusedSeries = (index?: number | undefined) => {
    focusedSeries = index;
  };

  type EChartsOption = ComposeOption<GridComponentOption | BarSeriesOption>;
  const echartOptions: EChartsOption = {
    grid: {
      ...defaultGrid,
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '10%',
    },
    xAxis: {
      data: xAxisData,
      name: xAxisTitle,
      nameGap: 35,
      type: 'category',
      nameLocation: 'middle',
    },
    yAxis: {
      ...defaultYAxis,
      name: yAxisTitle,
      nameGap: normalize ? 55 : 40,
      type: 'value',
      nameLocation: 'middle',
      axisLabel: {
        formatter: (value: number) => formatter.format(value),
      },
    },
    series: finalSeries,
    legend: {
      ...getLegendProps(
        LegendType.Scroll,
        LegendOrientation.Top,
        showLegend,
        theme,
        false,
        legendState
      ),
      data: legendOptions,
    },
    tooltip: {
      ...getDefaultTooltip(refs),
      trigger: 'axis',
      formatter: tooltipFormatter,
    },
  };

  return {
    refs,
    formData,
    width,
    height,
    echartOptions,
    onFocusedSeries,
    onLegendStateChanged,
  };
}

















