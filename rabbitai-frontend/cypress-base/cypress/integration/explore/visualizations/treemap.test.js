
describe('Visualization > Treemap', () => {
  const TREEMAP_FORM_DATA = {
    datasource: '2__table',
    viz_type: 'treemap',
    slice_id: 10,
    granularity_sqla: 'year',
    time_grain_sqla: 'P1D',
    time_range: 'No filter',
    metrics: ['sum__SP_POP_TOTL'],
    adhoc_filters: [],
    groupby: ['country_code'],
    row_limit: 50000,
    color_scheme: 'bnbColors',
    treemap_ratio: 1.618033988749895,
    number_format: '.3s',
  };

  const level0 = '.chart-container rect[style="fill: rgb(255, 90, 95);"]';
  const level1 = '.chart-container rect[style="fill: rgb(123, 0, 81);"]';
  const level2 = '.chart-container rect[style="fill: rgb(0, 122, 135);"]';

  function verify(formData) {
    cy.visitChartByParams(JSON.stringify(formData));
    cy.verifySliceSuccess({ waitAlias: '@getJson', chartSelector: 'svg' });
  }

  beforeEach(() => {
    cy.login();
    cy.intercept('POST', '/rabbitai/explore_json/**').as('getJson');
  });

  it('should work', () => {
    verify(TREEMAP_FORM_DATA);
    cy.get(level0).should('have.length', 1);
    cy.get(level1).should('have.length', 214);
  });

  it('should work with multiple groupby', () => {
    verify({
      ...TREEMAP_FORM_DATA,
      groupby: ['region', 'country_code'],
    });
    cy.get(level0).should('have.length', 1);
    cy.get(level1).should('have.length', 7);
    cy.get(level2).should('have.length', 214);
  });

  it('should work with filter', () => {
    verify({
      ...TREEMAP_FORM_DATA,
      adhoc_filters: [
        {
          expressionType: 'SIMPLE',
          subject: 'region',
          operator: '==',
          comparator: 'South Asia',
          clause: 'WHERE',
          sqlExpression: null,
          filterOptionName: 'filter_8aqxcf5co1a_x7lm2d1fq0l',
        },
      ],
    });
    cy.get(level1).should('have.length', 8);
  });
});
