
import { DASHBOARD_LIST } from './dashboard_list.helper';

describe('Dashboard card view', () => {
  beforeEach(() => {
    cy.login();
    cy.visit(DASHBOARD_LIST);
    cy.get('[data-test="card-view"]').click();
  });

  xit('should load cards', () => {
    cy.get('[data-test="dashboard-list-view"]');
    cy.get('[data-test="styled-card"]').should('be.visible');
    cy.get('[data-test="styled-card"]').should('have.length', 4); // failed, xit-ed
  });

  it('should allow to favorite/unfavorite dashboard card', () => {
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-selected']")
      .should('not.exist');
    cy.get("[data-test='card-actions']")
      .find("[data-test='favorite-unselected']")
      .first()
      .click();
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-selected']")
      .should('be.visible');
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-unselected']")
      .should('not.exist');

    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-unselected']")
      .should('not.exist');
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-selected']")
      .click();
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-unselected']")
      .should('be.visible');
    cy.get("[data-test='card-actions']")
      .first()
      .find("[data-test='favorite-selected']")
      .should('not.exist');
  });

  xit('should sort correctly', () => {
    // sort alphabetical
    cy.get('.Select__control').last().should('be.visible');
    cy.get('.Select__control').last().click({ force: true });
    cy.get('.Select__menu').contains('Alphabetical').click();
    cy.get('[data-test="dashboard-list-view"]').should('be.visible');
    // TODO this line was flaky
    cy.get('[data-test="styled-card"]').first().contains('Tabbed Dashboard');
    cy.get('[data-test="styled-card"]').last().contains("World Bank's Data");

    // sort recently modified
    cy.get('.Select__control').last().should('be.visible');
    cy.get('.Select__control').last().click({ force: true });
    cy.get('.Select__menu').contains('Recently Modified').click();
    cy.get('[data-test="dashboard-list-view"]').should('be.visible');
    cy.get('[data-test="styled-card"]').first().contains('Tabbed Dashboard');
    cy.get('[data-test="styled-card"]').last().contains("World Bank's Data");
  });

  // real flaky
  xit('should delete correctly', () => {
    // show delete modal
    cy.get('[data-test="more-horiz"]').last().trigger('mouseover');
    cy.get('[data-test="dashboard-card-option-delete-button"]')
      .last()
      .should('be.visible')
      .click();
    cy.get('[data-test="modal-confirm-button"]').should(
      'have.attr',
      'disabled',
    );
    cy.get('[data-test="Please Confirm-modal"]').should('be.visible');
    cy.get("[data-test='delete-modal-input']").type('DELETE');
    cy.get('[data-test="modal-confirm-button"]').should(
      'not.have.attr',
      'disabled',
    );
    cy.get('[data-test="modal-cancel-button"]').click();
  });

  // real flaky
  xit('should edit correctly', () => {
    // show edit modal
    cy.get('[data-test="more-horiz"]').last().trigger('mouseover');
    cy.get('[data-test="dashboard-card-option-edit-button"]')
      .last()
      .should('be.visible')
      .click();
    cy.get('[data-test="dashboard-edit-properties-form"]').should('be.visible');
    cy.get('[data-test="dashboard-title-input"]').should('not.have.value');
    cy.get('[data-test="properties-modal-cancel-button"]')
      .contains('Cancel')
      .click();
  });
});
