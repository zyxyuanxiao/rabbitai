
import { Charts, Layout, LayoutItem } from 'src/dashboard/types';
import {
  CHART_TYPE,
  DASHBOARD_ROOT_TYPE,
  TAB_TYPE,
} from 'src/dashboard/util/componentTypes';
import { DASHBOARD_ROOT_ID } from 'src/dashboard/util/constants';
import { TreeItem } from './types';
import { Scope } from '../../../types';

export const isShowTypeInTree = ({ type, meta }: LayoutItem, charts?: Charts) =>
  (type === TAB_TYPE || type === CHART_TYPE || type === DASHBOARD_ROOT_TYPE) &&
  (!charts || charts[meta?.chartId]?.formData?.viz_type !== 'filter_box');

export const buildTree = (
  node: LayoutItem,
  treeItem: TreeItem,
  layout: Layout,
  charts: Charts,
  validNodes: string[],
) => {
  let itemToPass: TreeItem = treeItem;
  if (
    isShowTypeInTree(node, charts) &&
    node.type !== DASHBOARD_ROOT_TYPE &&
    validNodes.includes(node.id)
  ) {
    const currentTreeItem = {
      key: node.id,
      title: node.meta.sliceName || node.meta.text || node.id.toString(),
      children: [],
    };
    treeItem.children.push(currentTreeItem);
    itemToPass = currentTreeItem;
  }
  node.children.forEach(child =>
    buildTree(layout[child], itemToPass, layout, charts, validNodes),
  );
};

const addInvisibleParents = (layout: Layout, item: string) => [
  ...(layout[item]?.children || []),
  ...Object.values(layout)
    .filter(
      val =>
        val.parents &&
        val.parents[val.parents.length - 1] === item &&
        !isShowTypeInTree(layout[val.parents[val.parents.length - 1]]),
    )
    .map(({ id }) => id),
];

// Generate checked options for Ant tree from redux scope
const checkTreeItem = (
  checkedItems: string[],
  layout: Layout,
  items: string[],
  excluded: number[],
) => {
  items.forEach(item => {
    checkTreeItem(
      checkedItems,
      layout,
      addInvisibleParents(layout, item),
      excluded,
    );
    if (
      layout[item]?.type === CHART_TYPE &&
      !excluded.includes(layout[item]?.meta.chartId)
    ) {
      checkedItems.push(item);
    }
  });
};

export const getTreeCheckedItems = (scope: Scope, layout: Layout) => {
  const checkedItems: string[] = [];
  checkTreeItem(checkedItems, layout, [...scope.rootPath], [...scope.excluded]);
  return [...new Set(checkedItems)];
};

// Looking for first common parent for selected charts/tabs/tab
export const findFilterScope = (
  checkedKeys: string[],
  layout: Layout,
): Scope => {
  if (!checkedKeys.length) {
    return {
      rootPath: [],
      excluded: [],
    };
  }

  // Get arrays of parents for selected charts
  const checkedItemParents = checkedKeys
    .filter(item => layout[item]?.type === CHART_TYPE)
    .map(key => {
      const parents = [DASHBOARD_ROOT_ID, ...(layout[key]?.parents || [])];
      return parents.filter(parent => isShowTypeInTree(layout[parent]));
    });
  // Sort arrays of parents to get first shortest array of parents,
  // that means on it's level of parents located common parent, from this place parents start be different
  checkedItemParents.sort((p1, p2) => p1.length - p2.length);
  const rootPath = checkedItemParents.map(
    parents => parents[checkedItemParents[0].length - 1],
  );

  const excluded: number[] = [];
  const isExcluded = (parent: string, item: string) =>
    rootPath.includes(parent) && !checkedKeys.includes(item);
  // looking for charts to be excluded: iterate over all charts
  // and looking for charts that have one of their parents in `rootPath` and not in selected items
  Object.entries(layout).forEach(([key, value]) => {
    const parents = value.parents || [];
    if (
      value.type === CHART_TYPE &&
      [DASHBOARD_ROOT_ID, ...parents]?.find(parent => isExcluded(parent, key))
    ) {
      excluded.push(value.meta.chartId);
    }
  });

  return {
    rootPath: [...new Set(rootPath)],
    excluded,
  };
};

export const getDefaultScopeValue = (chartId?: number): Scope => ({
  rootPath: [DASHBOARD_ROOT_ID],
  excluded: chartId ? [chartId] : [],
});

export const isScopingAll = (scope: Scope, chartId?: number) =>
  !scope ||
  (scope.rootPath[0] === DASHBOARD_ROOT_ID &&
    !scope.excluded.filter(item => item !== chartId).length);
