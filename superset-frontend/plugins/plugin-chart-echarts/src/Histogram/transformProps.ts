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
  return typeof column === 'object' && column ? column.columnName || column.name || '' : column;
}

export default function transformProps(
  chartProps: HistogramChartProps,
): HistogramTransformedProps {
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
  const { data } = queriesData[0];


  const minColName = getColumnName(min_column);
  const maxColName = getColumnName(max_column);


  const rawMinValue = data.length > 0 ? data[0][minColName] : undefined;
  const rawMaxValue = data.length > 0 ? data[0][maxColName] : undefined;
  const minValue =
    rawMinValue !== undefined && !isNaN(Number(rawMinValue))
      ? Number(rawMinValue)
      : 4.5;
  const maxValue =
    rawMaxValue !== undefined && !isNaN(Number(rawMaxValue))
      ? Number(rawMaxValue)
      : 4.6999998;
  console.log("minValue:", minValue, "maxValue:", maxValue);


  const colorFn = CategoricalColorNamespace.getScale(colorScheme);

  const formatter = getNumberFormatter(normalize ? NumberFormats.FLOAT_2_POINT : NumberFormats.INTEGER);

  const specFormatter = getNumberFormatter(NumberFormats.FLOAT_2_POINT);
  const percentFormatter = getPercentFormatter(NumberFormats.PERCENT_2_POINT);
  const groupbySet = new Set(groupby);

  const xAxisData: string[] = Object.keys(data[0]).filter(
    key => !groupbySet.has(key) && key !== minColName && key !== maxColName,
  );
  console.log("xAxisData:", xAxisData);

  const findBin = (value: number, bins: string[]): string | null => {
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
    return null;
  };

  const computedMinBin = minValue !== undefined ? findBin(minValue, xAxisData) : null;
  const computedMaxBin = maxValue !== undefined ? findBin(maxValue, xAxisData) : null;
  console.log("computedMinBin:", computedMinBin, "computedMaxBin:", computedMaxBin);
  if (minValue !== undefined && !computedMinBin) {
    console.warn(`Warning: minValue (${minValue}) does not fall within any bin range.`);
  }
  if (maxValue !== undefined && !computedMaxBin) {
    console.warn(`Warning: maxValue (${maxValue}) does not fall within any bin range.`);
  }

  const barSeries: BarSeriesOption[] = data.map(datum => {
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

  let minBinIndex = computedMinBin ? xAxisData.findIndex(bin => bin === computedMinBin) : -1;
  let maxBinIndex = computedMaxBin ? xAxisData.findIndex(bin => bin === computedMaxBin) : -1;
  console.log("minBinIndex:", minBinIndex, "maxBinIndex:", maxBinIndex);

  let minLinePos = minBinIndex;
  let maxLinePos = maxBinIndex;
  if (minBinIndex === maxBinIndex && minBinIndex >= 0) {
    minLinePos = minBinIndex - 0.2; // offset min spec line to the left
    maxLinePos = maxBinIndex + 0.2; // offset max spec line to the right
  }
  console.log("Adjusted positions: minLinePos:", minLinePos, "maxLinePos:", maxLinePos);

  const dummyData = xAxisData.map(() => 0);
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
            position: 'insideEnd',
            formatter: `Min Spec: ${specFormatter.format(minValue)}`,
          },
          lineStyle: { color: 'green', width: 2 },
        },
      ],
    },
  };
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
            position: 'insideEnd',
            formatter: `Max Spec: ${specFormatter.format(maxValue)}`,
          },
          lineStyle: { color: 'red', width: 2 },
        },
      ],
    },
  };

  const finalSeries = [...barSeries, dummyMinSeries, dummyMaxSeries];
  const legendOptions = finalSeries.map(series => series.name as string);
  if (isEmpty(legendState)) {
    legendOptions.forEach(legend => {
      legendState[legend] = true;
    });
  }

  const tooltipFormatter = (params: CallbackDataParams[]) => {
    const title = params[0].name;
    const rows = params.map(param => {
      const { marker, seriesName, value } = param;
      return [`${marker}${seriesName}`, formatter.format(value as number)];
    });
    if (groupby.length > 0) {
      const total = params.reduce((acc, param) => acc + (param.value as number), 0);
      if (!normalize) {
        rows.forEach((row, i) =>
          row.push(percentFormatter.format((params[i].value as number) / (total || 1)))
        );
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
















