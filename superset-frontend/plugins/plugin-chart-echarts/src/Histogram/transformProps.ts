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

export default function transformProps(
  chartProps: HistogramChartProps,
): HistogramTransformedProps {
  const refs: Refs = {};
  let focusedSeries: number | undefined;
  const {
    formData,
    height,
    hooks,
    legendState = {},
    queriesData,
    theme,
    width,
  } = chartProps;
  const { onLegendStateChanged } = hooks;
  const {
    colorScheme,
    column,
    spec_min_column,
    spec_max_column,
    groupby = [],
    normalize,
    showLegend,
    showValue,
    sliceId,
    x_axis_title: xAxisTitle,
    y_axis_title: yAxisTitle,
  } = formData;
  const { data } = queriesData[0];
  const colorFn = CategoricalColorNamespace.getScale(colorScheme);
  const formatter = getNumberFormatter(
    normalize ? NumberFormats.FLOAT_2_POINT : NumberFormats.INTEGER,
  );
  const percentFormatter = getPercentFormatter(NumberFormats.PERCENT_2_POINT);


  const rawBinNames = Object.keys(data[0]).filter(key => key.includes(' - '));

  // Ensure uniqueness by appending a counter if needed
  const binNameCount: Record<string, number> = {};
  const uniqueBinNames = rawBinNames.map(bin => {
    if (binNameCount[bin] === undefined) {
      binNameCount[bin] = 1;
      return bin;
    } else {
      binNameCount[bin]++;
      return `${bin} (${binNameCount[bin]})`;
    }
  });

  const findBin = (value: number, bins: string[]): string | null => {
    for (let i = 0; i < bins.length; i++) {
      const parts = bins[i].split(' - ').map(Number);
      if (parts.length === 2) {
        const [min, max] = parts;
        if (value >= min && value <= max) {
          return bins[i];
        }
      }
    }
    return null;
  };

  let specMinValue: number | undefined = undefined;
  let specMaxValue: number | undefined = undefined;
  if (data.length > 0) {
    specMinValue = data[0][getColumnLabel(spec_min_column)] as number;
    specMaxValue = data[0][getColumnLabel(spec_max_column)] as number;
  }

  const minBinRaw = specMinValue != null ? findBin(specMinValue, rawBinNames) : null;
  const maxBinRaw = specMaxValue != null ? findBin(specMaxValue, rawBinNames) : null;

  const mapBinToUnique = (bin: string | null): string | null => {
    if (bin === null) return null;
    const index = rawBinNames.indexOf(bin);
    return index >= 0 ? uniqueBinNames[index] : bin;
  };

  const minBin = mapBinToUnique(minBinRaw);
  const maxBin = mapBinToUnique(maxBinRaw);

  if (specMinValue != null && !minBin) {
    console.warn(`Warning: spec_min_value (${specMinValue}) does not fall within any bin range.`);
  }
  if (specMaxValue != null && !maxBin) {
    console.warn(`Warning: spec_max_value (${specMaxValue}) does not fall within any bin range.`);
  }


  const xAxisData: string[] = uniqueBinNames;
  const densitySeries: BarSeriesOption[] = data.map(datum => {
    const seriesName =
      groupby.length > 0
        ? groupby.map(key => datum[getColumnLabel(key)]).join(', ')
        : getColumnLabel(column);
    const seriesData = uniqueBinNames.map((_, index) => datum[rawBinNames[index]] as number);
    return {
      name: seriesName,
      type: 'bar',
      data: seriesData,
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

  const allFrequencies = data.flatMap(datum =>
    uniqueBinNames.map((_, idx) => datum[rawBinNames[idx]] as number),
  );
  const maxFrequency = Math.max(...allFrequencies, 0);
  const specBarHeight = maxFrequency * 0.1 || 1;


  const minSpecData = uniqueBinNames.map(bin => (bin === minBin ? specBarHeight : 0));
  const maxSpecData = uniqueBinNames.map(bin => (bin === maxBin ? specBarHeight : 0));

  const minSpecLabel = specMinValue != null ? specMinValue : 'N/A';
  const maxSpecLabel = specMaxValue != null ? specMaxValue : 'N/A';

  const minSpecSeries: BarSeriesOption = {
    name: `Min Spec (${minSpecLabel})`,
    type: 'bar',
    data: minSpecData,
    itemStyle: { color: 'green' },
    label: {
      show: true,
      position: 'top',
      formatter: () => `Min: ${minSpecLabel}`,
    },
    barWidth: '50%',
  };

  const maxSpecSeries: BarSeriesOption = {
    name: `Max Spec (${maxSpecLabel})`,
    type: 'bar',
    data: maxSpecData,
    itemStyle: { color: 'red' },
    label: {
      show: true,
      position: 'top',
      formatter: () => `Max: ${maxSpecLabel}`,
    },
    barWidth: '50%',
  };

  const allSeries: BarSeriesOption[] = [...densitySeries, minSpecSeries, maxSpecSeries];

  const legendOptions = allSeries.map(series => series.name as string);
  if (isEmpty(legendState)) {
    legendOptions.forEach(legend => {
      legendState[legend] = true;
    });
  }

  const tooltipFormatter = (params: CallbackDataParams[]) => {
    const title = params[0].name;
    const rows = params.map((param, i) => {
      const { marker, seriesName, value } = param;
      if (seriesName?.startsWith('Min Spec')) {
        return [`${marker}${seriesName}`, `Min Spec: ${minSpecLabel}`];
      }
      if (seriesName?.startsWith('Max Spec')) {
        return [`${marker}${seriesName}`, `Max Spec: ${maxSpecLabel}`];
      }
      return [`${marker}${seriesName}`, formatter.format(value as number)];
    });
    if (groupby.length > 0) {
      const total = params.reduce(
        (acc, param) => acc + (typeof param.value === 'number' ? param.value : 0),
        0,
      );
      if (!normalize) {
        rows.forEach((row, i) =>
          row.push(
            percentFormatter.format(
              ((typeof params[i].value === 'number' ? params[i].value ?? 0 : 0) as number) / (total || 1),
            ),
          ),
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
    series: allSeries,
    legend: {
      ...getLegendProps(
        LegendType.Scroll,
        LegendOrientation.Top,
        showLegend,
        theme,
        false,
        legendState,
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






