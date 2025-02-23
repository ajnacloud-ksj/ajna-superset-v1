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
import { GenericDataType, t, validateNonEmpty } from '@superset-ui/core';
import {
  ControlPanelConfig,
  dndGroupByControl,
  columnsByType,
  sections,
} from '@superset-ui/chart-controls';
import { showLegendControl, showValueControl } from '../controls';

// Define the control panel configuration for the histogram chart
const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'column',
            config: {
              ...dndGroupByControl,
              label: t('Primary Column'),
              multi: false,
              description: t('Numeric column used to calculate the histogram.'),
              validators: [validateNonEmpty], // Ensures a value is selected
              freeForm: false,
              disabledTabs: new Set(['saved', 'sqlExpression']),
              // Dynamically populate column options based on available numeric columns
              mapStateToProps: ({ datasource }) => ({
                options: columnsByType(datasource, GenericDataType.Numeric),
              }),
            },
          },
        ],
        [
          {
            name: 'min_column',
            config: {
              ...dndGroupByControl,
              label: t('Min Threshold Column'),
              multi: false,
              description: t('Column representing the minimum acceptable threshold value.'),
              validators: [validateNonEmpty],
              freeForm: false,
              disabledTabs: new Set(['saved', 'sqlExpression']),
              mapStateToProps: ({ datasource }) => ({
                options: columnsByType(datasource, GenericDataType.Numeric),
              }),
            },
          },
          {
            name: 'max_column',
            config: {
              ...dndGroupByControl,
              label: t('Max Threshold Column'),
              multi: false,
              description: t('Column representing the maximum acceptable threshold value.'),
              validators: [validateNonEmpty],
              freeForm: false,
              disabledTabs: new Set(['saved', 'sqlExpression']),
              mapStateToProps: ({ datasource }) => ({
                options: columnsByType(datasource, GenericDataType.Numeric),
              }),
            },
          },
        ],
        ['groupby'], // Allows grouping data
        ['adhoc_filters'], // Allows applying ad-hoc filters
        ['row_limit'], // Defines maximum number of rows to retrieve
        [
          {
            name: 'bins',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Bins'),
              default: 10,
              choices: [...Array(4)].map((_, i) => [
                (i + 1) * 5,
                ((i + 1) * 5).toString(),
              ]),
              description: t('The number of bins for the histogram'),
              validators: [validateNonEmpty], // Ensure bins value is set
            },
          },
        ],
        [
          {
            name: 'normalize',
            config: {
              type: 'CheckboxControl',
              label: t('Normalize'),
              description: t('Transform counts into proportions to aid comparison.'),
              default: false,
            },
          },
        ],
        [
          {
            name: 'cumulative',
            config: {
              type: 'CheckboxControl',
              label: t('Cumulative'),
              description: t('Display the running total of frequencies.'),
              default: false,
            },
          },
        ],
      ],
    },
    sections.titleControls, // Title-related controls
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['color_scheme'], // Controls the color scheme selection
        [showValueControl], // Toggles value display
        [showLegendControl], // Toggles legend display
        [
          {
            name: 'x_axis_title',
            config: {
              type: 'TextControl',
              label: t('X Axis Title'),
              renderTrigger: true,
              default: '',
            },
          },
        ],
        [
          {
            name: 'y_axis_title',
            config: {
              type: 'TextControl',
              label: t('Y Axis Title'),
              renderTrigger: true,
              default: '',
            },
          },
        ],
      ],
    },
  ],
};

export default config;



