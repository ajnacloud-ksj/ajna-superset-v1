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
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { buildQueryContext, getColumnLabel } from '@superset-ui/core';
import { histogramOperator } from '@superset-ui/chart-controls';
import { HistogramFormData } from './types';

export default function buildQuery(formData: HistogramFormData) {
  const { column, spec_min_column, spec_max_column, groupby = [] } = formData;
  const extraColumns: string[] = [];
  if (spec_min_column) extraColumns.push(getColumnLabel(spec_min_column));
  if (spec_max_column) extraColumns.push(getColumnLabel(spec_max_column));

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: [...groupby, getColumnLabel(column), ...extraColumns],
      post_processing: [histogramOperator(formData, baseQueryObject)],
      metrics: undefined,
    },
  ]);
}

