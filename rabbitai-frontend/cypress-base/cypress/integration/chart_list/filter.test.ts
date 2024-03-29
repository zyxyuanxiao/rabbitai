
import { CHART_LIST } from './chart_list.helper';

describe('chart card view filters', () => {
  beforeEach(() => {
    cy.login();
    cy.visit(CHART_LIST);
    cy.get('[data-test="card-view"]').click();
  });

  it('should filter by owners correctly', () => {
    // filter by owners
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('alpha user').click();
    cy.get('[data-test="styled-card"]').should('not.exist');
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('gamma user').click();
    cy.get('[data-test="styled-card"]').should('not.exist');
  });

  it('should filter by me correctly', () => {
    // filter by me
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('me').click();
    cy.get('[data-test="styled-card"]').its('length').should('be.gt', 0);
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('me').click();
    cy.get('[data-test="styled-card"]').its('length').should('be.gt', 0);
  });

  it('should filter by created by correctly', () => {
    // filter by created by
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('alpha user').click();
    cy.get('.ant-card').should('not.exist');
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('gamma user').click();
    cy.get('[data-test="styled-card"]').should('not.exist');
  });

  xit('should filter by viz type correctly', () => {
    // filter by viz type
    cy.get('.Select__control').eq(2).click();
    cy.get('.Select__menu').contains('area').click({ timeout: 5000 });
    cy.get('[data-test="styled-card"]').its('length').should('be.gt', 0);
    cy.get('[data-test="styled-card"]')
      .contains("World's Pop Growth")
      .should('be.visible');
    cy.get('.Select__control').eq(2).click();
    cy.get('.Select__control').eq(2).type('world_map{enter}');
    cy.get('[data-test="styled-card"]').should('have.length', 1);
    cy.get('[data-test="styled-card"]')
      .contains('% Rural')
      .should('be.visible');
  });

  it('should filter by datasource correctly', () => {
    // filter by datasource
    cy.get('.Select__control').eq(3).click();
    cy.get('.Select__menu').contains('unicode_test').click();
    cy.get('[data-test="styled-card"]').should('have.length', 1);
    cy.get('[data-test="styled-card"]')
      .contains('Unicode Cloud')
      .should('be.visible');
    cy.get('.Select__control').eq(2).click();
    cy.get('.Select__control').eq(2).type('energy_usage{enter}{enter}');
    cy.get('[data-test="styled-card"]').its('length').should('be.gt', 0);
  });
});

describe('chart list view filters', () => {
  beforeEach(() => {
    cy.login();
    cy.visit(CHART_LIST);
    cy.get('[data-test="list-view"]').click();
  });

  it('should filter by owners correctly', () => {
    // filter by owners
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('alpha user').click();
    cy.get('[data-test="table-row"]').should('not.exist');
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('gamma user').click();
    cy.get('[data-test="table-row"]').should('not.exist');
  });

  it('should filter by me correctly', () => {
    // filter by me
    cy.get('.Select__control').first().click();
    cy.get('.Select__menu').contains('me').click();
    cy.get('[data-test="table-row"]').its('length').should('be.gt', 0);
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('me').click();
    cy.get('[data-test="table-row"]').its('length').should('be.gt', 0);
  });

  it('should filter by created by correctly', () => {
    // filter by created by
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('alpha user').click();
    cy.get('[data-test="table-row"]').should('not.exist');
    cy.get('.Select__control').eq(1).click();
    cy.get('.Select__menu').contains('gamma user').click();
    cy.get('[data-test="table-row"]').should('not.exist');
  });

  // this is flaky, but seems to fail along with the card view test of the same name
  xit('should filter by viz type correctly', () => {
    // filter by viz type
    cy.get('.Select__control').eq(2).click();
    cy.get('.Select__menu').contains('area').click({ timeout: 5000 });
    cy.get('[data-test="table-row"]').its('length').should('be.gt', 0);
    cy.get('[data-test="table-row"]')
      .contains("World's Pop Growth")
      .should('exist');
    cy.get('.Select__control').eq(2).click();
    cy.get('.Select__control').eq(2).type('world_map{enter}');
    cy.get('[data-test="table-row"]').should('have.length', 1);
    cy.get('[data-test="table-row"]').contains('% Rural').should('exist');
  });

  it('should filter by datasource correctly', () => {
    // filter by datasource
    cy.get('.Select__control').eq(3).click();
    cy.get('.Select__menu').contains('unicode_test').click();
    cy.get('[data-test="table-row"]').should('have.length', 1);
    cy.get('[data-test="table-row"]').contains('Unicode Cloud').should('exist');
    cy.get('.Select__control').eq(3).click();
    cy.get('.Select__control').eq(3).type('energy_usage{enter}{enter}');
    cy.get('[data-test="table-row"]').its('length').should('be.gt', 0);
  });
});
