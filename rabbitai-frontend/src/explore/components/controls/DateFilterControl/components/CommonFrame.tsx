
import React from 'react';
import { t } from '@rabbitai-ui/core';
import { Radio } from 'src/components/Radio';
import {
  COMMON_RANGE_OPTIONS,
  COMMON_RANGE_SET,
} from 'src/explore/components/controls/DateFilterControl/utils';
import {
  CommonRangeType,
  FrameComponentProps,
} from 'src/explore/components/controls/DateFilterControl/types';

export function CommonFrame(props: FrameComponentProps) {
  let commonRange = 'Last week';
  if (COMMON_RANGE_SET.has(props.value as CommonRangeType)) {
    commonRange = props.value;
  } else {
    props.onChange(commonRange);
  }

  return (
    <>
      <div className="section-title">{t('Configure Time Range: Last...')}</div>
      <Radio.Group
        value={commonRange}
        onChange={(e: any) => props.onChange(e.target.value)}
      >
        {COMMON_RANGE_OPTIONS.map(({ value, label }) => (
          <Radio key={value} value={value} className="vertical-radio">
            {label}
          </Radio>
        ))}
      </Radio.Group>
    </>
  );
}
