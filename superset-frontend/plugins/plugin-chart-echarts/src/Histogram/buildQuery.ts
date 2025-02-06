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
import { buildQueryContext } from '@superset-ui/core';
import { histogramOperator } from '@superset-ui/chart-controls';
import { HistogramFormData } from './types';

function getColumnName(column: any): string {
  return typeof column === 'object' && column ? column.columnName || column.name || '' : column;
}

export default function buildQuery(formData: HistogramFormData) {
  const { column, min_column, max_column, groupby = [] } = formData;

  const primaryColumn = getColumnName(column);
  const minColumn = getColumnName(min_column);
  const maxColumn = getColumnName(max_column);

  const columns = [...groupby, primaryColumn, minColumn, maxColumn];

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: columns,
      post_processing: [histogramOperator(formData, baseQueryObject)],
      metrics: undefined,
    },
  ]);
}

}


